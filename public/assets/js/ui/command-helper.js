import { commandHelperPlan } from "../helpers/commands.js";

function createCommandRow(item) {
    const row = document.createElement("div");
    row.className = "command-row";

    const content = document.createElement("div");
    content.className = "command-row-content";

    const label = document.createElement("span");
    label.className = "command-label";
    label.textContent = item.label;

    const code = document.createElement("code");
    code.textContent = `$ ${item.command}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-copy secondary";
    button.dataset.copyCommand = item.command;
    button.textContent = "Copy";
    button.setAttribute("aria-label", `Copy ${item.label} command`);

    content.append(label, code);
    row.append(content, button);
    return row;
}

function createSchedulerColumn(plan) {
    const column = document.createElement("section");
    column.className = `command-column${plan.isTarget ? " is-target" : ""}`;
    column.dataset.scheduler = plan.id;

    const header = document.createElement("div");
    header.className = "command-column-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = plan.title;
    const subtitle = document.createElement("span");
    subtitle.className = "subtle";
    subtitle.textContent = plan.subtitle;
    titleWrap.append(title, subtitle);

    header.appendChild(titleWrap);
    if (plan.isTarget) {
        const target = document.createElement("span");
        target.className = "target-badge";
        target.textContent = "Current target";
        header.appendChild(target);
    }

    const filename = document.createElement("p");
    filename.className = "helper-filename";
    filename.innerHTML = `Save as <code>${plan.filename}</code>`;

    const commands = document.createElement("div");
    commands.className = "command-list";
    for (const item of plan.commands) {
        commands.appendChild(createCommandRow(item));
    }

    const result = document.createElement("p");
    result.className = "helper-result subtle";
    result.textContent = plan.resultExample;

    column.append(header, filename, commands, result);
    return column;
}

function createAdvancedColumn(plan) {
    const column = document.createElement("section");
    column.className = `command-column advanced-column${plan.isTarget ? " is-target" : ""}`;
    column.dataset.scheduler = plan.id;

    const heading = document.createElement("h3");
    heading.textContent = plan.id === "pbs" ? "PBS advanced commands" : "Slurm advanced commands";
    column.appendChild(heading);

    const commands = document.createElement("div");
    commands.className = "command-list";
    for (const item of plan.advanced) {
        commands.appendChild(createCommandRow(item));
    }
    column.appendChild(commands);
    return column;
}

export function renderCommandHelper(container, targetScheduler) {
    const plans = commandHelperPlan(targetScheduler);
    const primary = container.querySelector("[data-helper-primary]");
    const advanced = container.querySelector("[data-helper-advanced]");

    primary.replaceChildren(...plans.map(createSchedulerColumn));
    advanced.replaceChildren(...plans.map(createAdvancedColumn));
}

export function attachCommandCopyHandler(container) {
    container.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-copy-command]");
        if (!button) {
            return;
        }

        const command = button.dataset.copyCommand;
        if (!command) {
            return;
        }

        await navigator.clipboard.writeText(command);
        const original = button.textContent;
        button.textContent = "Copied";
        window.setTimeout(() => {
            button.textContent = original;
        }, 1200);
    });
}
