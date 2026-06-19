# Architecture

## Project Purpose

`pbs-to-slurm-converter` is a static, browser-based utility for converting PBS/Torque/PBS Pro job submission scripts into Slurm job scripts.

The project is intentionally dependency-free so it can be hosted from GitHub Pages, opened locally from disk, or served by any simple static web server.

## Repository Layout

```text
pbs-to-slurm-converter/
├── README.md
├── ARCHITECTURE.md
└── public/
    ├── index.html
    └── assets/
        ├── css/
        │   └── styles.css
        └── js/
            ├── converter.js
            └── main.js
```

## Runtime Model

The application runs fully client-side in the browser.

```text
User PBS input
    ↓
input event listener in main.js
    ↓
convertPbsToSlurm() in converter.js
    ↓
Slurm output + summary + warnings
    ↓
DOM update in main.js
```

No backend, database, API, build process, package manager, or server-side processing is required.

## File Responsibilities

### `public/index.html`

Owns the page structure only.

Responsibilities:

- Defines the PBS input textarea.
- Defines the Slurm output textarea.
- Defines toolbar buttons.
- Defines summary and warning panels.
- Defines footer and source link.
- Loads CSS and JavaScript from `public/assets/`.

Avoid placing conversion logic or styling directly in this file.

### `public/assets/css/styles.css`

Owns all visual styling.

Responsibilities:

- Page layout.
- Responsive grid behaviour.
- Textarea sizing and readability.
- Button styling.
- Summary/warning panel styling.
- Footer styling.

Keep CSS class names descriptive and stable because JavaScript may depend on some UI structure, but JavaScript should primarily target IDs.

### `public/assets/js/converter.js`

Owns PBS to Slurm conversion logic.

Responsibilities:

- Store the default PBS example in `PBS_EXAMPLE`.
- Convert PBS directives to Slurm directives.
- Convert known PBS environment variables.
- Generate conversion summary messages.
- Generate warnings for unsupported or review-required syntax.

Important functions:

| Function | Purpose |
|---|---|
| `convertPbsToSlurm(input)` | Main conversion entry point. |
| `convertDirective(line, summary, warnings)` | Converts one `#PBS` directive. |
| `replaceEnvironmentVariables(line)` | Converts PBS environment variables in non-directive script lines. |
| `normaliseWalltime(value)` | Converts PBS walltime into Slurm-compatible time format. |
| `parseNodeRequest(value)` | Converts `nodes=X:ppn=Y`. |
| `parseSelectRequest(value)` | Converts PBS Pro `select=` syntax. |
| `mapMailType(value)` | Converts PBS mail flags to Slurm mail types. |

This file should not read from or write to the DOM.

### `public/assets/js/main.js`

Owns browser interaction and DOM updates.

Responsibilities:

- Attach event listeners.
- Trigger live conversion when users type or paste PBS content.
- Load the example script when requested.
- Copy Slurm output to clipboard.
- Download generated Slurm output as a `.slurm` file.
- Render line counts, summary messages, and warnings.
- Set the current year in the footer.

Important functions:

| Function | Purpose |
|---|---|
| `initialiseConverter()` | Main UI initialisation function. |
| `setCurrentYear()` | Sets the footer year dynamically. |
| `renderList(element, items, emptyMessage)` | Renders summary/warning lists safely. |
| `downloadTextFile(filename, content)` | Downloads generated output. |
| `countLines(value)` | Counts textarea lines for UI badges. |

This file should not contain PBS to Slurm conversion rules.

## Conversion Design

The converter is line-oriented by design.

For each input line:

1. If the line starts with `#PBS`, it is handled as a scheduler directive.
2. If the line does not start with `#PBS`, known PBS environment variables are replaced.
3. Unsupported PBS directives are preserved as comments and surfaced in the warning panel.

This is safer than silently dropping unknown scheduler options.

## Supported Conversion Categories

Current categories include:

- Job name.
- Queue to partition.
- Nodes and processors per node.
- PBS Pro `select=` resource requests.
- Walltime.
- Memory and per-CPU memory.
- GPU requests.
- Standard output and error files.
- Joined output/error handling.
- Mail notification settings.
- Job arrays.
- Environment export.
- Variable export.
- Job dependencies.
- Group/account conversion.
- Requeue/no-requeue behaviour.
- Common PBS environment variables.

## Known Review Areas

Some PBS syntax is cluster-specific and should trigger warnings rather than pretending the conversion is perfect.

Examples:

- Complex `select=` statements.
- Site-specific queues/partitions.
- GPU syntax that differs by cluster.
- Account/project/group mappings.
- Environment export policy.
- MPI launch commands such as `mpiexec`, `mpirun`, and `srun`.

Do not assume all clusters use the same Slurm policy.

## Adding a New Conversion Rule

When adding a new PBS directive conversion:

1. Add the rule inside `convertDirective()` in `converter.js`.
2. Push a concise human-readable message into `summary` when conversion succeeds.
3. Push a warning into `warnings` when manual review is recommended.
4. Preserve unsupported or ambiguous content as a comment in the output.
5. Add or update an example that covers the new rule.
6. Test live conversion in the browser.

Preferred rule shape:

```javascript
if (directive.startsWith("-x ")) {
    summary.push("Example directive converted");
    return [`#SBATCH --example=${directive.slice(3).trim()}`];
}
```

## JavaScript Conventions

Use plain JavaScript only.

Conventions:

- Use `const` by default.
- Use `let` only when reassignment is needed.
- Keep functions small and named by purpose.
- Keep conversion logic pure where practical.
- Avoid adding dependencies unless there is a strong reason.
- Avoid mixing DOM logic into `converter.js`.
- Avoid mixing conversion rules into `main.js`.

## CSS Conventions

- Keep layout responsive.
- Keep textareas large enough for real HPC scripts.
- Prefer readable spacing over dense UI.
- Use semantic class names.
- Avoid inline styles.
- Avoid external CSS frameworks unless the project intentionally changes direction.

## HTML Conventions

- Keep IDs stable because `main.js` depends on them.
- Keep asset paths relative so the site works locally and on GitHub Pages.
- Keep the app usable without a build step.

Current required IDs:

| ID | Used For |
|---|---|
| `pbsInput` | PBS input textarea. |
| `slurmOutput` | Slurm output textarea. |
| `loadExampleBtn` | Loads `PBS_EXAMPLE`. |
| `copyOutputBtn` | Copies Slurm output. |
| `downloadOutputBtn` | Downloads Slurm output. |
| `clearBtn` | Clears the input. |
| `summaryList` | Conversion summary list. |
| `warningsList` | Warning/unsupported list. |
| `inputLineCount` | PBS input line count. |
| `outputLineCount` | Slurm output line count. |
| `currentYear` | Dynamic footer year. |

## Testing Checklist

Before committing changes:

- Open `public/index.html` in a browser.
- Confirm the page loads with styling applied.
- Confirm textareas are empty by default.
- Click `Load Example`.
- Confirm output updates immediately.
- Type or paste into PBS input and confirm live conversion.
- Confirm summary and warnings update.
- Confirm `Copy Slurm Script` works.
- Confirm `Download Slurm Script` downloads a `.slurm` file.
- Confirm footer year is populated.
- Confirm browser console has no JavaScript errors.

## Suggested AI Agent Workflow

When using an AI agent to improve this project, give it this order of operations:

1. Read `README.md`.
2. Read `ARCHITECTURE.md`.
3. Inspect `public/index.html`.
4. Inspect `public/assets/js/converter.js`.
5. Inspect `public/assets/js/main.js`.
6. Inspect `public/assets/css/styles.css`.
7. Make the smallest safe change.
8. Test with at least one PBS input example.
9. Report exactly what changed.

## Non-Goals

For now, the project does not aim to be:

- A full parser for every PBS/PBS Pro/Torque variant.
- A cluster-specific migration tool.
- A backend service.
- A Node.js application.
- A package-managed frontend framework app.

Those may be future directions, but the current design favours portability, auditability, and simplicity.

## Future Enhancements

Potential improvements:

- Add a formal conversion rules table.
- Add unit tests using a lightweight test runner.
- Add GitHub Actions for basic syntax checks.
- Add more PBS Pro `select=` coverage.
- Add Slurm policy profiles for different clusters.
- Add optional `srun` migration hints for MPI jobs.
- Add downloadable conversion reports.
- Add GitHub Pages deployment instructions.
