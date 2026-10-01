import test from "node:test";
import assert from "node:assert/strict";
import { parseSlurm } from "../../../public/assets/js/schedulers/slurm/parser.js";

test("Slurm mail events map to neutral events including scheduler-only values", () => {
    const { job } = parseSlurm("#!/bin/bash\n#SBATCH --mail-type=BEGIN,END,FAIL,ARRAY_TASKS,REQUEUE,STAGE_OUT,INVALID_DEPEND\necho test");
    assert.deepEqual([...job.notifications.events].sort(), [
        "array",
        "begin",
        "end",
        "fail",
        "invalid_dependency",
        "requeue",
        "stage_out"
    ]);
});

test("portable Slurm dependencies parse structurally", () => {
    const { job } = parseSlurm("#!/bin/bash\n#SBATCH --dependency=after:1,afterok:2:3,afterany:4,afternotok:5\necho test");
    assert.deepEqual(job.dependencies.map((dependency) => dependency.type), ["after", "afterok", "afterany", "afternotok"]);
});

test("Slurm OR dependencies remain unsupported for review", () => {
    const { job } = parseSlurm("#!/bin/bash\n#SBATCH --dependency=afterok:1?afterany:2\necho test");
    assert.equal(job.dependencies.length, 0);
    assert(job.unsupported.some((entry) => entry.directive.includes("--dependency=afterok:1?afterany:2")));
});

test("Slurm array variants parse while malformed expressions are preserved", () => {
    for (const expression of ["5", "0-9", "1-10:2", "1-10%3", "1-10:2%3", "1-10,20-30"]) {
        const { job } = parseSlurm(`#!/bin/bash\n#SBATCH --array=${expression}\necho test`);
        assert.equal(job.array.expression, expression);
    }

    for (const expression of ["a-b", "1-10%foo", "10-1", "1-10:0"]) {
        const { job } = parseSlurm(`#!/bin/bash\n#SBATCH --array=${expression}\necho test`);
        assert.equal(job.array, null, expression);
        assert(job.unsupported.length > 0, expression);
    }
});

test("malformed Slurm numeric, memory and GPU options are preserved", () => {
    const { job, diagnostics } = parseSlurm(`#!/bin/bash
#SBATCH --nodes=foo
#SBATCH --ntasks=bar
#SBATCH --cpus-per-task=x
#SBATCH --mem=
#SBATCH --gpus=banana
#SBATCH --gres=gpu:banana,license:matlab:1
#SBATCH --time=banana
echo test`);

    assert.equal(job.resources.nodes, null);
    assert.equal(job.resources.tasks, null);
    assert.equal(job.resources.cpusPerTask, null);
    assert.equal(job.resources.gpus.length, 0);
    assert(job.unsupported.length >= 6);
    assert(diagnostics.some((item) => item.code === "SLURM_MEMORY_INVALID"));
    assert(diagnostics.some((item) => item.code === "SLURM_TIME_INVALID"));
});
