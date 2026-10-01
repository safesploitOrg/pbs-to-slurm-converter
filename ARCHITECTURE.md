# Architecture

## Purpose

`pbs-to-slurm-converter` is a static, dependency-free browser utility for converting HPC batch scripts between PBS-family schedulers and Slurm.

Version 1.1 introduced bidirectional conversion and deliberately avoided two independent conversion engines. Version 1.2 adds a scheduler-aware example catalogue, stronger parser validation, and a substantially expanded regression suite. The architecture remains based on a scheduler-neutral intermediate model.

## Design Principles

1. **DRY conversion logic** - parse scheduler syntax once into neutral semantics and render those semantics for the target scheduler.
2. **Safety over false precision** - ambiguous mappings generate warnings and review comments instead of silently changing job meaning.
3. **Scheduler syntax stays at the edge** - PBS syntax belongs in PBS modules; Slurm syntax belongs in Slurm modules.
4. **No framework or backend** - the deployed application remains static and auditable.
5. **Production code is directly tested** - tests import the same modules used by the browser.
6. **Extensible scheduler model** - a future scheduler requires a parser and renderer rather than pairwise converters for every existing scheduler.

## Conversion Pipeline

```text
PBS input                          Slurm input
   |                                  |
   v                                  v
PBS parser                         Slurm parser
   |                                  |
   +--------------+  +----------------+
                  |  |
                  v  v
                JobModel
                  |
          shared normalisation
          and diagnostics
                  |
        +---------+---------+
        |                   |
        v                   v
   PBS renderer        Slurm renderer
        |                   |
        v                   v
     PBS output          Slurm output
```

The orchestrator in `core/converter.js` chooses the source parser and target renderer.

## Repository Layout

```text
pbs-to-slurm-converter/
|-- README.md
|-- ARCHITECTURE.md
|-- SUPPORT_MATRIX.md
|-- TESTING.md
|-- CHANGELOG.md
|-- package.json
|-- .github/
|   `-- workflows/
|       `-- static.yml
|-- public/
|   |-- index.html
|   `-- assets/
|       |-- css/
|       |   `-- styles.css
|       |-- favicon/
|       |   `-- binary.svg
|       `-- js/
|           |-- core/
|           |   |-- capabilities.js
|           |   |-- converter.js
|           |   |-- diagnostics.js
|           |   |-- environment.js
|           |   |-- io-patterns.js
|           |   |-- job-model.js
|           |   |-- script-analysis.js
|           |   |-- utils.js
|           |   `-- version.js
|           |-- examples/
|           |   |-- index.js
|           |   |-- pbs.js
|           |   `-- slurm.js
|           |-- schedulers/
|           |   |-- pbs/
|           |   |   |-- constants.js
|           |   |   |-- parser.js
|           |   |   |-- renderer.js
|           |   |   |-- resources.js
|           |   |   `-- dialects/
|           |   |       |-- openpbs.js
|           |   |       |-- pbspro.js
|           |   |       `-- torque.js
|           |   `-- slurm/
|           |       |-- constants.js
|           |       |-- parser.js
|           |       |-- renderer.js
|           |       `-- resources.js
|           `-- ui/
|               |-- download.js
|               |-- editor.js
|               |-- example-menu.js
|               `-- main.js
`-- tests/
    |-- core/
    |-- examples/
    |-- schedulers/
    |   |-- pbs/
    |   `-- slurm/
    |-- integration/
    |-- ui/
    `-- fixtures/
        |-- pbs/
        `-- slurm/
```

## Example Catalogue

Examples are application data rather than UI logic.

```text
examples/index.js
    |
    +-- metadata/category/recommended flags
    +-- PBS scripts from examples/pbs.js
    `-- Slurm scripts from examples/slurm.js
             |
             +-- browser dropdown
             `-- automated regression tests
```

`examples/index.js` is the single source of truth for catalogue metadata. The UI asks for examples valid for the selected source scheduler and builds grouped menu data through `ui/example-menu.js`.

The first menu group is **Recommended**. Recommended examples are intentionally omitted from their normal category groups so each example appears exactly once.

Scheduler-specific examples are allowed. For example, the Legacy TORQUE example exists only for PBS-family source input and is automatically filtered from the Slurm source menu.

## JobModel

The `JobModel` is the canonical scheduler-neutral representation.

Major sections are:

```javascript
{
    source: {},
    job: {},
    resources: {},
    io: {},
    notifications: {},
    array: null,
    environment: {},
    dependencies: [],
    script: {},
    unsupported: []
}
```

### Job identity

Stores job name, queue/partition concept, account, project, execution group, hold state, rerunnable/requeue intent, and delayed start time.

Accounting, project, and execution group are deliberately separate. For example, PBS `group_list` must not be translated into Slurm `--account`.

### Resources

The model supports both scheduler-neutral topology and PBS-specific chunk semantics without making the core model Slurm-centric.

Relevant fields include:

- `walltimeSeconds`
- PBS `chunks[]`
- legacy PBS/TORQUE `legacyNodes`
- `nodes`
- `tasks`
- `tasksPerNode`
- `cpusPerTask`
- scoped `memory[]`
- scoped `gpus[]`
- placement and exclusivity
- custom/site-specific resources

PBS `select` is represented as chunks because a chunk is not always equivalent to a physical Slurm node. The Slurm renderer records an explicit warning when it has to assume one chunk per node.

### Script body

Scheduler directives are removed from the active script body during parsing. The shebang is stored separately.

A directive appearing after executable content has started is preserved in the body with a warning because both scheduler families normally stop scanning active scheduler directives once script commands have begun.

## PBS Family

The PBS parser is shared across OpenPBS, PBS Professional, and TORQUE.

Dialect-specific behaviour is configuration rather than duplicated conversion logic.

### Modern PBS

OpenPBS/PBS Professional output favours:

```text
#PBS -l select=...
#PBS -l place=...
```

### TORQUE

TORQUE target mode can render legacy resources such as:

```text
#PBS -l nodes=2:ppn=8
```

and uses `-t` for arrays rather than modern PBS `-J`.

## Slurm

The Slurm parser handles common `sbatch` long and short options and maps them into the same neutral fields used by PBS.

Slurm-only concepts that have no portable PBS representation, such as QOS or reservations, are preserved as review comments rather than discarded.

## Diagnostics

Diagnostics have a stable structure:

```javascript
{
    code,
    message,
    severity,
    line,
    scheduler
}
```

The UI currently presents them as two lists:

- conversion summary (`info`)
- warnings/manual review (`warning` and `error`)

Future UI changes can use the structured diagnostics without changing parser logic.

## Environment Variables

Runtime environment-variable translation is centralised in `core/environment.js`. Scheduler directive filename patterns are handled separately by `core/io-patterns.js` because `#SBATCH` directives do not perform shell expansion.

Direct semantic pairs include:

```text
PBS_JOBID       <-> SLURM_JOB_ID
PBS_JOBNAME     <-> SLURM_JOB_NAME
PBS_O_WORKDIR   <-> SLURM_SUBMIT_DIR
PBS_O_HOST      <-> SLURM_SUBMIT_HOST
PBS_ARRAY_INDEX <-> SLURM_ARRAY_TASK_ID
PBS_QUEUE       <-> SLURM_JOB_PARTITION
```

Output/error directive paths also stay separate from runtime shell-variable translation. PBS-style `$PBS_JOBID`/`$PBS_JOBNAME` intent can be translated to Slurm `%j`/`%x` filename patterns, while Slurm `%` filename patterns are preserved as review comments when targeting PBS because modern PBS does not provide a portable equivalent.

Non-equivalent runtime concepts stay distinct. In particular:

```text
PBS_NODEFILE != SLURM_JOB_NODELIST
```

The former is a file path and the latter is a node-list expression. The converter therefore preserves the original variable and emits a warning.

## Script Body Analysis

`core/script-analysis.js` scans preserved executable lines for scheduler-specific launch/control commands. It does not rewrite application commands automatically. For example, `srun` is preserved when targeting PBS but a review warning is emitted, while `mpiexec`/`mpirun` are preserved when targeting Slurm with a reminder to verify the MPI integration expected by the target cluster.

## Parser Validation and Preservation

Parsers distinguish between a valid recognised value and a recognised option containing invalid syntax. Invalid syntax must not quietly collapse to `null` and disappear.

Examples include malformed:

- node/task/CPU counts,
- memory values,
- GPU counts/GRES,
- array expressions,
- walltime/start time,
- PBS `select` resource values.

When a value cannot be interpreted safely, the parser records diagnostics and preserves the source intent as an unsupported/custom review item. Renderers then emit `REVIEW` comments rather than manufacturing an active target directive.

Typed GPU information, GPUs-per-socket, PBS chunk properties, and legacy node properties are also explicitly surfaced for review when the target scheduler has no portable representation.

## Unsupported and Ambiguous Syntax

Unsupported source directives are retained in `job.unsupported` and emitted in target output as comments such as:

```text
# REVIEW: source SLURM directive preserved: #SBATCH --qos=gold
```

This is intentional. The converter must not make an invalid script look authoritative by silently dropping scheduler policy.

## Testing Strategy

Tests use Node.js built-in `node:test` and import the production ES modules directly.

The v1.2 suite contains 85 Node tests and is organised by responsibility:

### Core tests

Cover conversion orchestration, duration/memory/array utilities, runtime environment-variable translation, scheduler filename patterns, and script-body analysis.

### Parser tests

Verify PBS and Slurm syntax becomes the expected `JobModel`, including malformed input and scheduler-specific review paths.

### Renderer tests

Construct neutral models directly and verify `JobModel -> PBS` and `JobModel -> Slurm` independently from parser behaviour.

### Resource tests

Cover PBS `select`, placement, legacy nodes/PPN, Slurm GPU/GRES parsing, CPU topology, memory scope, and GPU scope/type handling.

### Integration tests

Exercise full PBS -> Slurm and Slurm -> PBS conversion, dependency/mail/array matrices, malformed-input preservation, and semantic round trips.

### Catalogue tests

Every UI example is converted through the real production converter. Portable examples are also used for semantic round-trip regression tests.

### UI tests

Pure menu-plan tests verify grouping, Recommended-first ordering, scheduler filtering, and no duplicated Recommended entries. An optional Python Playwright smoke test (`npm run test:ui`) exercises the real rendered dropdown and scheduler switching when browser automation is available.

### Commands

```bash
npm run check
npm test
npm run test:coverage
npm run test:ui
```

The default CI gate remains dependency-free: syntax checks plus `npm test` must pass before GitHub Pages deployment.
