import test from "node:test";
import assert from "node:assert/strict";
import { translateEnvironmentVariables } from "../../public/assets/js/core/environment.js";

test("runtime environment variables translate in both directions", () => {
    const pbsDiagnostics = [];
    const toSlurm = translateEnvironmentVariables([
        "$PBS_JOBID $PBS_JOBNAME $PBS_O_WORKDIR $PBS_O_HOST $PBS_ARRAY_INDEX $PBS_QUEUE"
    ], "pbs", "slurm", pbsDiagnostics)[0];

    assert.equal(
        toSlurm,
        "$SLURM_JOB_ID $SLURM_JOB_NAME $SLURM_SUBMIT_DIR $SLURM_SUBMIT_HOST $SLURM_ARRAY_TASK_ID $SLURM_JOB_PARTITION"
    );

    const slurmDiagnostics = [];
    const toPbs = translateEnvironmentVariables([
        "$SLURM_JOB_ID $SLURM_JOB_NAME $SLURM_SUBMIT_DIR $SLURM_SUBMIT_HOST $SLURM_ARRAY_TASK_ID $SLURM_JOB_PARTITION"
    ], "slurm", "pbs", slurmDiagnostics)[0];

    assert.equal(
        toPbs,
        "$PBS_JOBID $PBS_JOBNAME $PBS_O_WORKDIR $PBS_O_HOST $PBS_ARRAY_INDEX $PBS_QUEUE"
    );
});

test("node file and node list variables remain distinct and generate review diagnostics", () => {
    const pbsDiagnostics = [];
    const fromPbs = translateEnvironmentVariables(["cat $PBS_NODEFILE"], "pbs", "slurm", pbsDiagnostics)[0];
    assert.equal(fromPbs, "cat $PBS_NODEFILE");
    assert(pbsDiagnostics.some((item) => item.code === "ENV_NO_EQUIVALENT"));

    const slurmDiagnostics = [];
    const fromSlurm = translateEnvironmentVariables(["echo $SLURM_JOB_NODELIST"], "slurm", "pbs", slurmDiagnostics)[0];
    assert.equal(fromSlurm, "echo $SLURM_JOB_NODELIST");
    assert(slurmDiagnostics.some((item) => item.code === "ENV_NO_EQUIVALENT"));
});
