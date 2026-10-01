import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSlurm } from "../../../public/assets/js/schedulers/slurm/parser.js";

const basic = fs.readFileSync(new URL("../../fixtures/slurm/basic.slurm", import.meta.url), "utf8");

test("Slurm parser creates a scheduler-neutral model", () => {
    const { job } = parseSlurm(basic);
    assert.equal(job.job.name, "research-job");
    assert.equal(job.resources.nodes, 2);
    assert.equal(job.resources.tasksPerNode, 4);
    assert.equal(job.resources.cpusPerTask, 2);
    assert.equal(job.resources.memory[0].scope, "node");
    assert.equal(job.resources.gpus[0].scope, "node");
    assert.equal(job.resources.exclusive, true);
    assert.deepEqual(job.notifications.events.sort(), ["begin", "end", "fail"]);
});

test("Slurm ALL mail type does not collapse to a PBS-style abe abstraction", () => {
    const { job } = parseSlurm("#!/bin/bash\n#SBATCH --mail-type=ALL\necho test");
    assert(job.notifications.events.includes("requeue"));
    assert(job.notifications.events.includes("stage_out"));
});

test("site-specific Slurm options are preserved for review", () => {
    const { job, diagnostics } = parseSlurm("#!/bin/bash\n#SBATCH --qos=gold\necho test");
    assert.equal(job.unsupported.length, 1);
    assert.match(job.unsupported[0].directive, /--qos=gold/);
    assert(diagnostics.some((item) => item.code === "SLURM_UNSUPPORTED_DIRECTIVE"));
});

test("late SBATCH directives are not parsed as active options", () => {
    const { job, diagnostics } = parseSlurm("#!/bin/bash\necho start\n#SBATCH --job-name=ignored");
    assert.equal(job.job.name, null);
    assert(job.script.body.includes("#SBATCH --job-name=ignored"));
    assert(diagnostics.some((item) => item.code === "SLURM_LATE_DIRECTIVE"));
});
