import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { convert } from "../../public/assets/js/core/converter.js";

const basic = fs.readFileSync(new URL("../fixtures/pbs/basic.pbs", import.meta.url), "utf8");
const torque = fs.readFileSync(new URL("../fixtures/pbs/legacy-torque.pbs", import.meta.url), "utf8");

test("modern PBS converts to Slurm through the neutral model", () => {
    const result = convert({ input: basic, sourceScheduler: "pbs", targetScheduler: "slurm" });
    assert.match(result.output, /#SBATCH --job-name=research-job/);
    assert.match(result.output, /#SBATCH --partition=batch/);
    assert.match(result.output, /#SBATCH --account=science/);
    assert.match(result.output, /#SBATCH --nodes=2/);
    assert.match(result.output, /#SBATCH --ntasks-per-node=4/);
    assert.match(result.output, /#SBATCH --cpus-per-task=2/);
    assert.match(result.output, /#SBATCH --mem=32G/);
    assert.match(result.output, /#SBATCH --gpus-per-node=1/);
    assert.match(result.output, /#SBATCH --time=1-01:30:00/);
    assert.match(result.output, /#SBATCH --mail-type=BEGIN,END,FAIL/);
    assert.match(result.output, /#SBATCH --output=%x-%j\.out/);
    assert.doesNotMatch(result.output, /--mail-type=ALL/);
    assert.match(result.output, /cd \$SLURM_SUBMIT_DIR/);
});

test("legacy TORQUE nodes/ppn converts without duplicating a second PBS engine", () => {
    const result = convert({ input: torque, sourceScheduler: "pbs", targetScheduler: "slurm" });
    assert.match(result.output, /#SBATCH --nodes=3/);
    assert.match(result.output, /#SBATCH --ntasks-per-node=8/);
    assert.match(result.output, /#SBATCH --gpus-per-node=1/);
    assert.match(result.output, /#SBATCH --array=1-5/);
});

test("PBS group_list is not incorrectly converted to Slurm account", () => {
    const result = convert({
        input: "#!/bin/bash\n#PBS -W group_list=physics\necho test",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.doesNotMatch(result.output, /--account=physics/);
    assert.match(result.output, /REVIEW: PBS execution group 'physics'/);
});

test("heterogeneous select is preserved for review rather than guessed", () => {
    const result = convert({
        input: "#!/bin/bash\n#PBS -l select=1:ncpus=4+2:ncpus=16\necho test",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.match(result.output, /REVIEW: heterogeneous PBS select request/);
    assert(result.warnings.some((message) => message.includes("Heterogeneous PBS select chunks")));
});

test("MPI launcher is preserved but flagged for Slurm review", () => {
    const result = convert({
        input: "#!/bin/bash\n#PBS -l nodes=1:ppn=4\nmpiexec -n 4 ./app",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.match(result.output, /mpiexec -n 4 \.\/app/);
    assert.match(result.output, /REVIEW: MPI launcher was preserved/);
    assert(result.warnings.some((message) => message.includes("MPI launcher was preserved")));
});
