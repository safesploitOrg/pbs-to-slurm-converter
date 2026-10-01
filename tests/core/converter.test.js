import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { convert } from "../../public/assets/js/core/converter.js";
import { APP_VERSION } from "../../public/assets/js/core/version.js";

test("browser version matches package version", () => {
    const pkg = JSON.parse(fs.readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    assert.equal(APP_VERSION, pkg.version);
});

test("empty input produces empty output", () => {
    const result = convert({ input: "", sourceScheduler: "pbs", targetScheduler: "slurm" });
    assert.equal(result.output, "");
    assert.equal(result.job, null);
});

test("common PBS environment variables translate to Slurm", () => {
    const result = convert({
        input: "#!/bin/bash\necho $PBS_JOBID $PBS_JOBNAME $PBS_O_WORKDIR $PBS_ARRAY_INDEX",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.match(result.output, /\$SLURM_JOB_ID/);
    assert.match(result.output, /\$SLURM_JOB_NAME/);
    assert.match(result.output, /\$SLURM_SUBMIT_DIR/);
    assert.match(result.output, /\$SLURM_ARRAY_TASK_ID/);
});

test("PBS_NODEFILE is preserved rather than incorrectly mapped", () => {
    const result = convert({
        input: "#!/bin/bash\ncat $PBS_NODEFILE",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.match(result.output, /\$PBS_NODEFILE/);
    assert(result.warnings.some((message) => message.includes("PBS_NODEFILE has no direct SLURM")));
});
