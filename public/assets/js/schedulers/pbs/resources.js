import { parseMemory } from "../../core/utils.js";
import { warning } from "../../core/diagnostics.js";

export function parseSelect(value, diagnostics, line) {
    const expression = String(value).replace(/^select=/, "").trim();
    const chunks = [];

    for (const rawChunk of expression.split("+")) {
        const parts = rawChunk.split(":").filter(Boolean);
        let count = 1;
        let index = 0;

        if (/^\d+$/.test(parts[0] ?? "")) {
            count = Number(parts[0]);
            index = 1;
        }

        const chunk = {
            count,
            ncpus: null,
            mpiprocs: null,
            ompthreads: null,
            memoryBytes: null,
            virtualMemoryBytes: null,
            gpus: null,
            properties: {},
            raw: rawChunk
        };

        for (const token of parts.slice(index)) {
            const [key, ...rest] = token.split("=");
            const tokenValue = rest.join("=");
            if (!tokenValue) {
                chunk.properties[key] = true;
                continue;
            }

            switch (key) {
                case "ncpus":
                    chunk.ncpus = toInteger(tokenValue);
                    break;
                case "mpiprocs":
                    chunk.mpiprocs = toInteger(tokenValue);
                    break;
                case "ompthreads":
                    chunk.ompthreads = toInteger(tokenValue);
                    break;
                case "mem":
                    chunk.memoryBytes = parseMemory(tokenValue)?.bytes ?? null;
                    break;
                case "vmem":
                    chunk.virtualMemoryBytes = parseMemory(tokenValue)?.bytes ?? null;
                    break;
                case "ngpus":
                case "gpus":
                case "gpu":
                    chunk.gpus = { count: toInteger(tokenValue), type: null };
                    break;
                default:
                    chunk.properties[key] = tokenValue;
                    break;
            }
        }

        chunks.push(chunk);
    }

    if (chunks.length > 1) {
        warning(
            diagnostics,
            "PBS_HETEROGENEOUS_SELECT",
            "Heterogeneous PBS select chunks were parsed; target scheduler rendering may require manual review.",
            { line, scheduler: "pbs" }
        );
    }

    return chunks;
}

export function parseLegacyNodes(value, diagnostics, line) {
    const expression = String(value).replace(/^nodes=/, "").trim();
    const segments = expression.split("+").map((rawSegment) => {
        const parts = rawSegment.split(":").filter(Boolean);
        let count = 1;
        let index = 0;
        if (/^\d+$/.test(parts[0] ?? "")) {
            count = Number(parts[0]);
            index = 1;
        }

        const segment = {
            count,
            ppn: null,
            gpus: null,
            properties: [],
            raw: rawSegment
        };

        for (const token of parts.slice(index)) {
            if (token.startsWith("ppn=")) {
                segment.ppn = toInteger(token.slice(4));
            } else if (/^(?:gpus?|ngpus)=/.test(token)) {
                segment.gpus = toInteger(token.split("=")[1]);
            } else {
                segment.properties.push(token);
            }
        }

        return segment;
    });

    warning(
        diagnostics,
        "PBS_LEGACY_NODES",
        "Legacy PBS/TORQUE nodes/ppn syntax was detected; conversion is best-effort because site semantics can differ.",
        { line, scheduler: "pbs" }
    );

    return { segments, raw: value };
}

export function parsePlace(value) {
    const expression = String(value).replace(/^place=/, "").trim();
    const tokens = expression.split(":").filter(Boolean);
    const placement = {
        arrangement: null,
        sharing: null,
        groupBy: null,
        raw: expression
    };

    for (const token of tokens) {
        if (["free", "pack", "scatter", "vscatter"].includes(token)) {
            placement.arrangement = token;
        } else if (["excl", "exclhost", "shared"].includes(token)) {
            placement.sharing = token;
        } else if (token.startsWith("group=")) {
            placement.groupBy = token.slice("group=".length);
        }
    }

    return placement;
}

function toInteger(value) {
    return /^\d+$/.test(String(value)) ? Number(value) : null;
}
