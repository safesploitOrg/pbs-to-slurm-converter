import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { convert } from "../../public/assets/js/core/converter.js";
import { parsePbs } from "../../public/assets/js/schedulers/pbs/parser.js";

const basic = fs.readFileSync(new URL("../fixtures/pbs/basic.pbs", import.meta.url), "utf8");

test("portable PBS semantics survive PBS -> Slurm -> PBS round trip", () => {
    const toSlurm = convert({ input: basic, sourceScheduler: "pbs", targetScheduler: "slurm" });
    const backToPbs = convert({
        input: toSlurm.output,
        sourceScheduler: "slurm",
        targetScheduler: "pbs",
        targetDialect: "openpbs"
    });

    const original = parsePbs(basic).job;
    const roundTrip = parsePbs(backToPbs.output).job;

    assert.equal(roundTrip.job.name, original.job.name);
    assert.equal(roundTrip.job.account, original.job.account);
    assert.equal(roundTrip.resources.walltimeSeconds, original.resources.walltimeSeconds);
    assert.equal(roundTrip.array.expression, original.array.expression);
    assert.equal(roundTrip.notifications.email, original.notifications.email);
    assert.deepEqual(roundTrip.notifications.events.sort(), original.notifications.events.sort());
});
