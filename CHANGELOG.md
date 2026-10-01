# Changelog

All notable changes to this project are documented in this file.

The project follows Semantic Versioning.

## [Unreleased]

### Added

### Changed

### Fixed

### Security

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
