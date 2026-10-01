export const DIAGNOSTIC_SEVERITY = Object.freeze({
    INFO: "info",
    WARNING: "warning",
    ERROR: "error"
});

export function addDiagnostic(diagnostics, {
    code,
    message,
    severity = DIAGNOSTIC_SEVERITY.INFO,
    line = null,
    scheduler = null
}) {
    diagnostics.push({ code, message, severity, line, scheduler });
}

export function info(diagnostics, code, message, options = {}) {
    addDiagnostic(diagnostics, {
        ...options,
        code,
        message,
        severity: DIAGNOSTIC_SEVERITY.INFO
    });
}

export function warning(diagnostics, code, message, options = {}) {
    addDiagnostic(diagnostics, {
        ...options,
        code,
        message,
        severity: DIAGNOSTIC_SEVERITY.WARNING
    });
}

export function error(diagnostics, code, message, options = {}) {
    addDiagnostic(diagnostics, {
        ...options,
        code,
        message,
        severity: DIAGNOSTIC_SEVERITY.ERROR
    });
}

export function summariseDiagnostics(diagnostics) {
    return {
        summary: diagnostics
            .filter((item) => item.severity === DIAGNOSTIC_SEVERITY.INFO)
            .map(formatDiagnostic),
        warnings: diagnostics
            .filter((item) => item.severity !== DIAGNOSTIC_SEVERITY.INFO)
            .map(formatDiagnostic)
    };
}

export function formatDiagnostic(item) {
    const prefix = item.line ? `Line ${item.line}: ` : "";
    return `${prefix}${item.message}`;
}
