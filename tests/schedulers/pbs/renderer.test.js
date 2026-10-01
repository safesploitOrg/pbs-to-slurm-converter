import test from "node:test";
import assert from "node:assert/strict";
import { createJobModel } from "../../../public/assets/js/core/job-model.js";
import { renderPbs } from "../../../public/assets/js/schedulers/pbs/renderer.js";

function baseSlurmJob() {
    const job = createJobModel();
    job.source.scheduler = "slurm";
    job.source.dialect = "slurm";
    job.script.shebang = "#!/bin/bash";
    job.script.body = ["./application"];
    return job;
}

test("OpenPBS renderer emits modern select syntax from neutral topology", () => {
    const job = baseSlurmJob();
    job.job.name = "render-test";
    job.job.queue = "batch";
    job.job.account = "science";
    job.resources.nodes = 2;
    job.resources.tasksPerNode = 4;
    job.resources.cpusPerTask = 2;
    job.resources.memory.push({ kind: "physical", scope: "node", bytes: 32 * 1024 ** 3, sourceKind: "mem" });
    job.resources.gpus.push({ count: 1, scope: "node", type: null, raw: "1" });
    job.resources.walltimeSeconds = 3600;
    job.resources.exclusive = true;

    const diagnostics = [];
    const { output } = renderPbs(job, { targetDialect: "openpbs", diagnostics });

    assert.match(output, /#PBS -N render-test/);
    assert.match(output, /#PBS -q batch/);
    assert.match(output, /#PBS -A science/);
    assert.match(output, /#PBS -l select=2:ncpus=8:mpiprocs=4:ompthreads=2:mem=32gb:ngpus=1/);
    assert.match(output, /#PBS -l place=exclhost/);
    assert.match(output, /#PBS -l walltime=1:00:00/);
});

test("PBS Professional renderer uses the same modern resource style", () => {
    const job = baseSlurmJob();
    job.resources.nodes = 1;
    job.resources.tasksPerNode = 8;
    const { output } = renderPbs(job, { targetDialect: "pbspro", diagnostics: [] });
    assert.match(output, /#PBS -l select=1:ncpus=8:mpiprocs=8/);
    assert.doesNotMatch(output, /nodes=1:ppn=/);
});

test("TORQUE renderer uses legacy nodes/ppn and -t arrays", () => {
    const job = baseSlurmJob();
    job.resources.nodes = 2;
    job.resources.tasksPerNode = 8;
    job.resources.gpus.push({ count: 1, scope: "node", type: null, raw: "1" });
    job.array = { expression: "1-10%2", ranges: [{ valid: true, start: 1, end: 10, step: 1 }], maxConcurrent: 2 };

    const { output } = renderPbs(job, { targetDialect: "torque", diagnostics: [] });
    assert.match(output, /#PBS -l nodes=2:ppn=8:gpus=1/);
    assert.match(output, /#PBS -t 1-10%2/);
});

test("PBS renderer preserves unsupported Slurm mail events and memory-per-GPU as review comments", () => {
    const job = baseSlurmJob();
    job.notifications.email = "user@example.com";
    job.notifications.events = ["begin", "requeue", "stage_out"];
    job.resources.memory.push({ kind: "physical", scope: "gpu", bytes: 8 * 1024 ** 3, sourceKind: "mem-per-gpu" });

    const diagnostics = [];
    const { output } = renderPbs(job, { diagnostics });
    assert.match(output, /#PBS -M user@example.com/);
    assert.match(output, /#PBS -m b/);
    assert.match(output, /REVIEW: Slurm mail events not represented in PBS: requeue, stage_out/);
    assert.match(output, /REVIEW: Slurm memory-per-GPU request 8gb has no portable PBS equivalent/);
    assert(diagnostics.some((item) => item.code === "PBS_MAIL_EVENTS_UNSUPPORTED"));
    assert(diagnostics.some((item) => item.code === "PBS_MEM_PER_GPU_UNSUPPORTED"));
});

test("multi-range Slurm arrays are not emitted as active PBS directives", () => {
    const job = baseSlurmJob();
    job.array = {
        expression: "1-10,20-30",
        ranges: [
            { valid: true, start: 1, end: 10, step: 1 },
            { valid: true, start: 20, end: 30, step: 1 }
        ],
        maxConcurrent: null
    };
    const diagnostics = [];
    const { output } = renderPbs(job, { diagnostics });
    assert.doesNotMatch(output, /#PBS -J 1-10,20-30/);
    assert.match(output, /REVIEW: array expression '1-10,20-30'/);
    assert(diagnostics.some((item) => item.code === "PBS_ARRAY_MULTI_RANGE"));
});

test("typed and socket-scoped Slurm GPUs are never silently flattened into PBS", () => {
    const job = baseSlurmJob();
    job.resources.nodes = 1;
    job.resources.tasksPerNode = 2;
    job.resources.gpus.push(
        { count: 2, scope: "node", type: "a100", raw: "a100:2" },
        { count: 1, scope: "socket", type: null, raw: "1" }
    );

    const diagnostics = [];
    const { output } = renderPbs(job, { diagnostics });
    assert.match(output, /#PBS -l select=1:ncpus=2:mpiprocs=2:ngpus=2/);
    assert.match(output, /REVIEW: Slurm GPU type information/);
    assert.match(output, /REVIEW: Slurm GPUs-per-socket request/);
    assert(diagnostics.some((item) => item.code === "PBS_GPU_TYPE_REVIEW"));
    assert(diagnostics.some((item) => item.code === "PBS_GPU_SOCKET_UNSUPPORTED"));
});
