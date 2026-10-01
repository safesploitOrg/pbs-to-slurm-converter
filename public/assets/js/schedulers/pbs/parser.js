import { createJobModel, addUnsupported } from "../../core/job-model.js";
import { info, warning } from "../../core/diagnostics.js";
import {
    normaliseLineEndings,
    parseArrayExpression,
    parseMemory,
    parsePbsDuration,
    parsePbsStartTime,
    splitCsv,
    unquote
} from "../../core/utils.js";
import { PBS_DIALECT, PBS_MAIL_TO_EVENTS } from "./constants.js";
import { parseLegacyNodes, parsePlace, parseSelect } from "./resources.js";

export function parsePbs(input) {
    const job = createJobModel();
    const diagnostics = [];
    job.source.scheduler = "pbs";
    job.source.dialect = PBS_DIALECT.OPENPBS;

    const lines = normaliseLineEndings(input).split("\n");
    let executableContentSeen = false;

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmed = line.trim();

        if (index === 0 && trimmed.startsWith("#!")) {
            job.script.shebang = trimmed;
            return;
        }

        if (trimmed.startsWith("#PBS")) {
            if (executableContentSeen) {
                warning(
                    diagnostics,
                    "PBS_LATE_DIRECTIVE",
                    "PBS directive appears after executable script content and would normally be ignored by PBS; it was preserved in the script body.",
                    { line: lineNumber, scheduler: "pbs" }
                );
                job.script.body.push(line);
                return;
            }

            parseDirective(trimmed.replace(/^#PBS\s*/, ""), job, diagnostics, lineNumber);
            return;
        }

        job.script.body.push(line);
        if (trimmed && !trimmed.startsWith("#")) {
            executableContentSeen = true;
        }
    });

    info(diagnostics, "PBS_PARSED", `Parsed PBS input using ${job.source.dialect} compatibility rules.`);
    return { job, diagnostics };
}

function parseDirective(directive, job, diagnostics, line) {
    const option = directive.slice(0, 2);
    const value = directive.length > 2 ? unquote(directive.slice(2).trim()) : "";

    switch (option) {
        case "-N":
            job.job.name = value;
            return;
        case "-q":
            job.job.queue = value;
            return;
        case "-A":
            job.job.account = value;
            return;
        case "-P":
            job.job.project = value;
            return;
        case "-a":
            job.job.startTime = parsePbsStartTime(value);
            return;
        case "-h":
            job.job.hold = true;
            return;
        case "-r":
            job.job.rerunnable = value.toLowerCase() === "y";
            return;
        case "-o":
            job.io.stdout = value;
            return;
        case "-e":
            job.io.stderr = value;
            return;
        case "-j":
            job.io.join = value.toLowerCase();
            return;
        case "-M":
            job.notifications.email = value;
            return;
        case "-m":
            parseMail(value, job);
            return;
        case "-J":
            job.array = parseArrayExpression(value);
            return;
        case "-t":
            job.source.dialect = PBS_DIALECT.TORQUE;
            job.array = parseArrayExpression(value);
            return;
        case "-V":
            job.environment.exportAll = true;
            return;
        case "-v":
            job.environment.variables.push(...splitCsv(value));
            return;
        case "-W":
            parseExtended(value, job, diagnostics, line);
            return;
        case "-l":
            parseResources(value, job, diagnostics, line);
            return;
        case "-S":
            if (!job.script.shebang) {
                job.script.shebang = `#!${value}`;
            }
            return;
        default:
            preserveUnsupported(job, diagnostics, directive, line);
    }
}

function parseMail(value, job) {
    const clean = value.toLowerCase();
    if (clean === "n") {
        job.notifications.events = [];
        return;
    }

    job.notifications.events = [...new Set(
        [...clean]
            .map((flag) => PBS_MAIL_TO_EVENTS[flag])
            .filter(Boolean)
    )];
}

function parseExtended(value, job, diagnostics, line) {
    if (value.startsWith("depend=")) {
        const clauses = value.slice("depend=".length).split(",");
        for (const clause of clauses) {
            const [type, ...ids] = clause.split(":");
            job.dependencies.push({ type, jobs: ids.filter(Boolean), raw: clause });
        }
        return;
    }

    if (value.startsWith("group_list=")) {
        job.job.group = value.slice("group_list=".length);
        return;
    }

    preserveUnsupported(job, diagnostics, `-W ${value}`, line);
}

function parseResources(value, job, diagnostics, line) {
    const resources = splitCsv(value);

    for (const resource of resources) {
        if (resource.startsWith("walltime=")) {
            const seconds = parsePbsDuration(resource.slice("walltime=".length));
            if (seconds === null) {
                warning(diagnostics, "PBS_WALLTIME_INVALID", `Could not parse PBS walltime: ${resource}`, { line, scheduler: "pbs" });
            } else {
                job.resources.walltimeSeconds = seconds;
            }
            continue;
        }

        if (resource.startsWith("select=")) {
            job.resources.chunks.push(...parseSelect(resource, diagnostics, line));
            job.source.dialect = PBS_DIALECT.OPENPBS;
            continue;
        }

        if (resource.startsWith("nodes=")) {
            job.resources.legacyNodes = parseLegacyNodes(resource, diagnostics, line);
            job.source.dialect = PBS_DIALECT.TORQUE;
            continue;
        }

        if (resource.startsWith("place=")) {
            job.resources.placement = parsePlace(resource);
            if (["excl", "exclhost"].includes(job.resources.placement.sharing)) {
                job.resources.exclusive = true;
            }
            continue;
        }

        if (/^(mem|pmem|vmem|pvmem)=/.test(resource)) {
            const [kind, rawValue] = resource.split("=", 2);
            const parsed = parseMemory(rawValue);
            if (!parsed) {
                warning(diagnostics, "PBS_MEMORY_INVALID", `Could not parse PBS memory resource: ${resource}`, { line, scheduler: "pbs" });
                continue;
            }
            job.resources.memory.push({
                kind: kind.includes("v") ? "virtual" : "physical",
                scope: kind.startsWith("p") ? "process" : "job",
                bytes: parsed.bytes,
                sourceKind: kind
            });
            continue;
        }

        if (/^(ngpus|gpus|gpu)=/.test(resource)) {
            const count = Number(resource.split("=")[1]);
            if (Number.isFinite(count)) {
                job.resources.gpus.push({ count, scope: "job", type: null, sourceKind: resource.split("=")[0] });
                continue;
            }
        }

        job.resources.custom.push({ scheduler: "pbs", raw: resource });
        warning(
            diagnostics,
            "PBS_CUSTOM_RESOURCE",
            `PBS resource '${resource}' is site-specific or not yet modelled and will be preserved for review.`,
            { line, scheduler: "pbs" }
        );
    }
}

function preserveUnsupported(job, diagnostics, directive, line) {
    addUnsupported(job, {
        scheduler: "pbs",
        line,
        directive: `#PBS ${directive}`
    });
    warning(
        diagnostics,
        "PBS_UNSUPPORTED_DIRECTIVE",
        `Unsupported PBS directive preserved for review: #PBS ${directive}`,
        { line, scheduler: "pbs" }
    );
}
