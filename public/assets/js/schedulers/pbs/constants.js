export const PBS_DIALECT = Object.freeze({
    OPENPBS: "openpbs",
    PBSPRO: "pbspro",
    TORQUE: "torque"
});

export const PBS_MAIL_TO_EVENTS = Object.freeze({
    b: "begin",
    e: "end",
    a: "fail",
    j: "array"
});

export const PBS_EVENT_TO_MAIL = Object.freeze({
    begin: "b",
    end: "e",
    fail: "a",
    array: "j"
});
