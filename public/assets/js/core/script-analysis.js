import { warning } from "./diagnostics.js";

const TARGET_WARNINGS = Object.freeze({
    pbs: [
        {
            pattern: /^\s*srun\b/,
            code: "PBS_SRUN_REVIEW",
            message: "Slurm srun command is preserved in the PBS script body; replace it with the launcher required by the target PBS/MPI environment."
        },
        {
            pattern: /^\s*scontrol\b/,
            code: "PBS_SCONTROL_REVIEW",
            message: "Slurm scontrol command is preserved in the PBS script body and requires manual replacement."
        }
    ],
    slurm: [
        {
            pattern: /^\s*pbsdsh\b/,
            code: "SLURM_PBSDSH_REVIEW",
            message: "PBS pbsdsh command is preserved in the Slurm script body and requires manual replacement."
        },
        {
            pattern: /^\s*(?:mpiexec|mpirun)\b/,
            code: "SLURM_MPI_LAUNCHER_REVIEW",
            message: "MPI launcher was preserved; verify whether the target Slurm cluster expects srun or an MPI-integrated mpiexec/mpirun."
        }
    ]
});

export function analyseScriptForTarget(job, targetScheduler, diagnostics) {
    const rules = TARGET_WARNINGS[targetScheduler] ?? [];
    const emitted = new Set();

    job.script.body.forEach((line, index) => {
        for (const rule of rules) {
            if (!rule.pattern.test(line) || emitted.has(rule.code)) {
                continue;
            }

            warning(diagnostics, rule.code, rule.message, { line: index + 1 });
            job.script.reviews.push(rule.message);
            emitted.add(rule.code);
        }
    });
}
