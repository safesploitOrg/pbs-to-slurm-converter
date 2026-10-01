import test from "node:test";
import assert from "node:assert/strict";
import { translateIoPath } from "../../public/assets/js/core/io-patterns.js";

test("PBS job ID/name/array filename intent maps to Slurm percent patterns", () => {
    const diagnostics = [];
    const result = translateIoPath(
        "$PBS_JOBNAME-$PBS_JOBID-$PBS_ARRAY_INDEX.out",
        "pbs",
        "slurm",
        diagnostics
    );
    assert.equal(result.value, "%x-%j-%a.out");
    assert.equal(result.safe, true);
    assert.equal(result.changed, true);
    assert(diagnostics.some((item) => item.code === "PBS_IO_VARIABLE_PATTERN"));
});

test("unknown shell variables in Slurm directive output paths are not emitted as safe", () => {
    const diagnostics = [];
    const result = translateIoPath("$HOME/$PBS_JOBID.out", "pbs", "slurm", diagnostics);
    assert.equal(result.safe, false);
    assert.match(result.value, /\$HOME\/\%j\.out/);
    assert(diagnostics.some((item) => item.code === "SLURM_IO_SHELL_VARIABLE"));
});

test("Slurm filename patterns are preserved for PBS review rather than invented", () => {
    for (const pattern of ["%j.out", "%x-%j.out", "%A_%a.out", "%J.out", "%N.out", "%%-%05j.out"]) {
        const diagnostics = [];
        const result = translateIoPath(pattern, "slurm", "pbs", diagnostics);
        assert.equal(result.safe, false, pattern);
        assert(diagnostics.some((item) => item.code === "PBS_IO_PATTERN_UNSUPPORTED"), pattern);
    }
});
