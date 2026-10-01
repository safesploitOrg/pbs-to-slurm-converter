import test from "node:test";
import assert from "node:assert/strict";
import {
    EXAMPLE_DEFINITIONS,
    getExampleById,
    getExampleGroups,
    getExamplesForScheduler
} from "../../public/assets/js/examples/index.js";

test("recommended examples appear first and are not duplicated in category groups", () => {
    for (const scheduler of ["pbs", "slurm"]) {
        const groups = getExampleGroups(scheduler);
        assert.equal(groups[0].id, "recommended");
        assert.equal(groups[0].label, "★ Recommended");
        assert.deepEqual(
            groups[0].examples.map((example) => example.id),
            ["basic-job", "send-email", "mpi-job", "gpu-job"]
        );

        const ids = groups.flatMap((group) => group.examples.map((example) => example.id));
        assert.equal(new Set(ids).size, ids.length);
    }
});

test("all example definitions have unique IDs and known categories", () => {
    const ids = EXAMPLE_DEFINITIONS.map((example) => example.id);
    assert.equal(new Set(ids).size, ids.length);
    assert(EXAMPLE_DEFINITIONS.every((example) => example.category));
});

test("source scheduler determines the script loaded for a conceptual example", () => {
    const pbs = getExampleById("pbs", "send-email");
    const slurm = getExampleById("slurm", "send-email");

    assert.match(pbs.script, /^#!\/bin\/bash/m);
    assert.match(pbs.script, /#PBS -M user@example\.com/);
    assert.match(slurm.script, /#SBATCH --mail-user=user@example\.com/);
    assert.notEqual(pbs.script, slurm.script);
});

test("scheduler-specific examples are filtered cleanly", () => {
    assert(getExamplesForScheduler("pbs").some((example) => example.id === "legacy-torque"));
    assert.equal(getExampleById("slurm", "legacy-torque"), null);
});
