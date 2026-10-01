# PBS / Slurm Converter

A dependency-free, browser-based utility for bidirectional conversion between PBS-family batch scripts and Slurm batch scripts.

Supported PBS-family inputs include modern OpenPBS/PBS Professional `select`/`place` syntax and common legacy TORQUE/PBS `nodes`/`ppn` syntax.

## Current Version

`v1.1.0`

## Features

- PBS -> Slurm conversion.
- Slurm -> PBS conversion.
- OpenPBS, PBS Professional, and TORQUE target modes.
- Scheduler-neutral intermediate job model to avoid duplicated conversion logic.
- PBS `select` chunk parsing, legacy `nodes`/`ppn`, CPU/task topology, memory, GPUs, placement, walltime, arrays, mail, accounting, dependencies, environment export, hold, and requeue handling.
- Slurm nodes/tasks/CPUs, memory, GPU, arrays, mail, dependencies, account, working directory, hold, requeue, and common batch options.
- Common PBS/Slurm runtime environment-variable translation and Slurm output filename-pattern handling.
- Unsafe or scheduler-specific mappings and runtime commands are preserved as `REVIEW` comments/warnings rather than silently discarded or guessed.
- Unit, parser, integration, and round-trip tests against the real production modules.
- GitHub Pages deployment gated by syntax checks and tests.

## Architecture

Conversion does not directly translate PBS syntax into Slurm syntax or vice versa.

```text
Source script
    |
    v
Scheduler parser
    |
    v
Neutral JobModel
    |
    v
Scheduler renderer
    |
    v
Target script
```

See `ARCHITECTURE.md` for the complete design and `SUPPORT_MATRIX.md` for conversion support and known semantic differences.

## Run Locally

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/public/
```

The application uses browser ES modules, so serving it over HTTP is recommended instead of opening `index.html` directly with `file://`.

## Tests

Requires Node.js 20 or newer.

```bash
npm run check
npm test
```

No npm dependencies need to be installed.

## Repository

https://github.com/safesploitOrg/pbs-to-slurm-converter
