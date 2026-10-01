import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parsePbs } from "../../../public/assets/js/schedulers/pbs/parser.js";

const basic = fs.readFileSync(new URL("../../fixtures/pbs/basic.pbs", import.meta.url), "utf8");
const torque = fs.readFileSync(new URL("../../fixtures/pbs/legacy-torque.pbs", import.meta.url), "utf8");

test("PBS parser creates a scheduler-neutral model for modern select syntax", () => {
    const { job } = parsePbs(basic);
    assert.equal(job.job.name, "research-job");
    assert.equal(job.job.account, "science");
    assert.equal(job.resources.chunks.length, 1);
    assert.equal(job.resources.chunks[0].count, 2);
    assert.equal(job.resources.chunks[0].ncpus, 8);
    assert.equal(job.resources.chunks[0].mpiprocs, 4);
    assert.equal(job.resources.chunks[0].ompthreads, 2);
    assert.equal(job.resources.chunks[0].gpus.count, 1);
    assert.equal(job.resources.placement.arrangement, "scatter");
    assert.equal(job.resources.exclusive, true);
    assert.deepEqual(job.notifications.events.sort(), ["begin", "end", "fail"]);
});

test("TORQUE syntax is detected without a separate converter", () => {
    const { job } = parsePbs(torque);
    assert.equal(job.source.dialect, "torque");
    assert.equal(job.resources.legacyNodes.segments[0].count, 3);
    assert.equal(job.resources.legacyNodes.segments[0].ppn, 8);
    assert.equal(job.array.expression, "1-5");
});

test("group_list remains execution-group metadata and not accounting", () => {
    const { job } = parsePbs("#!/bin/bash\n#PBS -W group_list=physics\necho test");
    assert.equal(job.job.group, "physics");
    assert.equal(job.job.account, null);
});

test("late PBS directives are not treated as active scheduler directives", () => {
    const { job, diagnostics } = parsePbs("#!/bin/bash\necho start\n#PBS -N ignored");
    assert.equal(job.job.name, null);
    assert(job.script.body.includes("#PBS -N ignored"));
    assert(diagnostics.some((item) => item.code === "PBS_LATE_DIRECTIVE"));
});
