import { createJobModel, addUnsupported } from "../../core/job-model.js";
import { info, warning } from "../../core/diagnostics.js";
import {
    normaliseLineEndings,
    parseArrayExpression,
    parseMemory,
    parseSlurmDuration,
    parseSlurmStartTime,
    splitCsv,
    unquote
} from "../../core/utils.js";
import { SLURM_MAIL_TO_EVENT } from "./constants.js";
import { parseGpuGres, parseGpuOption } from "./resources.js";

export function parseSlurm(input) {
    const job = createJobModel();
    const diagnostics = [];
    job.source.scheduler = "slurm";
    job.source.dialect = "slurm";

    const lines = normaliseLineEndings(input).split("\n");
    let executableContentSeen = false;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.trim();

        if (index === 0 && trimmed.startsWith("#!")) {
            job.script.shebang = trimmed;
            return;
        }

        if (trimmed.startsWith("#SBATCH")) {
            if (executableContentSeen) {
                warning(
                    diagnostics,
                    "SLURM_LATE_DIRECTIVE",
                    "SBATCH directive appears after executable script content and would normally be ignored by Slurm; it was preserved in the script body.",
                    { line: lineNumber, scheduler: "slurm" }
                );
                job.script.body.push(line);
                return;
            }

            parseDirective(trimmed.replace(/^#SBATCH\s*/, ""), job, diagnostics, lineNumber);
            return;
        }

        job.script.body.push(line);
        if (trimmed && !trimmed.startsWith("#")) {
            executableContentSeen = true;
        }
    });

    if (job.io.stdout && !job.io.stderr) {
        job.io.join = "oe";
    }

    info(diagnostics, "SLURM_PARSED", "Parsed Slurm batch script.");
    return { job, diagnostics };
}

function parseDirective(directive, job, diagnostics, line) {
    const parsed = parseOption(directive);
    if (!parsed) {
        preserveUnsupported(job, diagnostics, directive, line);
        return;
    }

    const { option, value } = parsed;

    switch (option) {
        case "--job-name":
        case "-J":
            job.job.name = value;
            return;
        case "--partition":
        case "-p":
            job.job.queue = value;
            return;
        case "--account":
        case "-A":
            job.job.account = value;
            return;
        case "--begin":
            job.job.startTime = parseSlurmStartTime(value);
            return;
        case "--hold":
            job.job.hold = true;
            return;
        case "--requeue":
            job.job.rerunnable = true;
            return;
        case "--no-requeue":
            job.job.rerunnable = false;
            return;
        case "--nodes":
        case "-N":
            job.resources.nodes = toInteger(value);
            return;
        case "--ntasks":
        case "-n":
            job.resources.tasks = toInteger(value);
            return;
        case "--ntasks-per-node":
            job.resources.tasksPerNode = toInteger(value);
            return;
        case "--cpus-per-task":
        case "-c":
            job.resources.cpusPerTask = toInteger(value);
            return;
        case "--time":
        case "-t":
            parseTime(value, job, diagnostics, line);
            return;
        case "--mem":
            addMemory(job, value, "physical", "node", "mem", diagnostics, line);
            return;
        case "--mem-per-cpu":
            addMemory(job, value, "physical", "cpu", "mem-per-cpu", diagnostics, line);
            return;
        case "--mem-per-gpu":
            addMemory(job, value, "physical", "gpu", "mem-per-gpu", diagnostics, line);
            return;
        case "--gpus":
            job.resources.gpus.push(parseGpuOption(value, "job"));
            return;
        case "--gpus-per-node":
            job.resources.gpus.push(parseGpuOption(value, "node"));
            return;
        case "--gpus-per-task":
            job.resources.gpus.push(parseGpuOption(value, "task"));
            return;
        case "--gpus-per-socket":
            job.resources.gpus.push(parseGpuOption(value, "socket"));
            return;
        case "--gres":
            parseGres(value, job, diagnostics, line);
            return;
        case "--output":
        case "-o":
            job.io.stdout = value;
            return;
        case "--error":
        case "-e":
            job.io.stderr = value;
            return;
        case "--mail-user":
            job.notifications.email = value;
            return;
        case "--mail-type":
            parseMail(value, job);
            return;
        case "--array":
        case "-a":
            job.array = parseArrayExpression(value);
            return;
        case "--export":
            parseExport(value, job);
            return;
        case "--dependency":
            parseDependencies(value, job, diagnostics, line);
            return;
        case "--chdir":
        case "-D":
            job.io.workingDirectory = value;
            return;
        case "--exclusive":
            job.resources.exclusive = true;
            return;
        case "--constraint":
        case "-C":
        case "--qos":
        case "--reservation":
        case "--distribution":
            preserveUnsupported(job, diagnostics, directive, line, "Slurm option is site-specific or has no portable PBS equivalent.");
            return;
        default:
            preserveUnsupported(job, diagnostics, directive, line);
    }
}

function parseOption(directive) {
    const clean = directive.trim();
    if (!clean) {
        return null;
    }

    if (clean.startsWith("--")) {
        const match = clean.match(/^(--[A-Za-z0-9-]+)(?:=(.*)|\s+(.*))?$/);
        if (!match) {
            return null;
        }
        return {
            option: match[1],
            value: unquote(match[2] ?? match[3] ?? "")
        };
    }

    const spaced = clean.match(/^(-[A-Za-z])(?:\s+(.+))?$/);
    if (spaced) {
        return { option: spaced[1], value: unquote(spaced[2] ?? "") };
    }

    const attached = clean.match(/^(-[JNnctpAoDeCa])(.+)$/);
    if (attached) {
        return { option: attached[1], value: unquote(attached[2]) };
    }

    return { option: clean, value: "" };
}

function parseTime(value, job, diagnostics, line) {
    const seconds = parseSlurmDuration(value);
    if (seconds === null) {
        warning(diagnostics, "SLURM_TIME_INVALID", `Could not parse Slurm time value: ${value}`, { line, scheduler: "slurm" });
        return;
    }
    job.resources.walltimeSeconds = seconds;
}

function addMemory(job, value, kind, scope, sourceKind, diagnostics, line) {
    const parsed = parseMemory(value, "m");
    if (!parsed) {
        warning(diagnostics, "SLURM_MEMORY_INVALID", `Could not parse Slurm memory value: ${value}`, { line, scheduler: "slurm" });
        return;
    }
    job.resources.memory.push({ kind, scope, bytes: parsed.bytes, sourceKind });
}

function parseGres(value, job, diagnostics, line) {
    const gpus = parseGpuGres(value);
    if (gpus.length > 0) {
        job.resources.gpus.push(...gpus);
    }

    const nonGpu = splitCsv(value).filter((entry) => !entry.startsWith("gpu:"));
    if (nonGpu.length > 0) {
        preserveUnsupported(job, diagnostics, `--gres=${value}`, line, "Non-GPU Slurm GRES values have no portable PBS mapping.");
    }
}

function parseMail(value, job) {
    const values = splitCsv(value.toUpperCase());
    if (values.includes("NONE")) {
        job.notifications.events = [];
        return;
    }

    const expanded = values.includes("ALL")
        ? ["BEGIN", "END", "FAIL", "REQUEUE", "STAGE_OUT", "INVALID_DEPEND"]
        : values;

    job.notifications.events = [...new Set(
        expanded.map((item) => SLURM_MAIL_TO_EVENT[item]).filter(Boolean)
    )];
}

function parseExport(value, job) {
    const entries = splitCsv(value);
    if (entries.length === 0) {
        return;
    }

    const mode = entries[0].toUpperCase();
    if (mode === "ALL") {
        job.environment.exportAll = true;
        job.environment.variables.push(...entries.slice(1));
    } else if (["NONE", "NIL"].includes(mode)) {
        job.environment.exportAll = false;
        job.environment.variables.push(...entries.slice(1));
    } else {
        job.environment.exportAll = false;
        job.environment.variables.push(...entries);
    }
}

function parseDependencies(value, job, diagnostics, line) {
    if (value.includes("?")) {
        preserveUnsupported(job, diagnostics, `--dependency=${value}`, line, "Slurm OR dependency expressions are not portably representable in PBS.");
        return;
    }

    for (const clause of value.split(",")) {
        const [type, ...jobs] = clause.split(":");
        job.dependencies.push({ type, jobs: jobs.filter(Boolean), raw: clause });
    }
}

function preserveUnsupported(job, diagnostics, directive, line, reason = null) {
    addUnsupported(job, {
        scheduler: "slurm",
        line,
        directive: directive.startsWith("#SBATCH") ? directive : `#SBATCH ${directive}`,
        reason: reason ?? undefined
    });
    warning(
        diagnostics,
        "SLURM_UNSUPPORTED_DIRECTIVE",
        `Unsupported or non-portable Slurm directive preserved for review: ${directive}`,
        { line, scheduler: "slurm" }
    );
}

function toInteger(value) {
    return /^\d+$/.test(String(value)) ? Number(value) : null;
}
