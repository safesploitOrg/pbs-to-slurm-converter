import test from "node:test";
import assert from "node:assert/strict";
import { parseLegacyNodes, parsePlace, parseSelect } from "../../../public/assets/js/schedulers/pbs/resources.js";

test("PBS select parses CPU, MPI, OpenMP, memory and GPU resources", () => {
    const diagnostics = [];
    const chunks = parseSelect("select=2:ncpus=16:mpiprocs=4:ompthreads=4:mem=64gb:vmem=128gb:ngpus=2", diagnostics, 1);
    assert.equal(chunks[0].count, 2);
    assert.equal(chunks[0].ncpus, 16);
    assert.equal(chunks[0].mpiprocs, 4);
    assert.equal(chunks[0].ompthreads, 4);
    assert.equal(chunks[0].memoryBytes, 64 * 1024 ** 3);
    assert.equal(chunks[0].virtualMemoryBytes, 128 * 1024 ** 3);
    assert.equal(chunks[0].gpus.count, 2);
    assert.equal(chunks[0].valid, true);
});

test("PBS select marks malformed known resource values invalid", () => {
    const diagnostics = [];
    const chunks = parseSelect("select=1:ncpus=banana:mem=nope:ngpus=x", diagnostics, 7);
    assert.equal(chunks[0].valid, false);
    assert(diagnostics.filter((item) => item.code === "PBS_SELECT_VALUE_INVALID").length >= 3);
});

test("empty PBS select is invalid instead of becoming a fake one-node request", () => {
    const diagnostics = [];
    const chunks = parseSelect("select=", diagnostics, 3);
    assert.equal(chunks[0].valid, false);
    assert(diagnostics.some((item) => item.code === "PBS_SELECT_INVALID"));
});

test("legacy nodes and placement syntax remain structured", () => {
    const diagnostics = [];
    const nodes = parseLegacyNodes("nodes=2:ppn=8:gpus=1:fast+1:ppn=4", diagnostics, 1);
    assert.equal(nodes.segments[0].count, 2);
    assert.equal(nodes.segments[0].ppn, 8);
    assert.equal(nodes.segments[0].gpus, 1);
    assert.deepEqual(nodes.segments[0].properties, ["fast"]);
    assert.equal(nodes.segments[1].count, 1);

    const place = parsePlace("place=scatter:exclhost:group=host");
    assert.equal(place.arrangement, "scatter");
    assert.equal(place.sharing, "exclhost");
    assert.equal(place.groupBy, "host");
});
