import test from "node:test";
import assert from "node:assert/strict";
import { commandHelperPlan, getCommandHelp, SCHEDULER_COMMAND_HELP } from "../../public/assets/js/helpers/commands.js";

test("helper catalogue exposes PBS and Slurm side by side", () => {
    const plan = commandHelperPlan("slurm");
    assert.deepEqual(plan.map((item) => item.id), ["pbs", "slurm"]);
    assert.equal(plan[0].isTarget, false);
    assert.equal(plan[1].isTarget, true);
});

test("changing target moves the helper emphasis without hiding either scheduler", () => {
    const plan = commandHelperPlan("pbs");
    assert.equal(plan.find((item) => item.id === "pbs").isTarget, true);
    assert.equal(plan.find((item) => item.id === "slurm").isTarget, false);
    assert.equal(plan.length, 2);
});

test("PBS helper contains core submit, inspect and cancel commands", () => {
    const pbs = getCommandHelp("pbs");
    const commands = Object.fromEntries(pbs.commands.map((item) => [item.id, item.command]));
    assert.equal(commands.submit, "qsub converted.pbs");
    assert.equal(commands.jobs, 'qstat -u "$USER"');
    assert.equal(commands.details, "qstat -f <JOB_ID>");
    assert.equal(commands.cancel, "qdel <JOB_ID>");
});

test("Slurm helper contains core submit, inspect and cancel commands", () => {
    const slurm = getCommandHelp("slurm");
    const commands = Object.fromEntries(slurm.commands.map((item) => [item.id, item.command]));
    assert.equal(commands.submit, "sbatch converted.slurm");
    assert.equal(commands.jobs, "squeue --me");
    assert.equal(commands.details, "scontrol show job <JOB_ID>");
    assert.equal(commands.cancel, "scancel <JOB_ID>");
});

test("advanced helper commands are present for both schedulers", () => {
    assert(SCHEDULER_COMMAND_HELP.pbs.advanced.some((item) => item.command === "pbsnodes -a"));
    assert(SCHEDULER_COMMAND_HELP.slurm.advanced.some((item) => item.command === "sacct -j <JOB_ID>"));
});

test("unknown helper scheduler returns null", () => {
    assert.equal(getCommandHelp("unknown"), null);
});
