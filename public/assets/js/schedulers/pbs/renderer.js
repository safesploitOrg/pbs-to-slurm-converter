import { info, warning } from "../../core/diagnostics.js";
import {
    formatMemoryForPbs,
    formatPbsDuration,
    formatPbsStartTime
} from "../../core/utils.js";
import { PBS_EVENT_TO_MAIL } from "./constants.js";
import { translateIoPath } from "../../core/io-patterns.js";
import { OPENPBS_DIALECT } from "./dialects/openpbs.js";
import { PBSPRO_DIALECT } from "./dialects/pbspro.js";
import { TORQUE_DIALECT } from "./dialects/torque.js";

const DIALECTS = Object.freeze({
    openpbs: OPENPBS_DIALECT,
    pbspro: PBSPRO_DIALECT,
    torque: TORQUE_DIALECT
});

const COMMON_DEPENDENCIES = new Set(["after", "afterany", "afterok", "afternotok"]);

export function renderPbs(job, { targetDialect = "openpbs", diagnostics = [] } = {}) {
    const dialect = DIALECTS[targetDialect] ?? OPENPBS_DIALECT;
    const directives = [];
    const reviewComments = [];

    renderIdentity(job, directives, reviewComments, diagnostics);
    renderTiming(job, directives, reviewComments, diagnostics);
    renderResources(job, directives, reviewComments, diagnostics, dialect);
    renderIo(job, directives, reviewComments, diagnostics);
    renderNotifications(job, directives, reviewComments, diagnostics);
    renderArray(job, directives, reviewComments, diagnostics, dialect);
    renderEnvironment(job, directives);
    renderDependencies(job, directives, reviewComments, diagnostics);
    renderUnsupported(job, reviewComments);
    for (const review of job.script.reviews) {
        reviewComments.push(`# REVIEW: ${review}`);
    }

    const body = [...job.script.body];
    if (job.io.workingDirectory) {
        body.unshift(`cd ${shellQuote(job.io.workingDirectory)}`);
        warning(
            diagnostics,
            "PBS_CHDIR_SCRIPT",
            "Slurm working-directory behaviour was converted to an explicit shell cd command because no portable PBS directive is assumed."
        );
    }

    const shebang = job.script.shebang || "#!/bin/bash";
    const output = [
        shebang,
        ...directives,
        ...reviewComments,
        "",
        ...trimOuterBlankLines(body)
    ].join("\n").trimEnd();

    info(diagnostics, "PBS_RENDERED", `Rendered ${dialect.label} output.`);
    return { output };
}

function renderIdentity(job, directives, comments, diagnostics) {
    if (job.job.name) {
        directives.push(`#PBS -N ${job.job.name}`);
    }

    if (job.job.queue) {
        directives.push(`#PBS -q ${job.job.queue}`);
        if (job.source.scheduler === "slurm") {
            warning(
                diagnostics,
                "QUEUE_SITE_SPECIFIC",
                "Slurm partition was mapped to a PBS queue name; verify that the target cluster uses the same name."
            );
        }
    }

    if (job.job.account) {
        directives.push(`#PBS -A ${job.job.account}`);
    }

    if (job.job.project) {
        directives.push(`#PBS -P ${job.job.project}`);
    }

    if (job.job.group) {
        directives.push(`#PBS -W group_list=${job.job.group}`);
    }

    if (job.job.hold) {
        directives.push("#PBS -h");
    }

    if (job.job.rerunnable !== null) {
        directives.push(`#PBS -r ${job.job.rerunnable ? "y" : "n"}`);
    }
}

function renderTiming(job, directives, comments, diagnostics) {
    if (job.job.startTime) {
        const formatted = formatPbsStartTime(job.job.startTime);
        if (formatted) {
            directives.push(`#PBS -a ${formatted}`);
        } else {
            comments.push(`# REVIEW: start time '${job.job.startTime.raw}' could not be represented safely as PBS -a.`);
            warning(
                diagnostics,
                "PBS_START_TIME_UNREPRESENTABLE",
                `Start time '${job.job.startTime.raw}' could not be converted safely to PBS -a syntax.`
            );
        }
    }

    if (job.resources.walltimeSeconds !== null) {
        directives.push(`#PBS -l walltime=${formatPbsDuration(job.resources.walltimeSeconds)}`);
    }
}

function renderResources(job, directives, comments, diagnostics, dialect) {
    if (dialect.resourceStyle === "nodes") {
        renderTorqueResources(job, directives, comments, diagnostics);
        return;
    }

    renderSelectResources(job, directives, comments, diagnostics);
}

function renderSelectResources(job, directives, comments, diagnostics) {
    const topology = deriveTopology(job, diagnostics);
    const memoryPerNode = findMemory(job, "physical", "node");
    const memoryPerCpu = findMemory(job, "physical", "cpu");
    const memoryPerGpu = findMemory(job, "physical", "gpu");
    const totalMemory = findMemory(job, "physical", "job");
    const virtualMemory = job.resources.memory.find((item) => item.kind === "virtual");

    if (topology.nodes || topology.ncpus || topology.mpiprocs || topology.ompthreads || topology.gpusPerNode || memoryPerNode) {
        const count = topology.nodes ?? 1;
        const fields = [`select=${count}`];
        if (topology.ncpus) fields.push(`ncpus=${topology.ncpus}`);
        if (topology.mpiprocs) fields.push(`mpiprocs=${topology.mpiprocs}`);
        if (topology.ompthreads && topology.ompthreads > 1) fields.push(`ompthreads=${topology.ompthreads}`);
        if (memoryPerNode) fields.push(`mem=${formatMemoryForPbs(memoryPerNode.bytes)}`);
        if (topology.gpusPerNode) fields.push(`ngpus=${topology.gpusPerNode}`);
        directives.push(`#PBS -l ${fields.join(":")}`);
    }

    if (memoryPerCpu) {
        directives.push(`#PBS -l pmem=${formatMemoryForPbs(memoryPerCpu.bytes)}`);
        warning(
            diagnostics,
            "PBS_PMEM_APPROXIMATION",
            "Slurm --mem-per-cpu was mapped to PBS pmem; per-CPU and per-process memory semantics are not universally equivalent."
        );
    }

    if (totalMemory) {
        directives.push(`#PBS -l mem=${formatMemoryForPbs(totalMemory.bytes)}`);
        warning(
            diagnostics,
            "PBS_TOTAL_MEMORY_REVIEW",
            "A job-scoped memory request was preserved as PBS mem; verify target-site memory semantics."
        );
    }

    if (memoryPerGpu) {
        comments.push(`# REVIEW: Slurm memory-per-GPU request ${formatMemoryForPbs(memoryPerGpu.bytes)} has no portable PBS equivalent.`);
        warning(diagnostics, "PBS_MEM_PER_GPU_UNSUPPORTED", "Slurm --mem-per-gpu has no portable PBS equivalent and was preserved as a review comment.");
    }

    if (virtualMemory) {
        const key = virtualMemory.scope === "process" ? "pvmem" : "vmem";
        directives.push(`#PBS -l ${key}=${formatMemoryForPbs(virtualMemory.bytes)}`);
    }

    for (const gpu of job.resources.gpus) {
        if (gpu.scope === "job" && !topology.gpusPerNode) {
            directives.push(`#PBS -l ngpus=${gpu.count}`);
            warning(diagnostics, "PBS_GPU_SITE_RESOURCE", "A job-scoped GPU request was rendered as PBS ngpus; verify that the target PBS site defines this resource globally.");
        }
    }

    if (job.resources.exclusive) {
        directives.push("#PBS -l place=exclhost");
    }

    renderGpuReviews(job, comments, diagnostics);
}

function renderTorqueResources(job, directives, comments, diagnostics) {
    const topology = deriveTopology(job, diagnostics);
    if (topology.nodes) {
        let value = `nodes=${topology.nodes}`;
        if (topology.mpiprocs) {
            value += `:ppn=${topology.mpiprocs}`;
        } else if (topology.ncpus) {
            value += `:ppn=${topology.ncpus}`;
        }
        if (topology.gpusPerNode) {
            value += `:gpus=${topology.gpusPerNode}`;
        }
        directives.push(`#PBS -l ${value}`);
    }

    const memory = findMemory(job, "physical", "node") ?? findMemory(job, "physical", "job");
    if (memory) {
        directives.push(`#PBS -l mem=${formatMemoryForPbs(memory.bytes)}`);
    }

    if (job.resources.cpusPerTask && job.resources.cpusPerTask > 1) {
        comments.push(`# REVIEW: Slurm cpus-per-task=${job.resources.cpusPerTask} cannot be represented precisely by TORQUE nodes/ppn syntax.`);
        warning(diagnostics, "TORQUE_THREADS_REVIEW", "Slurm CPUs per task cannot be represented precisely by TORQUE nodes/ppn syntax.");
    }

    if (job.resources.exclusive) {
        comments.push("# REVIEW: exclusive-node behaviour is site-specific in TORQUE and was not emitted as an active directive.");
        warning(diagnostics, "TORQUE_EXCLUSIVE_REVIEW", "Exclusive-node behaviour is site-specific in TORQUE.");
    }

    renderGpuReviews(job, comments, diagnostics);
}

function renderGpuReviews(job, comments, diagnostics) {
    const typed = job.resources.gpus.filter((gpu) => gpu.type);
    if (typed.length > 0) {
        const descriptions = [...new Set(typed.map((gpu) => `${gpu.type}:${gpu.count}`))];
        comments.push(`# REVIEW: Slurm GPU type information is site-specific in PBS and was not encoded in active ngpus syntax: ${descriptions.join(", ")}`);
        warning(diagnostics, "PBS_GPU_TYPE_REVIEW", "Slurm GPU type information has no portable PBS ngpus representation; verify target-site GPU resource/property syntax.");
    }

    const socketScoped = job.resources.gpus.filter((gpu) => gpu.scope === "socket");
    if (socketScoped.length > 0) {
        comments.push(`# REVIEW: Slurm GPUs-per-socket request has no portable PBS equivalent: ${socketScoped.map((gpu) => gpu.raw ?? gpu.count).join(", ")}`);
        warning(diagnostics, "PBS_GPU_SOCKET_UNSUPPORTED", "Slurm GPUs per socket has no portable PBS equivalent and requires manual resource modelling.");
    }
}

function deriveTopology(job, diagnostics) {
    if (job.resources.chunks.length === 1) {
        const chunk = job.resources.chunks[0];
        return {
            nodes: chunk.count,
            ncpus: chunk.ncpus,
            mpiprocs: chunk.mpiprocs,
            ompthreads: chunk.ompthreads,
            gpusPerNode: chunk.gpus?.count ?? null
        };
    }

    let nodes = job.resources.nodes;
    let tasksPerNode = job.resources.tasksPerNode;

    if (!tasksPerNode && nodes && job.resources.tasks && job.resources.tasks % nodes === 0) {
        tasksPerNode = job.resources.tasks / nodes;
    }

    if (!nodes && tasksPerNode && job.resources.tasks && job.resources.tasks % tasksPerNode === 0) {
        nodes = job.resources.tasks / tasksPerNode;
    }

    const cpusPerTask = job.resources.cpusPerTask ?? 1;
    const ncpus = tasksPerNode ? tasksPerNode * cpusPerTask : (nodes && job.resources.cpusPerTask ? cpusPerTask : null);

    let gpusPerNode = findGpuCount(job, "node");
    if (!gpusPerNode) {
        const total = findGpuCount(job, "job");
        if (total && nodes && total % nodes === 0) {
            gpusPerNode = total / nodes;
            warning(diagnostics, "PBS_GPU_DISTRIBUTION_DERIVED", "Total Slurm GPUs were evenly divided across nodes for PBS select output; verify the intended GPU placement.");
        }
    }

    if (!gpusPerNode) {
        const perTask = findGpuCount(job, "task");
        if (perTask && tasksPerNode) {
            gpusPerNode = perTask * tasksPerNode;
            warning(diagnostics, "PBS_GPU_TASK_DERIVED", "Slurm GPUs per task were converted to a per-node PBS GPU count using tasks-per-node.");
        }
    }

    if (!nodes && job.resources.tasks) {
        warning(diagnostics, "PBS_TASK_DISTRIBUTION_UNKNOWN", "Slurm ntasks has no explicit node count; PBS select output assumes a single chunk and should be reviewed.");
        nodes = 1;
        tasksPerNode = job.resources.tasks;
    }

    return {
        nodes,
        ncpus,
        mpiprocs: tasksPerNode,
        ompthreads: job.resources.cpusPerTask,
        gpusPerNode
    };
}

function renderIo(job, directives, comments, diagnostics) {
    const stdout = translateIoPath(job.io.stdout, job.source.scheduler, "pbs", diagnostics);
    const stderr = translateIoPath(job.io.stderr, job.source.scheduler, "pbs", diagnostics);

    if (stdout.value) {
        if (stdout.safe) directives.push(`#PBS -o ${stdout.value}`);
        else comments.push(`# REVIEW: source stdout filename pattern preserved: ${job.io.stdout}`);
    }
    if (stderr.value) {
        if (stderr.safe) directives.push(`#PBS -e ${stderr.value}`);
        else comments.push(`# REVIEW: source stderr filename pattern preserved: ${job.io.stderr}`);
    }

    if (job.io.join) {
        directives.push(`#PBS -j ${job.io.join}`);
    } else if (job.io.stdout && !job.io.stderr && job.source.scheduler === "slurm") {
        directives.push("#PBS -j oe");
    }
}

function renderNotifications(job, directives, comments, diagnostics) {
    if (job.notifications.email) {
        directives.push(`#PBS -M ${job.notifications.email}`);
    }

    if (job.notifications.events.length === 0 && job.notifications.email) {
        directives.push("#PBS -m n");
        return;
    }

    if (job.notifications.events.length > 0) {
        const flags = [];
        const unsupported = [];
        for (const event of job.notifications.events) {
            if (PBS_EVENT_TO_MAIL[event]) {
                flags.push(PBS_EVENT_TO_MAIL[event]);
            } else {
                unsupported.push(event);
            }
        }
        if (flags.length > 0) {
            directives.push(`#PBS -m ${[...new Set(flags)].join("")}`);
        }
        if (unsupported.length > 0) {
            comments.push(`# REVIEW: Slurm mail events not represented in PBS: ${unsupported.join(", ")}`);
            warning(diagnostics, "PBS_MAIL_EVENTS_UNSUPPORTED", `Slurm mail events not represented in PBS: ${unsupported.join(", ")}`);
        }
    }
}

function renderArray(job, directives, comments, diagnostics, dialect) {
    if (!job.array?.expression) {
        return;
    }

    if (job.array.ranges?.length > 1) {
        comments.push(`# REVIEW: array expression '${job.array.expression}' contains multiple ranges and was not emitted as an active PBS directive.`);
        warning(diagnostics, "PBS_ARRAY_MULTI_RANGE", "Slurm array expression contains multiple ranges that are not portably representable in PBS.");
        return;
    }

    directives.push(`#PBS ${dialect.arrayOption} ${job.array.expression}`);
}

function renderEnvironment(job, directives) {
    if (job.environment.exportAll === true) {
        directives.push("#PBS -V");
    }
    if (job.environment.variables.length > 0) {
        directives.push(`#PBS -v ${job.environment.variables.join(",")}`);
    }
}

function renderDependencies(job, directives, comments, diagnostics) {
    const supported = [];
    const unsupported = [];

    for (const dependency of job.dependencies) {
        if (COMMON_DEPENDENCIES.has(dependency.type)) {
            supported.push(`${dependency.type}:${dependency.jobs.join(":")}`);
        } else {
            unsupported.push(dependency.raw || `${dependency.type}:${dependency.jobs.join(":")}`);
        }
    }

    if (supported.length > 0) {
        directives.push(`#PBS -W depend=${supported.join(",")}`);
    }
    if (unsupported.length > 0) {
        comments.push(`# REVIEW: dependencies without a portable PBS mapping: ${unsupported.join(", ")}`);
        warning(diagnostics, "PBS_DEPENDENCY_UNSUPPORTED", `Dependencies without a portable PBS mapping: ${unsupported.join(", ")}`);
    }
}

function renderUnsupported(job, comments) {
    for (const item of job.unsupported) {
        comments.push(`# REVIEW: source ${item.scheduler.toUpperCase()} directive preserved: ${item.directive}`);
    }
    for (const resource of job.resources.custom) {
        comments.push(`# REVIEW: source resource preserved: ${resource.raw}`);
    }
}

function findMemory(job, kind, scope) {
    return job.resources.memory.find((item) => item.kind === kind && item.scope === scope) ?? null;
}

function findGpuCount(job, scope) {
    return job.resources.gpus.find((item) => item.scope === scope)?.count ?? null;
}

function trimOuterBlankLines(lines) {
    const copy = [...lines];
    while (copy.length > 0 && !copy[0].trim()) copy.shift();
    while (copy.length > 0 && !copy[copy.length - 1].trim()) copy.pop();
    return copy;
}

function shellQuote(value) {
    if (/^[A-Za-z0-9_./$-]+$/.test(value)) {
        return value;
    }
    return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}
