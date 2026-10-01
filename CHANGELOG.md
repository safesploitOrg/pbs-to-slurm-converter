# Changelog

All notable changes to this project are documented in this file.

The project follows Semantic Versioning.

## [Unreleased]

### Added

### Changed

### Fixed

### Security

## [1.3.0] - 2026-10-01

### Added

- Collapsible **Job submission & management helper** between the code editors and conversion summary/review panels.
- Side-by-side **How to run this PBS job** and **How to run this Slurm job** command columns.
- Copy buttons for submit, job-list, job-detail, cancel, output-following, and advanced helper commands.
- Advanced PBS commands for queues, nodes, historical jobs, and arrays.
- Advanced Slurm commands for partitions/nodes, accounting/history, running-job statistics, and arrays.
- Unit tests for helper command data, target emphasis, page placement, and UI integration.

### Changed

- Expanded the example catalogue from minimal directive demonstrations into realistic runnable-style job scripts.
- Updated the Send Email examples with job metadata, hostname/timestamps, a short workload, and a safe placeholder email address.
- Recommended examples now provide enough surrounding context to teach normal batch-script structure as well as exercise conversion logic.
- The current conversion target is highlighted in the helper while both scheduler command columns remain visible.
- Expanded the Node test suite from 85 tests to 96 tests.

## [1.2.0] - 2026-10-01

### Added

- Categorised **Load Example** dropdown with a Recommended group shown first.
- Recommended examples: Basic Job, Send Email, MPI Job, and GPU Job.
- Additional example categories for General, Parallel Workloads, Resources, Scheduling, and Compatibility.
- Scheduler-aware PBS and Slurm example scripts stored in a shared example registry.
- Example catalogue regression tests: every example is converted through production code.
- Dedicated PBS and Slurm renderer unit tests.
- Expanded PBS/Slurm resource tests for CPU topology, memory, GPUs, arrays, mail, dependencies, environment variables, filename patterns, start times, and scheduler dialects.
- Semantic round-trip tests for portable catalogue examples.
- Malformed-input tests enforcing the rule that invalid scheduler syntax must not crash or disappear silently.
- UI menu tests plus an optional Playwright browser smoke test (`npm run test:ui`) when Playwright/browser execution is available.
- Coverage command: `npm run test:coverage`.

### Changed

- Example definitions are now data-driven under `public/assets/js/examples/` rather than embedded in UI code.
- Recommended examples are omitted from their normal categories to avoid duplicate dropdown entries.
- Changing or swapping source schedulers rebuilds the example menu for the selected source scheduler.
- JavaScript syntax checking now covers all production and JavaScript test files.
- Expanded the automated Node test suite from 29 tests in v1.1.0 to 85 tests.

### Fixed

- Invalid Slurm node/task/CPU, GPU, memory, array, and time values are preserved for review instead of silently falling out of the model.
- Invalid PBS arrays, walltime, memory, and malformed `select` values are preserved/flagged rather than producing misleading active target directives.
- Typed Slurm GPU requests now generate explicit PBS review diagnostics when the GPU type cannot be expressed portably.
- Slurm GPUs-per-socket requests are preserved for manual PBS resource modelling.
- PBS select properties and legacy TORQUE node properties now generate explicit Slurm review diagnostics instead of being silently dropped.

## [1.1.0] - 2026-10-01

### Added

- Bidirectional conversion: PBS -> Slurm and Slurm -> PBS.
- Scheduler-neutral `JobModel` used by all parsers and renderers.
- Separate PBS and Slurm parser/renderer modules.
- OpenPBS, PBS Professional, and TORQUE target dialect selection.
- Modern PBS `select` chunk parsing and `place` handling.
- Legacy TORQUE/PBS `nodes`/`ppn` parsing without a separate conversion engine.
- Slurm parsing for nodes, tasks, CPUs per task, memory, GPUs, account, arrays, mail, dependencies, working directory, hold, requeue, and common output settings.
- Shared duration, memory, array, start-time, diagnostics, runtime environment-variable, scheduler filename-pattern, script-analysis, and version utilities.
- Conversion warnings and `REVIEW` comments for ambiguous or non-portable semantics.
- Unit, parser, bidirectional integration, and semantic round-trip tests.
- `SUPPORT_MATRIX.md` documenting exact, best-effort, and preserve/review conversion behaviour.
- Direction selector, swap control, and PBS target dialect selector in the browser UI.

### Changed

- Refactored the original direct PBS-to-Slurm converter into parser -> neutral model -> renderer architecture.
- Tests now import and execute real production modules instead of duplicating converter functions.
- GitHub Pages deployment now runs JavaScript syntax checks and the full test suite first.
- PBS mail flags `abe` now render as Slurm `BEGIN,END,FAIL` rather than the broader Slurm `ALL` event set.
- Runtime environment variables are translated in script bodies, while scheduler output/error filename patterns are handled separately so Slurm `%j`/`%x` semantics are not confused with shell variables.

### Fixed

- Removed the unsafe `PBS_NODEFILE` -> `SLURM_JOB_NODELIST` substitution; the source variable is now preserved with a manual-review warning because a node-file path and a node-list expression are not equivalent.
- Removed the incorrect PBS `group_list` -> Slurm `--account` mapping; execution group and accounting identity are modelled separately.
- Improved memory and GPU handling so scope is retained instead of treating all requests as job-global values.
- Directives encountered after executable script content are now identified as inactive/late directives instead of being converted as if the scheduler would process them.
- Scheduler-specific runtime commands such as `srun`, `pbsdsh`, and MPI launchers are preserved with explicit target-scheduler review diagnostics.

## [1.0.0] - 2026-06-19

### Added

- Initial browser-based PBS/TORQUE/PBS Pro to Slurm converter.
- Live conversion UI.
- Common PBS directive conversion for job name, queue, walltime, nodes/PPN, memory, arrays, mail, dependencies, exports, and GPUs.
- Conversion summary and unsupported-directive warnings.
- Copy and download actions.
- Responsive frontend and favicon.
- GitHub Pages deployment workflow.
- `ARCHITECTURE.md`.
- Initial Node.js unit tests and CI deployment gate.
