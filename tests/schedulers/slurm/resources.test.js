import test from "node:test";
import assert from "node:assert/strict";
import { parseGpuGres, parseGpuOption } from "../../../public/assets/js/schedulers/slurm/resources.js";

test("Slurm GPU options preserve type, count and scope", () => {
    assert.deepEqual(parseGpuOption("2", "job"), { count: 2, scope: "job", type: null, raw: "2" });
    assert.deepEqual(parseGpuOption("a100:4", "node"), { count: 4, scope: "node", type: "a100", raw: "a100:4" });
    assert.equal(parseGpuOption("banana", "task").count, null);
});

test("Slurm GPU GRES parser handles untyped and typed GPU entries", () => {
    assert.deepEqual(parseGpuGres("gpu:2,gpu:a100:4"), [
        { count: 2, scope: "node", type: null, raw: "gpu:2" },
        { count: 4, scope: "node", type: "a100", raw: "gpu:a100:4" }
    ]);
});

test("non-GPU and malformed GRES entries do not masquerade as GPUs", () => {
    assert.deepEqual(parseGpuGres("license:matlab:1,gpu:banana"), []);
});
