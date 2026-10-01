import { warning } from "./diagnostics.js";

const ENVIRONMENT_VARIABLES = Object.freeze({
    pbs: {
        PBS_O_WORKDIR: "SUBMIT_DIRECTORY",
        PBS_JOBID: "JOB_ID",
        PBS_JOBNAME: "JOB_NAME",
        PBS_O_HOST: "SUBMIT_HOST",
        PBS_ARRAY_INDEX: "ARRAY_INDEX",
        PBS_ARRAYID: "ARRAY_INDEX",
        PBS_QUEUE: "EXECUTION_QUEUE",
        PBS_NODEFILE: "NODE_FILE"
    },
    slurm: {
        SLURM_SUBMIT_DIR: "SUBMIT_DIRECTORY",
        SLURM_JOB_ID: "JOB_ID",
        SLURM_JOB_NAME: "JOB_NAME",
        SLURM_SUBMIT_HOST: "SUBMIT_HOST",
        SLURM_ARRAY_TASK_ID: "ARRAY_INDEX",
        SLURM_JOB_PARTITION: "EXECUTION_QUEUE",
        SLURM_JOB_NODELIST: "NODE_LIST"
    }
});

const TARGET_VARIABLES = Object.freeze({
    pbs: {
        SUBMIT_DIRECTORY: "PBS_O_WORKDIR",
        JOB_ID: "PBS_JOBID",
        JOB_NAME: "PBS_JOBNAME",
        SUBMIT_HOST: "PBS_O_HOST",
        ARRAY_INDEX: "PBS_ARRAY_INDEX",
        EXECUTION_QUEUE: "PBS_QUEUE"
    },
    slurm: {
        SUBMIT_DIRECTORY: "SLURM_SUBMIT_DIR",
        JOB_ID: "SLURM_JOB_ID",
        JOB_NAME: "SLURM_JOB_NAME",
        SUBMIT_HOST: "SLURM_SUBMIT_HOST",
        ARRAY_INDEX: "SLURM_ARRAY_TASK_ID",
        EXECUTION_QUEUE: "SLURM_JOB_PARTITION"
    }
});

export function translateEnvironmentVariables(lines, sourceScheduler, targetScheduler, diagnostics) {
    const warnedTokens = new Set();
    return lines.map((line) => translateString(
        line,
        sourceScheduler,
        targetScheduler,
        diagnostics,
        warnedTokens
    ));
}

export function translateJobEnvironment(job, sourceScheduler, targetScheduler, diagnostics) {
    if (sourceScheduler === targetScheduler) {
        return job;
    }

    const warnedTokens = new Set();
    const translate = (value) => {
        if (value === null || value === undefined) {
            return value;
        }
        return translateString(
            String(value),
            sourceScheduler,
            targetScheduler,
            diagnostics,
            warnedTokens
        );
    };

    job.script.body = job.script.body.map(translate);
    job.io.workingDirectory = translate(job.io.workingDirectory);
    job.environment.variables = job.environment.variables.map(translate);
    return job;
}

function translateString(value, sourceScheduler, targetScheduler, diagnostics, warnedTokens) {
    if (sourceScheduler === targetScheduler) {
        return value;
    }

    const sourceMap = ENVIRONMENT_VARIABLES[sourceScheduler] ?? {};
    const targetMap = TARGET_VARIABLES[targetScheduler] ?? {};
    let translated = value;

    for (const [sourceVariable, token] of Object.entries(sourceMap)) {
        const pattern = new RegExp(`\\$\\{${sourceVariable}\\}|\\$${sourceVariable}\\b`, "g");
        if (!pattern.test(translated)) {
            continue;
        }

        pattern.lastIndex = 0;
        const targetVariable = targetMap[token];
        if (!targetVariable) {
            if (!warnedTokens.has(token)) {
                warning(
                    diagnostics,
                    "ENV_NO_EQUIVALENT",
                    `${sourceVariable} has no direct ${targetScheduler.toUpperCase()} environment-variable equivalent; it was preserved for manual review.`
                );
                warnedTokens.add(token);
            }
            continue;
        }

        translated = translated.replace(pattern, `$${targetVariable}`);
    }

    return translated;
}
