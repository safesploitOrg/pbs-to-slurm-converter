import test from "node:test";
import assert from "node:assert/strict";
import { convert } from "../../public/assets/js/core/converter.js";
import { getExampleById } from "../../public/assets/js/examples/index.js";
import { parsePbs } from "../../public/assets/js/schedulers/pbs/parser.js";

const PORTABLE_EXAMPLES = ["basic-job", "send-email", "job-array", "job-dependency", "delayed-start"];

function semanticProjection(job) {
    return {
        name: job.job.name,
        queue: job.job.queue,
        walltime: job.resources.walltimeSeconds,
        email: job.notifications.email,
        events: [...job.notifications.events].sort(),
        array: job.array?.expression ?? null,
        dependencies: job.dependencies.map((item) => ({ type: item.type, jobs: item.jobs }))
    };
}

test("portable catalogue examples survive PBS -> Slurm -> PBS semantically", () => {
    for (const id of PORTABLE_EXAMPLES) {
        const example = getExampleById("pbs", id);
        const toSlurm = convert({ input: example.script, sourceScheduler: "pbs", targetScheduler: "slurm" });
        const back = convert({
            input: toSlurm.output,
            sourceScheduler: "slurm",
            targetScheduler: "pbs",
            targetDialect: "openpbs"
        });

        const original = semanticProjection(parsePbs(example.script).job);
        const roundTrip = semanticProjection(parsePbs(back.output).job);
        assert.deepEqual(roundTrip, original, id);
    }
});
