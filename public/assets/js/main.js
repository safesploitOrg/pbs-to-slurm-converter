const CURRENT_YEAR_ID = "currentYear";

function setCurrentYear() {
    const yearElement = document.getElementById(CURRENT_YEAR_ID);

    if (!yearElement) {
        return;
    }

    yearElement.textContent = String(new Date().getFullYear());
}

function countLines(value) {
    if (!value) {
        return 0;
    }

    return value.split(/\r?\n/).length;
}

function renderList(element, items, emptyMessage) {
    element.innerHTML = "";

    if (items.length === 0) {
        const item = document.createElement("li");
        item.textContent = emptyMessage;
        element.appendChild(item);
        return;
    }

    for (const text of items) {
        const item = document.createElement("li");
        item.textContent = text;
        element.appendChild(item);
    }
}

function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

function initialiseConverter() {
    const pbsInput = document.getElementById("pbsInput");
    const slurmOutput = document.getElementById("slurmOutput");
    const loadExampleBtn = document.getElementById("loadExampleBtn");
    const copyOutputBtn = document.getElementById("copyOutputBtn");
    const downloadOutputBtn = document.getElementById("downloadOutputBtn");
    const clearBtn = document.getElementById("clearBtn");
    const summaryList = document.getElementById("summaryList");
    const warningsList = document.getElementById("warningsList");
    const inputLineCount = document.getElementById("inputLineCount");
    const outputLineCount = document.getElementById("outputLineCount");

    function refreshConversion() {
        const result = convertPbsToSlurm(pbsInput.value);
        slurmOutput.value = result.output;
        inputLineCount.textContent = `${countLines(pbsInput.value)} lines`;
        outputLineCount.textContent = `${countLines(slurmOutput.value)} lines`;
        renderList(summaryList, result.summary, "No PBS directives converted yet.");
        renderList(warningsList, result.warnings, "No warnings detected.");
    }

    pbsInput.addEventListener("input", refreshConversion);

    loadExampleBtn.addEventListener("click", () => {
        pbsInput.value = PBS_EXAMPLE;
        refreshConversion();
        pbsInput.focus();
    });

    copyOutputBtn.addEventListener("click", async () => {
        if (!slurmOutput.value) {
            return;
        }

        await navigator.clipboard.writeText(slurmOutput.value);
    });

    downloadOutputBtn.addEventListener("click", () => {
        if (!slurmOutput.value) {
            return;
        }

        downloadTextFile("converted.slurm", `${slurmOutput.value}\n`);
    });

    clearBtn.addEventListener("click", () => {
        pbsInput.value = "";
        refreshConversion();
        pbsInput.focus();
    });

    refreshConversion();
}

document.addEventListener("DOMContentLoaded", () => {
    initialiseConverter();
    setCurrentYear();
});
