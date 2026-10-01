export function parseGpuOption(value, scope) {
    const clean = String(value ?? "").trim();
    const parts = clean.split(":");
    const countText = parts.at(-1);
    const count = /^\d+$/.test(countText) ? Number(countText) : null;
    const type = parts.length > 1 ? parts.slice(0, -1).join(":") : null;
    return { count, scope, type: type || null, raw: clean };
}

export function parseGpuGres(value) {
    const entries = String(value ?? "").split(",");
    const gpus = [];

    for (const entry of entries) {
        const clean = entry.trim();
        if (!clean.startsWith("gpu:")) {
            continue;
        }
        const parts = clean.split(":");
        if (parts.length === 2 && /^\d+$/.test(parts[1])) {
            gpus.push({ count: Number(parts[1]), scope: "node", type: null, raw: clean });
        } else if (parts.length >= 3 && /^\d+$/.test(parts.at(-1))) {
            gpus.push({
                count: Number(parts.at(-1)),
                scope: "node",
                type: parts.slice(1, -1).join(":"),
                raw: clean
            });
        }
    }

    return gpus;
}
