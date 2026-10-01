const MEMORY_FACTORS = Object.freeze({
    b: 1,
    kb: 1024,
    k: 1024,
    kib: 1024,
    mb: 1024 ** 2,
    m: 1024 ** 2,
    mib: 1024 ** 2,
    gb: 1024 ** 3,
    g: 1024 ** 3,
    gib: 1024 ** 3,
    tb: 1024 ** 4,
    t: 1024 ** 4,
    tib: 1024 ** 4
});

export function normaliseLineEndings(value) {
    return String(value ?? "").replace(/\r\n?/g, "\n");
}

export function parsePbsDuration(value) {
    const clean = String(value ?? "").trim();
    const match = clean.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
    if (!match) {
        return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);

    if (minutes > 59 || seconds > 59) {
        return null;
    }

    return (hours * 3600) + (minutes * 60) + seconds;
}

export function parseSlurmDuration(value) {
    const clean = String(value ?? "").trim();

    if (/^\d+$/.test(clean)) {
        return Number(clean) * 60;
    }

    const dayMatch = clean.match(/^(\d+)-(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (dayMatch) {
        const days = Number(dayMatch[1]);
        const hours = Number(dayMatch[2]);
        const minutes = Number(dayMatch[3]);
        const seconds = Number(dayMatch[4] ?? 0);
        if (hours > 23 || minutes > 59 || seconds > 59) {
            return null;
        }
        return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
    }

    const hmsMatch = clean.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    if (hmsMatch) {
        const hours = Number(hmsMatch[1]);
        const minutes = Number(hmsMatch[2]);
        const seconds = Number(hmsMatch[3]);
        if (minutes > 59 || seconds > 59) {
            return null;
        }
        return (hours * 3600) + (minutes * 60) + seconds;
    }

    const hmMatch = clean.match(/^(\d{1,2}):(\d{1,2})$/);
    if (hmMatch) {
        const minutes = Number(hmMatch[1]);
        const seconds = Number(hmMatch[2]);
        if (seconds > 59) {
            return null;
        }
        return (minutes * 60) + seconds;
    }

    return null;
}

export function formatPbsDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return null;
    }

    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const remainingSeconds = total % 60;
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function formatSlurmDuration(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return null;
    }

    const total = Math.floor(seconds);
    const days = Math.floor(total / 86400);
    const remainder = total % 86400;
    const hours = Math.floor(remainder / 3600);
    const minutes = Math.floor((remainder % 3600) / 60);
    const remainingSeconds = remainder % 60;

    if (days > 0) {
        return `${days}-${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function parseMemory(value, defaultUnit = "b") {
    const clean = String(value ?? "").trim();
    const match = clean.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = (match[2] ?? defaultUnit).toLowerCase();
    const factor = MEMORY_FACTORS[unit];
    if (!factor) {
        return null;
    }

    return {
        bytes: Math.round(amount * factor),
        raw: clean
    };
}

export function formatMemoryForSlurm(bytes) {
    return formatMemory(bytes, [
        [1024 ** 4, "T"],
        [1024 ** 3, "G"],
        [1024 ** 2, "M"],
        [1024, "K"]
    ]);
}

export function formatMemoryForPbs(bytes) {
    return formatMemory(bytes, [
        [1024 ** 4, "tb"],
        [1024 ** 3, "gb"],
        [1024 ** 2, "mb"],
        [1024, "kb"]
    ]);
}

function formatMemory(bytes, units) {
    if (!Number.isFinite(bytes) || bytes < 0) {
        return null;
    }

    for (const [factor, suffix] of units) {
        if (bytes >= factor && bytes % factor === 0) {
            return `${bytes / factor}${suffix}`;
        }
    }

    return `${bytes}B`;
}

export function splitCsv(value) {
    return String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

export function parseArrayExpression(expression) {
    const raw = String(expression ?? "").trim();
    if (!raw) {
        return null;
    }

    const [rangePart, limitPart] = raw.split("%", 2);
    const ranges = rangePart.split(",").map((part) => {
        const match = part.match(/^(\d+)(?:-(\d+)(?::(\d+))?)?$/);
        if (!match) {
            return { raw: part, valid: false };
        }
        return {
            raw: part,
            valid: true,
            start: Number(match[1]),
            end: match[2] ? Number(match[2]) : Number(match[1]),
            step: match[3] ? Number(match[3]) : 1
        };
    });

    return {
        expression: raw,
        ranges,
        maxConcurrent: limitPart && /^\d+$/.test(limitPart) ? Number(limitPart) : null
    };
}

export function parsePbsStartTime(value) {
    const clean = String(value ?? "").trim();
    const match = clean.match(/^(\d{12})(?:\.(\d{2}))?$/);
    if (!match) {
        return { raw: clean, iso: null, source: "pbs" };
    }

    const digits = match[1];
    const seconds = match[2] ?? "00";
    const year = digits.slice(0, 4);
    const month = digits.slice(4, 6);
    const day = digits.slice(6, 8);
    const hour = digits.slice(8, 10);
    const minute = digits.slice(10, 12);

    return {
        raw: clean,
        iso: `${year}-${month}-${day}T${hour}:${minute}:${seconds}`,
        source: "pbs"
    };
}

export function parseSlurmStartTime(value) {
    const clean = String(value ?? "").trim();
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
    return {
        raw: clean,
        iso: match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] ?? "00"}` : null,
        source: "slurm"
    };
}

export function formatPbsStartTime(startTime) {
    if (!startTime?.iso) {
        return null;
    }

    const match = startTime.iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) {
        return null;
    }

    return `${match[1]}${match[2]}${match[3]}${match[4]}${match[5]}.${match[6]}`;
}

export function formatSlurmStartTime(startTime) {
    return startTime?.iso ?? null;
}

export function unquote(value) {
    const clean = String(value ?? "").trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        return clean.slice(1, -1);
    }
    return clean;
}
