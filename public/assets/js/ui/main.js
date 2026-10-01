import { APP_VERSION } from "../core/version.js";
import { convert } from "../core/converter.js";
import { downloadTextFile, outputFilename } from "./download.js";
import { countLines, renderList, schedulerLabel } from "./editor.js";
import { EXAMPLES } from "./examples.js";

const SOURCE_TO_TARGET = Object.freeze({
    pbs: "slurm",
    slurm: "pbs"
});

function initialiseConverter() {
    const sourceScheduler = document.getElementById("sourceScheduler");
    const targetScheduler = document.getElementById("targetScheduler");
    const targetDialect = document.getElementById("targetDialect");
    const targetDialectField = document.getElementById("targetDialectField");
    const sourceLabel = document.getElementById("sourceLabel");
    const targetLabel = document.getElementById("targetLabel");
    const sourceInput = document.getElementById("sourceInput");
    const targetOutput = document.getElementById("targetOutput");
    const loadExampleBtn = document.getElementById("loadExampleBtn");
    const swapBtn = document.getElementById("swapBtn");
    const copyOutputBtn = document.getElementById("copyOutputBtn");
    const downloadOutputBtn = document.getElementById("downloadOutputBtn");
    const clearBtn = document.getElementById("clearBtn");
    const summaryList = document.getElementById("summaryList");
    const warningsList = document.getElementById("warningsList");
    const inputLineCount = document.getElementById("inputLineCount");
    const outputLineCount = document.getElementById("outputLineCount");
    const detectedDialect = document.getElementById("detectedDialect");

    function synchroniseTarget() {
        if (sourceScheduler.value === targetScheduler.value) {
            targetScheduler.value = SOURCE_TO_TARGET[sourceScheduler.value];
        }
    }

    function refreshLabels() {
        sourceLabel.textContent = `${schedulerLabel(sourceScheduler.value)} Input`;
        targetLabel.textContent = `${schedulerLabel(targetScheduler.value)} Output`;
        targetDialectField.hidden = targetScheduler.value !== "pbs";
        downloadOutputBtn.textContent = `Download ${targetScheduler.value === "pbs" ? "PBS" : "Slurm"} Script`;
    }

    function refreshConversion() {
        synchroniseTarget();
        refreshLabels();

        inputLineCount.textContent = `${countLines(sourceInput.value)} lines`;

        try {
            const result = convert({
                input: sourceInput.value,
                sourceScheduler: sourceScheduler.value,
                targetScheduler: targetScheduler.value,
                targetDialect: targetDialect.value
            });

            targetOutput.value = result.output;
            outputLineCount.textContent = `${countLines(targetOutput.value)} lines`;
            renderList(summaryList, result.summary, "No scheduler directives converted yet.");
            renderList(warningsList, result.warnings, "No warnings detected.");
            detectedDialect.textContent = result.job?.source?.dialect
                ? `Detected source: ${result.job.source.dialect}`
                : "";
        } catch (error) {
            targetOutput.value = "";
            outputLineCount.textContent = "0 lines";
            renderList(summaryList, [], "No conversion available.");
            renderList(warningsList, [error.message], "No warnings detected.");
            detectedDialect.textContent = "";
        }
    }

    sourceInput.addEventListener("input", refreshConversion);

    sourceScheduler.addEventListener("change", () => {
        targetScheduler.value = SOURCE_TO_TARGET[sourceScheduler.value];
        sourceInput.value = "";
        refreshConversion();
        sourceInput.focus();
    });

    targetScheduler.addEventListener("change", () => {
        if (targetScheduler.value === sourceScheduler.value) {
            sourceScheduler.value = SOURCE_TO_TARGET[targetScheduler.value];
            sourceInput.value = "";
        }
        refreshConversion();
    });

    targetDialect.addEventListener("change", refreshConversion);

    swapBtn.addEventListener("click", () => {
        const previousSource = sourceScheduler.value;
        sourceScheduler.value = targetScheduler.value;
        targetScheduler.value = previousSource;

        if (targetOutput.value.trim()) {
            sourceInput.value = targetOutput.value;
        }

        refreshConversion();
        sourceInput.focus();
    });

    loadExampleBtn.addEventListener("click", () => {
        sourceInput.value = EXAMPLES[sourceScheduler.value];
        refreshConversion();
        sourceInput.focus();
    });

    copyOutputBtn.addEventListener("click", async () => {
        if (!targetOutput.value) {
            return;
        }
        await navigator.clipboard.writeText(targetOutput.value);
    });

    downloadOutputBtn.addEventListener("click", () => {
        if (!targetOutput.value) {
            return;
        }
        downloadTextFile(outputFilename(targetScheduler.value), `${targetOutput.value}\n`);
    });

    clearBtn.addEventListener("click", () => {
        sourceInput.value = "";
        refreshConversion();
        sourceInput.focus();
    });

    document.getElementById("currentYear").textContent = String(new Date().getFullYear());
    document.getElementById("appVersion").textContent = `v${APP_VERSION}`;
    refreshConversion();
}

document.addEventListener("DOMContentLoaded", initialiseConverter);
