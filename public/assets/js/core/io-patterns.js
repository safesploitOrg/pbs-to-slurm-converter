import { warning } from "./diagnostics.js";

const PBS_TO_SLURM_PATTERNS = Object.freeze([
    [/\$\{PBS_JOBID\}|\$PBS_JOBID\b/g, "%j"],
    [/\$\{PBS_JOBNAME\}|\$PBS_JOBNAME\b/g, "%x"],
    [/\$\{PBS_ARRAY_INDEX\}|\$PBS_ARRAY_INDEX\b/g, "%a"],
    [/\$\{PBS_ARRAYID\}|\$PBS_ARRAYID\b/g, "%a"]
]);

const SLURM_FILENAME_PATTERN = /%(?:\d{1,2})?[AaBbJjNnrSstuXx%]/;

export function translateIoPath(path, sourceScheduler, targetScheduler, diagnostics) {
    if (!path || sourceScheduler === targetScheduler) {
        return { value: path, safe: true, changed: false };
    }

    if (sourceScheduler === "pbs" && targetScheduler === "slurm") {
        return pbsToSlurmPath(path, diagnostics);
    }

    if (sourceScheduler === "slurm" && targetScheduler === "pbs") {
        return slurmToPbsPath(path, diagnostics);
    }

    return { value: path, safe: true, changed: false };
}

function pbsToSlurmPath(path, diagnostics) {
    let value = path;
    let changed = false;

    for (const [pattern, replacement] of PBS_TO_SLURM_PATTERNS) {
        if (pattern.test(value)) {
            pattern.lastIndex = 0;
            value = value.replace(pattern, replacement);
            changed = true;
        }
    }

    if (changed) {
        warning(
            diagnostics,
            "PBS_IO_VARIABLE_PATTERN",
            "PBS variables in an output/error directive were interpreted as intended filename tokens and converted to Slurm % patterns; modern PBS may not expand variables in -o/-e directives."
        );
    }

    if (/\$\{?[A-Za-z_][A-Za-z0-9_]*\}?/.test(value)) {
        warning(
            diagnostics,
            "SLURM_IO_SHELL_VARIABLE",
            `Output/error path '${path}' still contains shell-variable syntax that Slurm reads literally in #SBATCH directives; the active directive was not emitted.`
        );
        return { value, safe: false, changed };
    }

    return { value, safe: true, changed };
}

function slurmToPbsPath(path, diagnostics) {
    if (SLURM_FILENAME_PATTERN.test(path)) {
        warning(
            diagnostics,
            "PBS_IO_PATTERN_UNSUPPORTED",
            `Slurm filename pattern '${path}' has no portable PBS -o/-e equivalent; it was preserved as a review comment and PBS default naming will apply.`
        );
        return { value: path, safe: false, changed: false };
    }

    if (/\$\{?SLURM_[A-Za-z0-9_]*\}?/.test(path)) {
        warning(
            diagnostics,
            "SLURM_IO_LITERAL_VARIABLE",
            `Slurm output/error path '${path}' contains shell-variable syntax that Slurm itself treats literally in #SBATCH directives; it was preserved for review instead of copied into PBS.`
        );
        return { value: path, safe: false, changed: false };
    }

    return { value: path, safe: true, changed: false };
}
