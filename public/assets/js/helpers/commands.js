export const SCHEDULER_COMMAND_HELP = Object.freeze({
    pbs: Object.freeze({
        id: "pbs",
        title: "How to run this PBS job",
        subtitle: "OpenPBS / PBS Pro / TORQUE",
        filename: "converted.pbs",
        resultExample: "qsub normally returns a job identifier such as 123456.server",
        commands: Object.freeze([
            Object.freeze({ id: "submit", label: "Submit", command: "qsub converted.pbs" }),
            Object.freeze({ id: "jobs", label: "Check my jobs", command: 'qstat -u "$USER"' }),
            Object.freeze({ id: "details", label: "Job details", command: "qstat -f <JOB_ID>" }),
            Object.freeze({ id: "cancel", label: "Cancel job", command: "qdel <JOB_ID>" }),
            Object.freeze({ id: "output", label: "Watch output", command: "tail -f <OUTPUT_FILE>" })
        ]),
        advanced: Object.freeze([
            Object.freeze({ id: "queues", label: "Queues", command: "qstat -Q" }),
            Object.freeze({ id: "nodes", label: "Node information", command: "pbsnodes -a" }),
            Object.freeze({ id: "history", label: "Finished / historical jobs", command: "qstat -x" }),
            Object.freeze({ id: "arrays", label: "Array jobs", command: "qstat -t <JOB_ID>" })
        ])
    }),
    slurm: Object.freeze({
        id: "slurm",
        title: "How to run this Slurm job",
        subtitle: "Slurm",
        filename: "converted.slurm",
        resultExample: "sbatch normally returns a message such as: Submitted batch job 123456",
        commands: Object.freeze([
            Object.freeze({ id: "submit", label: "Submit", command: "sbatch converted.slurm" }),
            Object.freeze({ id: "jobs", label: "Check my jobs", command: "squeue --me" }),
            Object.freeze({ id: "details", label: "Job details", command: "scontrol show job <JOB_ID>" }),
            Object.freeze({ id: "cancel", label: "Cancel job", command: "scancel <JOB_ID>" }),
            Object.freeze({ id: "output", label: "Watch output", command: "tail -f <OUTPUT_FILE>" })
        ]),
        advanced: Object.freeze([
            Object.freeze({ id: "partitions", label: "Partitions / nodes", command: "sinfo" }),
            Object.freeze({ id: "accounting", label: "Accounting / history", command: "sacct -j <JOB_ID>" }),
            Object.freeze({ id: "statistics", label: "Running job statistics", command: "sstat -j <JOB_ID>" }),
            Object.freeze({ id: "arrays", label: "Array jobs", command: "squeue -j <ARRAY_JOB_ID>" })
        ])
    })
});

export function getCommandHelp(scheduler) {
    return SCHEDULER_COMMAND_HELP[scheduler] ?? null;
}

export function commandHelperPlan(targetScheduler = "slurm") {
    return ["pbs", "slurm"].map((scheduler) => ({
        ...getCommandHelp(scheduler),
        isTarget: scheduler === targetScheduler
    }));
}
