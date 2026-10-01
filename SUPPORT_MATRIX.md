# Conversion Support Matrix

This document records the intended support level for scheduler semantics in v1.1.0.

## Support Levels

- **Exact/portable** - normally converted automatically with no semantic warning.
- **Best effort** - converted, but the converter emits a warning because scheduler or site policy can change the meaning.
- **Preserve/review** - not emitted as an active target directive; source intent is preserved as a review comment.

## Core Job Options

| Concept | PBS family | Slurm | Level / Notes |
|---|---|---|---|
| Job name | `-N` | `--job-name`, `-J` | Exact |
| Queue / partition | `-q` | `--partition`, `-p` | Best effort: names are cluster-specific |
| Account | `-A` | `--account`, `-A` | Exact structurally; values remain site-specific |
| PBS project | `-P` | no distinct portable equivalent | Preserve/review |
| PBS execution group | `-W group_list=` | no equivalent to execution-group semantics | Preserve/review; never mapped to `--account` |
| Hold | `-h` | `--hold` | Exact intent |
| Requeue / rerunnable | `-r y/n` | `--requeue` / `--no-requeue` | Best effort |
| Delayed start | `-a` | `--begin` | Exact only for fully parseable absolute timestamps; otherwise preserve/review |

## CPU / Node Resources

| Concept | PBS family | Slurm | Level / Notes |
|---|---|---|---|
| Modern chunks | `select=` | nodes/tasks topology | Best effort; PBS chunks are not inherently physical nodes |
| Placement | `place=` | distribution/topology policy | Partial; exclusivity maps well, other placement values are review items |
| Legacy nodes | `nodes=` | `--nodes` | Best effort |
| Legacy PPN | `ppn=` | `--ntasks-per-node` | Best effort |
| MPI processes | `mpiprocs=` | `--ntasks-per-node` | Strong mapping when chunk-to-node assumption is valid |
| OpenMP threads | `ompthreads=` | `--cpus-per-task` | Strong mapping |
| CPU count | `ncpus=` | task/CPU topology | Best effort if MPI/process structure is incomplete |
| Slurm `--ntasks` without nodes | no single exact portable PBS equivalent | `--ntasks` | Best effort; converter warns when distribution must be inferred |
| Heterogeneous PBS select | multiple `+` chunks | Slurm heterogeneous jobs | Preserve/review rather than guessing |

## Memory

| Concept | PBS family | Slurm | Level / Notes |
|---|---|---|---|
| Chunk `mem=` | memory per PBS chunk | `--mem` per node | Best effort; depends on chunk placement |
| PBS job `mem=` | job-scoped/site semantics | `--mem` per node | Best effort; multi-node conversion warns |
| PBS `pmem=` | per-process physical memory | `--mem-per-cpu` | Best effort; not universally equivalent |
| PBS `vmem` / `pvmem` | virtual memory | no direct common Slurm request equivalent | Preserve/review |
| Slurm `--mem-per-gpu` | no portable PBS equivalent | per GPU | Preserve/review |

## GPUs

| Concept | PBS family | Slurm | Level / Notes |
|---|---|---|---|
| Chunk GPU count | `ngpus=` / site variants | `--gpus-per-node` or total `--gpus` | Best effort depending on placement |
| Total GPUs | site/resource dependent | `--gpus` | Best effort to PBS `ngpus` |
| GPUs per node | chunk `ngpus=` | `--gpus-per-node` | Strong when one PBS chunk maps to one node |
| GPUs per task | derived from chunk/process topology | `--gpus-per-task` | Best effort |
| GPU type | site-specific resource/property | typed GPU/GRES | Preserve or best effort depending on syntax |
| Non-GPU GRES | site-specific | `--gres` | Preserve/review |

## I/O and Working Directory

| Concept | PBS family | Slurm | Level / Notes |
|---|---|---|---|
| stdout | `-o` | `--output` | Exact path intent |
| stderr | `-e` | `--error` | Exact path intent |
| join stderr -> stdout | `-j oe` | Slurm default/same output path | Strong mapping |
| join stdout -> stderr | `-j eo` | same output/error path | Best effort; ordering may differ |
| working directory | normally script behaviour / `$PBS_O_WORKDIR` | `--chdir` | Slurm -> PBS becomes an explicit shell `cd` command |

## Output Filename Patterns

Scheduler directive fields are not treated like shell script lines. Slurm documents that shell variables inside `#SBATCH` directives are literal text, so dynamic Slurm output filenames use `%` patterns such as `%j` (job ID) and `%x` (job name).

When converting PBS -> Slurm, recognised intended PBS job-name/job-ID variables in `-o`/`-e` paths are converted to Slurm filename patterns, with a warning because modern PBS Professional/OpenPBS documentation advises against variables in those PBS paths.

When converting Slurm -> PBS, dynamic Slurm `%` filename patterns are preserved as review comments and PBS default output naming is allowed to apply. The converter does not invent a non-portable PBS variable substitution.

## Mail

| PBS | Neutral event | Slurm |
|---|---|---|
| `b` | begin | `BEGIN` |
| `e` | end | `END` |
| `a` | fail/abort | `FAIL` |
| `j` | array task/subjob | `ARRAY_TASKS` |

PBS `abe` becomes `BEGIN,END,FAIL`, not Slurm `ALL`, because Slurm `ALL` contains additional events.

Slurm events such as `REQUEUE`, `STAGE_OUT`, and `INVALID_DEPEND` have no direct PBS mail-flag equivalent and are preserved as warnings when converting to PBS.

## Arrays

| Concept | OpenPBS/PBS Pro | TORQUE | Slurm | Level |
|---|---|---|---|---|
| Range | `-J X-Y[:step]` | `-t X-Y[:step]` | `--array=` | Strong |
| Max concurrent | `%N` | site/version dependent | `%N` | Best effort |
| Multiple comma-separated ranges | limited/non-portable | limited/non-portable | supported | Preserve/review when target PBS cannot safely represent it |

## Dependencies

Portable common dependency types currently include:

- `after`
- `afterany`
- `afterok`
- `afternotok`

PBS-specific `before*`, `on`, and `runone`, and Slurm-specific OR expressions, `aftercorr`, `singleton`, and similar constructs are preserved for review unless an explicit portable mapping is added.

## Environment Export

| PBS | Slurm | Level |
|---|---|---|
| `-V` | `--export=ALL` | Strong |
| `-v` | `--export=<list>` | Best effort: inheritance defaults differ |

## Runtime Environment Variables

Strong semantic pairs:

| PBS | Slurm |
|---|---|
| `PBS_O_WORKDIR` | `SLURM_SUBMIT_DIR` |
| `PBS_JOBID` | `SLURM_JOB_ID` |
| `PBS_JOBNAME` | `SLURM_JOB_NAME` |
| `PBS_O_HOST` | `SLURM_SUBMIT_HOST` |
| `PBS_ARRAY_INDEX` / TORQUE `PBS_ARRAYID` | `SLURM_ARRAY_TASK_ID` |
| `PBS_QUEUE` | `SLURM_JOB_PARTITION` |

Explicitly **not equivalent**:

```text
PBS_NODEFILE != SLURM_JOB_NODELIST
```

The converter leaves these source-specific variables in place and emits a warning rather than creating an invalid automatic substitution.

## Script Runtime Commands

The converter preserves executable commands instead of blindly rewriting launchers. It emits review diagnostics for known scheduler-coupled commands, including:

- Slurm `srun` / `scontrol` when targeting PBS.
- PBS `pbsdsh` when targeting Slurm.
- `mpiexec` / `mpirun` when targeting Slurm, because whether these should remain or become `srun` depends on the MPI build and site integration.

## Preserved Slurm Policy Options

The parser recognises but does not guess portable PBS equivalents for options including:

- `--qos`
- `--reservation`
- `--constraint`
- complex `--distribution`
- non-GPU GRES

They are emitted as `REVIEW` comments in PBS output.

## References

Primary scheduler documentation used to define the conversion model:

- SchedMD `sbatch`: https://slurm.schedmd.com/sbatch.html
- PBS Professional documentation: https://help.altair.com/
- OpenPBS documentation/project: https://openpbs.org/ and https://openpbs.atlassian.net/
- TORQUE documentation: https://docs.adaptivecomputing.com/torque/
