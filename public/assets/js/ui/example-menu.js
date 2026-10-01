import { getExampleGroups } from "../examples/index.js";

export function exampleMenuPlan(sourceScheduler) {
    return getExampleGroups(sourceScheduler).map((group) => ({
        id: group.id,
        label: group.label,
        options: group.examples.map((example) => ({
            value: example.id,
            label: example.label
        }))
    }));
}

export function populateExampleSelect(selectElement, sourceScheduler) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Load Example…";
    placeholder.selected = true;

    selectElement.replaceChildren(placeholder);

    for (const group of exampleMenuPlan(sourceScheduler)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;

        for (const option of group.options) {
            const element = document.createElement("option");
            element.value = option.value;
            element.textContent = option.label;
            optgroup.appendChild(element);
        }

        selectElement.appendChild(optgroup);
    }
}
