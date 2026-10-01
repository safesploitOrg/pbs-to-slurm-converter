import test from "node:test";
import assert from "node:assert/strict";
import {
    formatPbsDuration,
    formatSlurmDuration,
    parseArrayExpression,
    parseMemory,
    parsePbsDuration,
    parsePbsStartTime,
    parseSlurmDuration,
    parseSlurmStartTime,
    formatPbsStartTime,
    formatSlurmStartTime
} from "../../public/assets/js/core/utils.js";

test("PBS duration supports hours greater than 24", () => {
    const seconds = parsePbsDuration("50:00:00");
    assert.equal(seconds, 180000);
    assert.equal(formatSlurmDuration(seconds), "2-02:00:00");
});

test("Slurm day duration converts to PBS elapsed hours", () => {
    const seconds = parseSlurmDuration("2-02:00:00");
    assert.equal(seconds, 180000);
    assert.equal(formatPbsDuration(seconds), "50:00:00");
});

test("memory normalises to bytes", () => {
    assert.equal(parseMemory("64gb").bytes, 64 * 1024 ** 3);
    assert.equal(parseMemory("2048M").bytes, 2048 * 1024 ** 2);
    assert.equal(parseMemory("1024", "m").bytes, 1024 * 1024 ** 2);
});

test("array parser captures step and concurrency", () => {
    const array = parseArrayExpression("1-20:2%4");
    assert.equal(array.ranges[0].start, 1);
    assert.equal(array.ranges[0].end, 20);
    assert.equal(array.ranges[0].step, 2);
    assert.equal(array.maxConcurrent, 4);
});

test("full PBS start time converts to canonical ISO and Slurm", () => {
    const start = parsePbsStartTime("202610021430.15");
    assert.equal(start.iso, "2026-10-02T14:30:15");
    assert.equal(formatSlurmStartTime(start), "2026-10-02T14:30:15");
});

test("canonical Slurm start time converts to PBS", () => {
    const start = parseSlurmStartTime("2026-10-02T14:30:15");
    assert.equal(formatPbsStartTime(start), "202610021430.15");
});
