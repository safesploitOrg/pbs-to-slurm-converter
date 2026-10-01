import test from "node:test";
import assert from "node:assert/strict";
import { convert } from "../../public/assets/js/core/converter.js";
import { getExamplesForScheduler } from "../../public/assets/js/examples/index.js";

test("every PBS example converts through production code", () => {
    for (const example of getExamplesForScheduler("pbs")) {
        const result = convert({
            input: example.script,
            sourceScheduler: "pbs",
            targetScheduler: "slurm"
        });
        assert(result.output.trim().length > 0, example.id);
        assert.match(result.output, /^#!\/bin\/bash/m, example.id);
    }
});

test("every Slurm example converts through production code", () => {
    for (const example of getExamplesForScheduler("slurm")) {
        const result = convert({
            input: example.script,
            sourceScheduler: "slurm",
            targetScheduler: "pbs",
            targetDialect: "openpbs"
        });
        assert(result.output.trim().length > 0, example.id);
        assert.match(result.output, /^#!\/bin\/bash/m, example.id);
    }
});

test("review-required examples exercise preservation diagnostics", () => {
    for (const scheduler of ["pbs", "slurm"]) {
        const example = getExamplesForScheduler(scheduler).find((item) => item.id === "review-required");
        const result = convert({
            input: example.script,
            sourceScheduler: scheduler,
            targetScheduler: scheduler === "pbs" ? "slurm" : "pbs"
        });
        assert(result.warnings.length > 0, scheduler);
        assert.match(result.output, /REVIEW:/, scheduler);
    }
});
