import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("job helper is a collapsible panel between editors and review cards", () => {
    const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
    const editors = html.indexOf('class="converter-grid"');
    const helper = html.indexOf('id="jobHelper"');
    const reports = html.indexOf('class="report-grid"');

    assert(editors >= 0);
    assert(helper > editors);
    assert(reports > helper);
    assert.match(html, /Job submission &amp; management helper/);
    assert.match(html, /data-helper-primary/);
    assert.match(html, /data-helper-advanced/);
});

test("helper is collapsed by default", () => {
    const html = fs.readFileSync(new URL("../../public/index.html", import.meta.url), "utf8");
    assert.match(html, /<details id="jobHelper" class="helper-card">/);
    assert.doesNotMatch(html, /<details id="jobHelper" class="helper-card" open>/);
});

test("main UI renders helper according to current target scheduler", () => {
    const main = fs.readFileSync(new URL("../../public/assets/js/ui/main.js", import.meta.url), "utf8");
    assert.match(main, /renderCommandHelper\(jobHelper, targetScheduler\.value\)/);
    assert.match(main, /attachCommandCopyHandler\(jobHelper\)/);
});
