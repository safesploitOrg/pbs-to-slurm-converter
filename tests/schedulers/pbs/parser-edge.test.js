import test from "node:test";
import assert from "node:assert/strict";
import { parsePbs } from "../../../public/assets/js/schedulers/pbs/parser.js";

test("PBS mail flags map to neutral events", () => {
    const cases = new Map([
        ["b", ["begin"]],
        ["e", ["end"]],
        ["a", ["fail"]],
        ["be", ["begin", "end"]],
        ["abe", ["begin", "end", "fail"]],
        ["j", ["array"]],
        ["n", []]
    ]);

    for (const [flags, expected] of cases) {
        const { job } = parsePbs(`#!/bin/bash\n#PBS -m ${flags}\necho test`);
        assert.deepEqual([...job.notifications.events].sort(), [...expected].sort(), flags);
    }
});

test("PBS dependencies are parsed structurally", () => {
    const { job } = parsePbs("#!/bin/bash\n#PBS -W depend=afterok:10:20,afterany:30\necho test");
    assert.deepEqual(job.dependencies, [
        { type: "afterok", jobs: ["10", "20"], raw: "afterok:10:20" },
        { type: "afterany", jobs: ["30"], raw: "afterany:30" }
    ]);
});

test("PBS array variants parse range, step and concurrency", () => {
    for (const expression of ["5", "0-9", "1-10:2", "1-10%3", "1-10:2%3"]) {
        const { job } = parsePbs(`#!/bin/bash\n#PBS -J ${expression}\necho test`);
        assert.equal(job.array.expression, expression);
        assert(job.array.ranges.every((range) => range.valid));
    }
});

test("invalid PBS arrays are preserved instead of becoming active model state", () => {
    const { job, diagnostics } = parsePbs("#!/bin/bash\n#PBS -J a-b\necho test");
    assert.equal(job.array, null);
    assert(job.unsupported.some((entry) => entry.directive.includes("-J a-b")));
    assert(diagnostics.some((item) => item.code === "PBS_UNSUPPORTED_DIRECTIVE"));
});

test("invalid PBS walltime and memory remain visible as custom review resources", () => {
    const { job, diagnostics } = parsePbs("#!/bin/bash\n#PBS -l walltime=banana\n#PBS -l mem=nope\necho test");
    assert(job.resources.custom.some((entry) => entry.raw === "walltime=banana"));
    assert(job.resources.custom.some((entry) => entry.raw === "mem=nope"));
    assert(diagnostics.some((item) => item.code === "PBS_WALLTIME_INVALID"));
    assert(diagnostics.some((item) => item.code === "PBS_MEMORY_INVALID"));
});
