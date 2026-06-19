import assert from "assert";

// ============================================================================
// Pure converter functions (extracted from public/assets/js/converter.js)
// These are tested in isolation to ensure correctness
// ============================================================================

function normaliseWalltime(value) {
    const parts = value.trim().split(":").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return value.trim();
    }

    const [hours, minutes, seconds] = parts;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
        return `${days}-${String(remainingHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseNodeRequest(value) {
    const nodesMatch = value.match(/nodes=(\d+)/);
    const ppnMatch = value.match(/ppn=(\d+)/);

    if (!nodesMatch) {
        return [];
    }

    const nodes = Number(nodesMatch[1]);
    const ppn = ppnMatch ? Number(ppnMatch[1]) : 1;
    const ntasks = nodes * ppn;

    return [`#SBATCH -N ${nodes}`, `#SBATCH -n ${ntasks}`];
}

function parseSelectRequest(value) {
    const selectMatch = value.match(/select=(\d+)/);
    const ncpusMatch = value.match(/ncpus=(\d+)/);
    const mpiprocsMatch = value.match(/mpiprocs=(\d+)/);
    const ompthreadsMatch = value.match(/ompthreads=(\d+)/);
    const ngpusMatch = value.match(/(?:ngpus|gpu|gpus)=(\d+)/);

    if (!selectMatch) {
        return [];
    }

    const output = [`#SBATCH --nodes=${selectMatch[1]}`];

    if (mpiprocsMatch) {
        output.push(`#SBATCH --ntasks-per-node=${mpiprocsMatch[1]}`);
    }

    if (ompthreadsMatch) {
        output.push(`#SBATCH --cpus-per-task=${ompthreadsMatch[1]}`);
    } else if (ncpusMatch && !mpiprocsMatch) {
        output.push(`#SBATCH --cpus-per-task=${ncpusMatch[1]}`);
    }

    if (ngpusMatch) {
        output.push(`#SBATCH --gpus=${ngpusMatch[1]}`);
    }

    return output;
}

function mapMailType(value) {
    const cleanValue = value.trim().toLowerCase();

    if (cleanValue === "n") {
        return "NONE";
    }

    if (cleanValue.includes("a") && cleanValue.includes("b") && cleanValue.includes("e")) {
        return "ALL";
    }

    const types = [];

    if (cleanValue.includes("b")) {
        types.push("BEGIN");
    }

    if (cleanValue.includes("e")) {
        types.push("END");
    }

    if (cleanValue.includes("a")) {
        types.push("FAIL");
    }

    return types.length > 0 ? types.join(",") : cleanValue.toUpperCase();
}

function convertDependency(value) {
    return value.replace(/^depend=/, "");
}

// ============================================================================
// Test Suite
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✓ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`✗ ${description}`);
        console.error(`  ${error.message}`);
        testsFailed++;
    }
}

// Tests for normaliseWalltime
console.log("\n=== Walltime Normalization ===");

test("normaliseWalltime: converts HH:MM:SS to formatted time", () => {
    assert.strictEqual(normaliseWalltime("10:30:45"), "10:30:45");
});

test("normaliseWalltime: converts 25+ hours to day format", () => {
    assert.strictEqual(normaliseWalltime("25:15:30"), "1-01:15:30");
});

test("normaliseWalltime: converts 48+ hours to multiple days", () => {
    assert.strictEqual(normaliseWalltime("72:00:00"), "3-00:00:00");
});

test("normaliseWalltime: pads with leading zeros", () => {
    assert.strictEqual(normaliseWalltime("5:5:5"), "05:05:05");
});

test("normaliseWalltime: handles invalid input gracefully", () => {
    assert.strictEqual(normaliseWalltime("invalid"), "invalid");
});

// Tests for parseNodeRequest
console.log("\n=== Node Request Parsing ===");

test("parseNodeRequest: parses nodes and ppn", () => {
    const result = parseNodeRequest("nodes=2:ppn=8");
    assert.deepStrictEqual(result, ["#SBATCH -N 2", "#SBATCH -n 16"]);
});

test("parseNodeRequest: defaults ppn to 1 if not specified", () => {
    const result = parseNodeRequest("nodes=4");
    assert.deepStrictEqual(result, ["#SBATCH -N 4", "#SBATCH -n 4"]);
});

test("parseNodeRequest: returns empty array for invalid input", () => {
    assert.deepStrictEqual(parseNodeRequest("invalid"), []);
});

// Tests for parseSelectRequest
console.log("\n=== Select Statement Parsing ===");

test("parseSelectRequest: parses basic select statement", () => {
    const result = parseSelectRequest("select=2");
    assert.deepStrictEqual(result, ["#SBATCH --nodes=2"]);
});

test("parseSelectRequest: parses select with mpiprocs", () => {
    const result = parseSelectRequest("select=4:mpiprocs=8");
    assert.deepStrictEqual(result, [
        "#SBATCH --nodes=4",
        "#SBATCH --ntasks-per-node=8"
    ]);
});

test("parseSelectRequest: parses select with ompthreads", () => {
    const result = parseSelectRequest("select=2:ompthreads=4");
    assert.deepStrictEqual(result, [
        "#SBATCH --nodes=2",
        "#SBATCH --cpus-per-task=4"
    ]);
});

test("parseSelectRequest: parses select with ncpus (no mpiprocs)", () => {
    const result = parseSelectRequest("select=3:ncpus=16");
    assert.deepStrictEqual(result, [
        "#SBATCH --nodes=3",
        "#SBATCH --cpus-per-task=16"
    ]);
});

test("parseSelectRequest: parses select with GPU requests", () => {
    const result = parseSelectRequest("select=2:ngpus=2");
    assert.deepStrictEqual(result, [
        "#SBATCH --nodes=2",
        "#SBATCH --gpus=2"
    ]);
});

test("parseSelectRequest: parses complex select statement", () => {
    const result = parseSelectRequest("select=4:mpiprocs=16:ompthreads=2:ngpus=4");
    assert.deepStrictEqual(result, [
        "#SBATCH --nodes=4",
        "#SBATCH --ntasks-per-node=16",
        "#SBATCH --cpus-per-task=2",
        "#SBATCH --gpus=4"
    ]);
});

test("parseSelectRequest: returns empty array for invalid input", () => {
    assert.deepStrictEqual(parseSelectRequest("invalid"), []);
});

// Tests for mapMailType
console.log("\n=== Mail Type Mapping ===");

test("mapMailType: converts 'n' to NONE", () => {
    assert.strictEqual(mapMailType("n"), "NONE");
});

test("mapMailType: converts 'abe' to ALL", () => {
    assert.strictEqual(mapMailType("abe"), "ALL");
});

test("mapMailType: converts 'b' to BEGIN", () => {
    assert.strictEqual(mapMailType("b"), "BEGIN");
});

test("mapMailType: converts 'e' to END", () => {
    assert.strictEqual(mapMailType("e"), "END");
});

test("mapMailType: converts 'a' to FAIL", () => {
    assert.strictEqual(mapMailType("a"), "FAIL");
});

test("mapMailType: combines multiple types", () => {
    assert.strictEqual(mapMailType("be"), "BEGIN,END");
});

test("mapMailType: handles mixed case", () => {
    assert.strictEqual(mapMailType("ABE"), "ALL");
});

// Tests for convertDependency
console.log("\n=== Dependency Conversion ===");

test("convertDependency: removes depend= prefix", () => {
    assert.strictEqual(
        convertDependency("depend=afterok:12345"),
        "afterok:12345"
    );
});

test("convertDependency: preserves multiple dependencies", () => {
    assert.strictEqual(
        convertDependency("depend=afterok:12345:afterok:67890"),
        "afterok:12345:afterok:67890"
    );
});

// ============================================================================
// Test Summary
// ============================================================================

console.log("\n" + "=".repeat(40));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log("=".repeat(40));

if (testsFailed > 0) {
    process.exit(1);
}

console.log("\n✓ All tests passed!");
process.exit(0);
