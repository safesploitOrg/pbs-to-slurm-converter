import { info, warning } from "../../core/diagnostics.js";
import {
    formatMemoryForSlurm,
    formatSlurmDuration,
    formatSlurmStartTime
} from "../../core/utils.js";
import { SLURM_EVENT_TO_MAIL } from "./constants.js";
import { translateIoPath } from "../../core/io-patterns.js";

const COMMON_DEPENDENCIES = new Set(["after", "afterany", "afterok", "afternotok"]);

export function renderSlurm(job, { diagnostics = [] } = {}) {
    const directives = [];
    const reviewComments = [];

    renderIdentity(job, directives, reviewComments, diagnostics);
    renderTiming(job, directives, reviewComments, diagnostics);
    renderResources(job, directives, reviewComments, diagnostics);
    renderIo(job, directives, reviewComments, diagnostics);
    renderNotifications(job, directives);
    renderArray(job, directives);
    renderEnvironment(job, directives, diagnostics);
    renderDependencies(job, directives, reviewComments, diagnostics);
    renderUnsupported(job, reviewComments);
    for (const review of job.script.reviews) {
        reviewComments.push(`# REVIEW: ${review}`);
    }

    const shebang = job.script.shebang || "#!/bin/bash";
    const output = [
        shebang,
        ...directives,
        ...reviewComments,
        "",
        ...trimOuterBlankLines(job.script.body)
    ].join("\n").trimEnd();

    info(diagnostics, "SLURM_RENDERED", "Rendered Slurm batch script.");
    return { output };
}

function renderIdentity(job, directives, comments, diagnostics) {
    if (job.job.name) {
        directives.push(`#SBATCH --job-name=${quoteIfNeeded(job.job.name)}`);
    }

    if (job.job.queue) {
        directives.push(`#SBATCH --partition=${job.job.queue}`);
        if (job.source.scheduler === "pbs") {
            warning(
                diagnostics,
                "QUEUE_SITE_SPECIFIC",
                "PBS queue was mapped to a Slurm partition name; verify that the target cluster uses the same name."
            );
        }
    }

    if (job.job.account) {
        directives.push(`#SBATCH --account=${job.job.account}`);
    }

    if (job.job.project) {
        comments.push(`# REVIEW: PBS project '${job.job.project}' has no portable Slurm equivalent distinct from account.`);
        warning(diagnostics, "SLURM_PROJECT_REVIEW", "PBS project has no portable Slurm equivalent distinct from account.");
    }

    if (job.job.group) {
        comments.push(`# REVIEW: PBS execution group '${job.job.group}' was not mapped to Slurm --account.`);
        warning(diagnostics, "SLURM_GROUP_NO_EQUIVALENT", "PBS group_list controls execution group and was not mapped to Slurm accounting.");
    }

    if (job.job.hold) {
        directives.push("#SBATCH --hold");
    }

    if (job.job.rerunnable !== null) {
        directives.push(job.job.rerunnable ? "#SBATCH --requeue" : "#SBATCH --no-requeue");
    }
}

function renderTiming(job, directives, comments, diagnostics) {
    if (job.job.startTime) {
        const formatted = formatSlurmStartTime(job.job.startTime);
        if (formatted) {
            directives.push(`#SBATCH --begin=${formatted}`);
        } else {
            comments.push(`# REVIEW: PBS start time '${job.job.startTime.raw}' could not be represented safely as Slurm --begin.`);
            warning(diagnostics, "SLURM_START_TIME_UNREPRESENTABLE", `Start time '${job.job.startTime.raw}' could not be converted safely to Slurm --begin syntax.`);
        }
    }

    if (job.resources.walltimeSeconds !== null) {
        directives.push(`#SBATCH --time=${formatSlurmDuration(job.resources.walltimeSeconds)}`);
    }
}

function renderResources(job, directives, comments, diagnostics) {
    const chunkTopology = deriveFromPbsChunks(job, comments, diagnostics);
    const legacyTopology = deriveFromLegacyNodes(job, comments, diagnostics);
    const topology = chunkTopology ?? legacyTopology ?? {
        nodes: job.resources.nodes,
        tasks: job.resources.tasks,
        tasksPerNode: job.resources.tasksPerNode,
        cpusPerTask: job.resources.cpusPerTask,
        memoryPerNode: null,
        gpusPerNode: null,
        totalGpus: null
    };

    if (topology.nodes) {
        directives.push(`#SBATCH --nodes=${topology.nodes}`);
    }
    if (topology.tasks) {
        directives.push(`#SBATCH --ntasks=${topology.tasks}`);
    } else if (topology.tasksPerNode) {
        directives.push(`#SBATCH --ntasks-per-node=${topology.tasksPerNode}`);
    }
    if (topology.cpusPerTask) {
        directives.push(`#SBATCH --cpus-per-task=${topology.cpusPerTask}`);
    }
    if (topology.memoryPerNode) {
        directives.push(`#SBATCH --mem=${formatMemoryForSlurm(topology.memoryPerNode)}`);
    }
    if (topology.gpusPerNode) {
        directives.push(`#SBATCH --gpus-per-node=${topology.gpusPerNode}`);
    } else if (topology.totalGpus) {
        directives.push(`#SBATCH --gpus=${topology.totalGpus}`);
    }

    for (const memory of job.resources.memory) {
        if (memory.kind === "virtual") {
            comments.push(`# REVIEW: PBS ${memory.sourceKind}=${formatMemoryForSlurm(memory.bytes)} has no direct Slurm virtual-memory request equivalent.`);
            warning(diagnostics, "SLURM_VMEM_UNSUPPORTED", `PBS ${memory.sourceKind} has no direct Slurm virtual-memory request equivalent.`);
            continue;
        }

        if (memory.scope === "job") {
            directives.push(`#SBATCH --mem=${formatMemoryForSlurm(memory.bytes)}`);
            if ((topology.nodes ?? job.resources.nodes ?? 1) > 1) {
                warning(diagnostics, "SLURM_MEM_SCOPE_REVIEW", "PBS job-scoped mem was mapped to Slurm --mem, which is a per-node request; review multi-node memory semantics.");
            }
        } else if (memory.scope === "process") {
            directives.push(`#SBATCH --mem-per-cpu=${formatMemoryForSlurm(memory.bytes)}`);
            warning(diagnostics, "SLURM_PMEM_APPROXIMATION", "PBS pmem/pvmem per-process semantics are not universally equivalent to Slurm memory per allocated CPU.");
        }
    }

    if (!chunkTopology) {
        for (const gpu of job.resources.gpus) {
            if (!gpu.count) continue;
            const suffix = gpu.type ? `${gpu.type}:${gpu.count}` : String(gpu.count);
            switch (gpu.scope) {
                case "job":
                    directives.push(`#SBATCH --gpus=${suffix}`);
                    break;
                case "node":
                    directives.push(`#SBATCH --gpus-per-node=${suffix}`);
                    break;
                case "task":
                    directives.push(`#SBATCH --gpus-per-task=${suffix}`);
                    break;
                case "socket":
                    directives.push(`#SBATCH --gpus-per-socket=${suffix}`);
                    break;
                default:
                    comments.push(`# REVIEW: GPU request '${gpu.raw ?? gpu.count}' has unknown scope.`);
                    break;
            }
        }
    }

    if (job.resources.exclusive) {
        directives.push("#SBATCH --exclusive");
    }

    renderPlacementReview(job, comments, diagnostics);
}

function deriveFromPbsChunks(job, comments, diagnostics) {
    if (job.resources.chunks.length === 0) {
        return null;
    }

    if (!chunksAreHomogeneous(job.resources.chunks)) {
        comments.push(`# REVIEW: heterogeneous PBS select request was not converted into active Slurm resource directives: ${job.resources.chunks.map((chunk) => chunk.raw).join("+")}`);
        warning(diagnostics, "SLURM_HETEROGENEOUS_REVIEW", "Heterogeneous PBS select chunks require Slurm heterogeneous-job or site-specific handling; active resource directives were not guessed.");
        return {};
    }

    const first = job.resources.chunks[0];
    const chunkCount = job.resources.chunks.reduce((total, chunk) => total + chunk.count, 0);
    const oneChunkPerNode = ["scatter", "vscatter"].includes(job.resources.placement.arrangement)
        || ["excl", "exclhost"].includes(job.resources.placement.sharing);

    if (!oneChunkPerNode) {
        warning(diagnostics, "SLURM_CHUNK_NODE_ASSUMPTION", "PBS select chunks were mapped one-to-one to Slurm nodes; PBS placement may allow multiple chunks on a host, so review the node count.");
    }

    let cpusPerTask = first.ompthreads;
    if (!cpusPerTask && first.ncpus && first.mpiprocs && first.ncpus % first.mpiprocs === 0) {
        cpusPerTask = first.ncpus / first.mpiprocs;
        if (cpusPerTask > 1) {
            warning(diagnostics, "SLURM_CPU_TOPOLOGY_DERIVED", "Slurm cpus-per-task was derived from PBS ncpus/mpiprocs; verify process/thread affinity.");
        }
    } else if (!cpusPerTask && first.ncpus && !first.mpiprocs) {
        cpusPerTask = first.ncpus;
        warning(diagnostics, "SLURM_NCPUS_APPROXIMATION", "PBS ncpus without mpiprocs was mapped to Slurm cpus-per-task as a best-effort assumption.");
    }

    const totalGpus = first.gpus?.count ? chunkCount * first.gpus.count : null;

    return {
        nodes: chunkCount,
        tasks: null,
        tasksPerNode: first.mpiprocs,
        cpusPerTask,
        memoryPerNode: first.memoryBytes,
        gpusPerNode: oneChunkPerNode ? first.gpus?.count ?? null : null,
        totalGpus: oneChunkPerNode ? null : totalGpus
    };
}

function deriveFromLegacyNodes(job, comments, diagnostics) {
    if (!job.resources.legacyNodes?.segments?.length) {
        return null;
    }

    const segments = job.resources.legacyNodes.segments;
    const first = segments[0];
    const homogeneous = segments.every((segment) => (
        segment.ppn === first.ppn
        && segment.gpus === first.gpus
        && JSON.stringify(segment.properties) === JSON.stringify(first.properties)
    ));

    if (!homogeneous) {
        comments.push(`# REVIEW: heterogeneous legacy nodes request was not fully converted: ${job.resources.legacyNodes.raw}`);
        warning(diagnostics, "SLURM_LEGACY_HETEROGENEOUS", "Heterogeneous legacy nodes/ppn syntax requires manual Slurm resource modelling.");
        return {};
    }

    const nodes = segments.reduce((total, segment) => total + segment.count, 0);
    return {
        nodes,
        tasks: null,
        tasksPerNode: first.ppn ?? 1,
        cpusPerTask: null,
        memoryPerNode: null,
        gpusPerNode: first.gpus,
        totalGpus: null
    };
}

function renderPlacementReview(job, comments, diagnostics) {
    const arrangement = job.resources.placement.arrangement;
    if (arrangement && !["scatter", "vscatter"].includes(arrangement)) {
        comments.push(`# REVIEW: PBS placement '${job.resources.placement.raw}' has no exact portable Slurm mapping.`);
        warning(diagnostics, "SLURM_PLACEMENT_REVIEW", `PBS placement '${job.resources.placement.raw}' has no exact portable Slurm mapping.`);
    }

    if (job.resources.placement.groupBy) {
        comments.push(`# REVIEW: PBS placement group=${job.resources.placement.groupBy} requires site-specific Slurm topology/constraint handling.`);
        warning(diagnostics, "SLURM_PLACE_GROUP_REVIEW", "PBS place group= requires site-specific Slurm topology handling.");
    }
}

function renderIo(job, directives, comments, diagnostics) {
    const stdout = translateIoPath(job.io.stdout, job.source.scheduler, "slurm", diagnostics);
    const stderr = translateIoPath(job.io.stderr, job.source.scheduler, "slurm", diagnostics);

    if (job.io.join === "oe") {
        if (stdout.safe && stdout.value) {
            directives.push(`#SBATCH --output=${stdout.value}`);
        } else if (job.io.stdout) {
            comments.push(`# REVIEW: source stdout path preserved: ${job.io.stdout}`);
        }
        return;
    }

    if (job.io.join === "eo") {
        const destination = stderr.value || stdout.value;
        const safe = stderr.value ? stderr.safe : stdout.safe;
        if (destination && safe) {
            directives.push(`#SBATCH --output=${destination}`);
            directives.push(`#SBATCH --error=${destination}`);
            warning(diagnostics, "SLURM_JOIN_EO_APPROXIMATION", "PBS -j eo was approximated by sending both Slurm streams to the same path; stream ordering may differ.");
        } else if (destination) {
            comments.push(`# REVIEW: joined PBS output/error path preserved: ${destination}`);
        }
        return;
    }

    if (stdout.value) {
        if (stdout.safe) directives.push(`#SBATCH --output=${stdout.value}`);
        else comments.push(`# REVIEW: source stdout path preserved: ${job.io.stdout}`);
    }
    if (stderr.value) {
        if (stderr.safe) directives.push(`#SBATCH --error=${stderr.value}`);
        else comments.push(`# REVIEW: source stderr path preserved: ${job.io.stderr}`);
    }
}

function renderNotifications(job, directives) {
    if (job.notifications.email) {
        directives.push(`#SBATCH --mail-user=${job.notifications.email}`);
    }

    if (job.notifications.events.length > 0) {
        const eventOrder = ["begin", "end", "fail", "array", "requeue", "stage_out", "invalid_dependency"];
        const values = eventOrder
            .filter((event) => job.notifications.events.includes(event))
            .map((event) => SLURM_EVENT_TO_MAIL[event])
            .filter(Boolean);
        if (values.length > 0) {
            directives.push(`#SBATCH --mail-type=${[...new Set(values)].join(",")}`);
        }
    } else if (job.notifications.email) {
        directives.push("#SBATCH --mail-type=NONE");
    }
}

function renderArray(job, directives) {
    if (job.array?.expression) {
        directives.push(`#SBATCH --array=${job.array.expression}`);
    }
}

function renderEnvironment(job, directives, diagnostics) {
    if (job.environment.exportAll === true) {
        const suffix = job.environment.variables.length > 0 ? `,${job.environment.variables.join(",")}` : "";
        directives.push(`#SBATCH --export=ALL${suffix}`);
        return;
    }

    if (job.environment.variables.length > 0) {
        directives.push(`#SBATCH --export=${job.environment.variables.join(",")}`);
        warning(diagnostics, "SLURM_EXPORT_REVIEW", "PBS -v variable export was mapped to Slurm --export; environment inheritance policies differ and should be reviewed.");
    }
}

function renderDependencies(job, directives, comments, diagnostics) {
    const supported = [];
    const unsupported = [];

    for (const dependency of job.dependencies) {
        if (COMMON_DEPENDENCIES.has(dependency.type)) {
            supported.push(`${dependency.type}${dependency.jobs.length ? `:${dependency.jobs.join(":")}` : ""}`);
        } else {
            unsupported.push(dependency.raw || dependency.type);
        }
    }

    if (supported.length > 0) {
        directives.push(`#SBATCH --dependency=${supported.join(",")}`);
    }
    if (unsupported.length > 0) {
        comments.push(`# REVIEW: PBS dependencies without a portable Slurm mapping: ${unsupported.join(", ")}`);
        warning(diagnostics, "SLURM_DEPENDENCY_UNSUPPORTED", `PBS dependencies without a portable Slurm mapping: ${unsupported.join(", ")}`);
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

function chunksAreHomogeneous(chunks) {
    if (chunks.length <= 1) {
        return true;
    }

    const normalised = (chunk) => JSON.stringify({
        ncpus: chunk.ncpus,
        mpiprocs: chunk.mpiprocs,
        ompthreads: chunk.ompthreads,
        memoryBytes: chunk.memoryBytes,
        virtualMemoryBytes: chunk.virtualMemoryBytes,
        gpus: chunk.gpus,
        properties: chunk.properties
    });

    const first = normalised(chunks[0]);
    return chunks.every((chunk) => normalised(chunk) === first);
}

function trimOuterBlankLines(lines) {
    const copy = [...lines];
    while (copy.length > 0 && !copy[0].trim()) copy.shift();
    while (copy.length > 0 && !copy[copy.length - 1].trim()) copy.pop();
    return copy;
}

function quoteIfNeeded(value) {
    return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}
