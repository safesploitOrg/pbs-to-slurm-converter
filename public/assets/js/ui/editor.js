export function countLines(value) {
    if (!value) {
        return 0;
    }
    return String(value).split(/\r?\n/).length;
}

export function renderList(element, items, emptyMessage) {
    element.replaceChildren();

    const values = items.length > 0 ? items : [emptyMessage];
    for (const text of values) {
        const item = document.createElement("li");
        item.textContent = text;
        element.appendChild(item);
    }
}

export function schedulerLabel(scheduler) {
    return scheduler === "pbs" ? "PBS / OpenPBS / PBS Pro / TORQUE" : "Slurm";
}
