import test from "node:test";
import assert from "node:assert/strict";
import { createJobModel } from "../../public/assets/js/core/job-model.js";
import { analyseScriptForTarget } from "../../public/assets/js/core/script-analysis.js";

test("scheduler-coupled launchers are flagged once and preserved", () => {
    const job = createJobModel();
    const diagnostics = [];
    job.script.body = ["srun hostname", "srun ./app"];
    analyseScriptForTarget(job, "pbs", diagnostics);
    assert.equal(diagnostics.filter((item) => item.code === "PBS_SRUN_REVIEW").length, 1);
    assert.equal(job.script.body[0], "srun hostname");
});

test("comments and quoted documentation do not trigger launcher warnings", () => {
    const job = createJobModel();
    const diagnostics = [];
    job.script.body = ["# srun hostname", "echo \"use srun to launch\""];
    analyseScriptForTarget(job, "pbs", diagnostics);
    assert.equal(diagnostics.length, 0);
});

test("PBS and MPI launchers are flagged when targeting Slurm", () => {
    const job = createJobModel();
    const diagnostics = [];
    job.script.body = ["pbsdsh hostname", "mpiexec -n 4 ./app"];
    analyseScriptForTarget(job, "slurm", diagnostics);
    assert(diagnostics.some((item) => item.code === "SLURM_PBSDSH_REVIEW"));
    assert(diagnostics.some((item) => item.code === "SLURM_MPI_LAUNCHER_REVIEW"));
});
