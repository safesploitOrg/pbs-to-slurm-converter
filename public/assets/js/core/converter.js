import { summariseDiagnostics } from "./diagnostics.js";
import { translateJobEnvironment } from "./environment.js";
import { parsePbs } from "../schedulers/pbs/parser.js";
import { renderPbs } from "../schedulers/pbs/renderer.js";
import { parseSlurm } from "../schedulers/slurm/parser.js";
import { renderSlurm } from "../schedulers/slurm/renderer.js";
import { analyseScriptForTarget } from "./script-analysis.js";

export const SCHEDULER = Object.freeze({
    PBS: "pbs",
    SLURM: "slurm"
});

const PARSERS = Object.freeze({
    [SCHEDULER.PBS]: parsePbs,
    [SCHEDULER.SLURM]: parseSlurm
});

const RENDERERS = Object.freeze({
    [SCHEDULER.PBS]: renderPbs,
    [SCHEDULER.SLURM]: renderSlurm
});

export function convert({
    input,
    sourceScheduler,
    targetScheduler,
    targetDialect = "openpbs"
}) {
    const source = normaliseScheduler(sourceScheduler);
    const target = normaliseScheduler(targetScheduler);

    if (!String(input ?? "").trim()) {
        return {
            output: "",
            summary: [],
            warnings: [],
            diagnostics: [],
            job: null
        };
    }

    if (source === target) {
        throw new Error("Source and target schedulers must be different.");
    }

    const parsed = PARSERS[source](input);
    translateJobEnvironment(
        parsed.job,
        source,
        target,
        parsed.diagnostics
    );
    analyseScriptForTarget(parsed.job, target, parsed.diagnostics);

    const rendered = RENDERERS[target](parsed.job, {
        targetDialect,
        diagnostics: parsed.diagnostics
    });

    const formatted = summariseDiagnostics(parsed.diagnostics);

    return {
        output: rendered.output,
        summary: formatted.summary,
        warnings: formatted.warnings,
        diagnostics: parsed.diagnostics,
        job: parsed.job
    };
}

export function normaliseScheduler(value) {
    const clean = String(value ?? "").trim().toLowerCase();
    if (!Object.values(SCHEDULER).includes(clean)) {
        throw new Error(`Unsupported scheduler: ${value}`);
    }
    return clean;
}
