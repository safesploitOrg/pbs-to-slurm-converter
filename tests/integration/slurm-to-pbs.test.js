import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { convert } from "../../public/assets/js/core/converter.js";

const basic = fs.readFileSync(new URL("../fixtures/slurm/basic.slurm", import.meta.url), "utf8");

test("Slurm converts to modern OpenPBS select syntax", () => {
    const result = convert({
        input: basic,
        sourceScheduler: "slurm",
        targetScheduler: "pbs",
        targetDialect: "openpbs"
    });

    assert.match(result.output, /#PBS -N research-job/);
    assert.match(result.output, /#PBS -q batch/);
    assert.match(result.output, /#PBS -A science/);
    assert.match(result.output, /#PBS -l select=2:ncpus=8:mpiprocs=4:ompthreads=2:mem=32gb:ngpus=1/);
    assert.match(result.output, /#PBS -l walltime=25:30:00/);
    assert.match(result.output, /#PBS -l place=exclhost/);
    assert.match(result.output, /#PBS -m bea|#PBS -m abe|#PBS -m bae|#PBS -m aeb|#PBS -m eab|#PBS -m eba/);
    assert.match(result.output, /#PBS -J 1-20%4/);
    assert.match(result.output, /cd \$PBS_O_WORKDIR/);
});

test("Slurm can target TORQUE nodes/ppn syntax", () => {
    const result = convert({
        input: basic,
        sourceScheduler: "slurm",
        targetScheduler: "pbs",
        targetDialect: "torque"
    });
    assert.match(result.output, /#PBS -l nodes=2:ppn=4:gpus=1/);
    assert.match(result.output, /#PBS -t 1-20%4/);
});

test("Slurm QOS is retained as a review comment in PBS output", () => {
    const result = convert({
        input: "#!/bin/bash\n#SBATCH --qos=gold\necho test",
        sourceScheduler: "slurm",
        targetScheduler: "pbs"
    });
    assert.match(result.output, /REVIEW: source SLURM directive preserved: #SBATCH --qos=gold/);
});

test("Slurm OR dependencies are not guessed into PBS", () => {
    const result = convert({
        input: "#!/bin/bash\n#SBATCH --dependency=afterok:10?afterany:20\necho test",
        sourceScheduler: "slurm",
        targetScheduler: "pbs"
    });
    assert.match(result.output, /REVIEW: source SLURM directive preserved/);
});

test("Slurm runtime launcher is preserved but flagged for PBS review", () => {
    const result = convert({
        input: "#!/bin/bash\n#SBATCH --nodes=1\nsrun hostname",
        sourceScheduler: "slurm",
        targetScheduler: "pbs"
    });
    assert.match(result.output, /srun hostname/);
    assert.match(result.output, /REVIEW: Slurm srun command is preserved/);
    assert(result.warnings.some((message) => message.includes("Slurm srun command")));
});
