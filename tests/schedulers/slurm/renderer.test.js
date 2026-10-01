import test from "node:test";
import assert from "node:assert/strict";
import { createJobModel } from "../../../public/assets/js/core/job-model.js";
import { renderSlurm } from "../../../public/assets/js/schedulers/slurm/renderer.js";

function basePbsJob() {
    const job = createJobModel();
    job.source.scheduler = "pbs";
    job.source.dialect = "openpbs";
    job.script.shebang = "#!/bin/bash";
    job.script.body = ["./application"];
    return job;
}

test("Slurm renderer emits neutral topology, mail and dependencies", () => {
    const job = basePbsJob();
    job.job.name = "render-test";
    job.job.queue = "batch";
    job.job.account = "science";
    job.resources.nodes = 2;
    job.resources.tasksPerNode = 4;
    job.resources.cpusPerTask = 2;
    job.resources.walltimeSeconds = 3600;
    job.resources.gpus.push({ count: 1, scope: "node", type: "a100", raw: "a100:1" });
    job.notifications.email = "user@example.com";
    job.notifications.events = ["begin", "end", "fail"];
    job.dependencies = [{ type: "afterok", jobs: ["123", "456"], raw: "afterok:123:456" }];

    const { output } = renderSlurm(job, { diagnostics: [] });
    assert.match(output, /#SBATCH --job-name=render-test/);
    assert.match(output, /#SBATCH --partition=batch/);
    assert.match(output, /#SBATCH --account=science/);
    assert.match(output, /#SBATCH --nodes=2/);
    assert.match(output, /#SBATCH --ntasks-per-node=4/);
    assert.match(output, /#SBATCH --cpus-per-task=2/);
    assert.match(output, /#SBATCH --gpus-per-node=a100:1/);
    assert.match(output, /#SBATCH --mail-type=BEGIN,END,FAIL/);
    assert.match(output, /#SBATCH --dependency=afterok:123:456/);
});

test("homogeneous PBS chunks render into Slurm topology", () => {
    const job = basePbsJob();
    job.resources.chunks = [{
        count: 2,
        ncpus: 16,
        mpiprocs: 4,
        ompthreads: 4,
        memoryBytes: 64 * 1024 ** 3,
        virtualMemoryBytes: null,
        gpus: { count: 2, type: null },
        properties: {},
        raw: "2:ncpus=16:mpiprocs=4:ompthreads=4:mem=64gb:ngpus=2",
        valid: true
    }];
    job.resources.placement.arrangement = "scatter";

    const { output } = renderSlurm(job, { diagnostics: [] });
    assert.match(output, /#SBATCH --nodes=2/);
    assert.match(output, /#SBATCH --ntasks-per-node=4/);
    assert.match(output, /#SBATCH --cpus-per-task=4/);
    assert.match(output, /#SBATCH --mem=64G/);
    assert.match(output, /#SBATCH --gpus-per-node=2/);
});

test("invalid PBS select chunks are preserved for review instead of guessed", () => {
    const job = basePbsJob();
    job.resources.chunks = [{
        count: 1,
        ncpus: null,
        mpiprocs: null,
        ompthreads: null,
        memoryBytes: null,
        virtualMemoryBytes: null,
        gpus: null,
        properties: {},
        raw: "1:ncpus=banana",
        valid: false
    }];

    const diagnostics = [];
    const { output } = renderSlurm(job, { diagnostics });
    assert.match(output, /REVIEW: invalid PBS select request/);
    assert.doesNotMatch(output, /#SBATCH --nodes=/);
    assert(diagnostics.some((item) => item.code === "SLURM_INVALID_SELECT_REVIEW"));
});

test("PBS virtual and per-process memory produce explicit review semantics", () => {
    const job = basePbsJob();
    job.resources.memory.push(
        { kind: "physical", scope: "process", bytes: 4 * 1024 ** 3, sourceKind: "pmem" },
        { kind: "virtual", scope: "job", bytes: 16 * 1024 ** 3, sourceKind: "vmem" }
    );

    const diagnostics = [];
    const { output } = renderSlurm(job, { diagnostics });
    assert.match(output, /#SBATCH --mem-per-cpu=4G/);
    assert.match(output, /REVIEW: PBS vmem=16G has no direct Slurm virtual-memory request equivalent/);
    assert(diagnostics.some((item) => item.code === "SLURM_PMEM_APPROXIMATION"));
    assert(diagnostics.some((item) => item.code === "SLURM_VMEM_UNSUPPORTED"));
});

test("PBS chunk and legacy node properties are surfaced for Slurm review", () => {
    const selectJob = basePbsJob();
    selectJob.resources.chunks = [{
        count: 1,
        ncpus: 8,
        mpiprocs: 8,
        ompthreads: null,
        memoryBytes: null,
        virtualMemoryBytes: null,
        gpus: null,
        properties: { arch: "zen4" },
        raw: "1:ncpus=8:mpiprocs=8:arch=zen4",
        valid: true
    }];
    selectJob.resources.placement.arrangement = "scatter";
    const selectDiagnostics = [];
    const selectOutput = renderSlurm(selectJob, { diagnostics: selectDiagnostics }).output;
    assert.match(selectOutput, /REVIEW: PBS select properties require site-specific Slurm constraints\/features: arch=zen4/);
    assert(selectDiagnostics.some((item) => item.code === "SLURM_PBS_PROPERTIES_REVIEW"));

    const legacyJob = basePbsJob();
    legacyJob.resources.legacyNodes = {
        raw: "nodes=2:ppn=8:fast",
        segments: [{ count: 2, ppn: 8, gpus: null, properties: ["fast"], raw: "2:ppn=8:fast" }]
    };
    const legacyDiagnostics = [];
    const legacyOutput = renderSlurm(legacyJob, { diagnostics: legacyDiagnostics }).output;
    assert.match(legacyOutput, /REVIEW: legacy PBS\/TORQUE node properties require site-specific Slurm constraints\/features: fast/);
    assert(legacyDiagnostics.some((item) => item.code === "SLURM_LEGACY_PROPERTIES_REVIEW"));
});
