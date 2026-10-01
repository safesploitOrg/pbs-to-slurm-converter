# PBS / Slurm Converter

A lightweight, dependency-free browser utility for converting HPC batch scripts in either direction between PBS-family schedulers and Slurm.

## Features

- PBS / OpenPBS / PBS Pro / TORQUE -> Slurm conversion.
- Slurm -> OpenPBS / PBS Professional / TORQUE conversion.
- Scheduler-neutral intermediate `JobModel` to avoid duplicated pairwise conversion logic.
- Modern PBS `select` / `place` and legacy TORQUE `nodes` / `ppn` support.
- CPU/task topology, memory, GPU, walltime, arrays, mail, dependencies, environment export, working directory, output/error, delayed start, hold, and requeue handling.
- Structured warnings and `REVIEW` comments for scheduler-specific or ambiguous semantics.
- Categorised **Load Example** menu with Recommended examples first.
- Scheduler-aware, realistic runnable-style PBS and Slurm example scripts.
- Collapsible two-column PBS/Slurm job submission and management helper with copyable commands.
- No backend, frontend framework, build step, or runtime dependencies.

## Example Catalogue

Recommended examples:

- Basic Job
- Send Email
- MPI Job
- GPU Job

Additional categories include General, Parallel Workloads, Resources, Scheduling, and Compatibility. The catalogue also includes OpenMP, hybrid MPI/OpenMP, job arrays, dependencies, delayed start, legacy TORQUE, output/error patterns, environment variables, and an intentionally unsupported/review-required example.

The same example registry is imported by the automated tests, so UI examples cannot drift independently from converter behaviour. Recommended examples include job metadata, short workloads, scheduler runtime variables, and practical output suitable for learning as well as regression testing.

## Job Submission Helper

Below the code editors, the browser UI includes a collapsed **Job submission & management helper**. When opened it shows PBS and Slurm side by side, including submit, queue/status, job-detail, cancellation, and output-following commands. The current conversion target is highlighted and an Advanced commands section provides common queue/partition, node, accounting/history, and array commands.

## Running Locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/public/
```

## Testing

Run the production-module test suite:

```bash
npm test
```

Run JavaScript syntax checks:

```bash
npm run check
```

Run Node's coverage report:

```bash
npm run test:coverage
```

An optional real-browser smoke test is also included:

```bash
npm run test:ui
```

The UI smoke test uses Python Playwright when it is available. It skips cleanly if Playwright or browser execution is unavailable; normal unit/integration tests have no third-party test dependency.

## Documentation

- `ARCHITECTURE.md` - design, modules, JobModel and extension rules.
- `SUPPORT_MATRIX.md` - exact/best-effort/review conversion semantics.
- `CHANGELOG.md` - version history.

## Source

https://github.com/safesploitOrg/pbs-to-slurm-converter
