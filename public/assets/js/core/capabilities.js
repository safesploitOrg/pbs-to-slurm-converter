export const CAPABILITY_LEVEL = Object.freeze({
    EXACT: "exact",
    BEST_EFFORT: "best-effort",
    PRESERVE: "preserve"
});

export const CAPABILITIES = Object.freeze({
    JOB_NAME: "job-name",
    QUEUE: "queue-partition",
    ACCOUNT: "accounting",
    START_TIME: "start-time",
    HOLD: "hold",
    WALLTIME: "walltime",
    RESOURCES: "resources",
    MEMORY: "memory",
    GPU: "gpu",
    OUTPUT: "output",
    MAIL: "mail",
    ARRAY: "array",
    ENVIRONMENT: "environment",
    DEPENDENCY: "dependency",
    REQUEUE: "requeue",
    WORKING_DIRECTORY: "working-directory"
});
