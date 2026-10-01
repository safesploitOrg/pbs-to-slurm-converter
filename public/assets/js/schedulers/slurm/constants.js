export const SLURM_MAIL_TO_EVENT = Object.freeze({
    BEGIN: "begin",
    END: "end",
    FAIL: "fail",
    ARRAY_TASKS: "array",
    REQUEUE: "requeue",
    STAGE_OUT: "stage_out",
    INVALID_DEPEND: "invalid_dependency"
});

export const SLURM_EVENT_TO_MAIL = Object.freeze({
    begin: "BEGIN",
    end: "END",
    fail: "FAIL",
    array: "ARRAY_TASKS",
    requeue: "REQUEUE",
    stage_out: "STAGE_OUT",
    invalid_dependency: "INVALID_DEPEND"
});
