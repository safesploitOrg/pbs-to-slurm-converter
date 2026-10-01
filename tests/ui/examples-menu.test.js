import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { exampleMenuPlan } from "../../public/assets/js/ui/example-menu.js";

test("example menu plan starts with Recommended then categorised examples", () => {
    const plan = exampleMenuPlan("pbs");
    assert.equal(plan[0].id, "recommended");
    assert.deepEqual(plan[0].options.map((option) => option.label), [
        "Basic Job",
        "Send Email",
        "MPI Job",
        "GPU Job"
    ]);
    assert(plan.some((group) => group.id === "general"));
    assert(plan.some((group) => group.id === "parallel"));
    assert(plan.some((group) => group.id === "resources"));
    assert(plan.some((group) => group.id === "scheduling"));
    assert(plan.some((group) => group.id === "compatibility"));
});

test("recommended examples do not reappear under normal categories", () => {
    const plan = exampleMenuPlan("slurm");
    const recommendedIds = new Set(plan[0].options.map((option) => option.value));
    const categoryIds = plan.slice(1).flatMap((group) => group.options.map((option) => option.value));
    assert(categoryIds.every((id) => !recommendedIds.has(id)));
});

test("HTML uses the categorised example select instead of the old button", () => {
    const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
    assert.match(html, /id="exampleSelect"/);
    assert.doesNotMatch(html, /id="loadExampleBtn"/);
    assert.match(html, /Load Example…/);
});
