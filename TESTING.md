# Testing

The converter uses Node.js built-in `node:test` and imports the same ES modules used by the browser.

## Commands

```bash
npm run check
npm test
npm run test:coverage
npm run test:ui
```

`npm run test:ui` is optional browser automation. It uses Python Playwright when available and skips cleanly where browser automation is unavailable.

## Coverage Areas

The v1.3 suite contains 96 Node tests covering:

- core conversion orchestration,
- PBS and Slurm parsers,
- PBS and Slurm renderers,
- modern PBS `select` and legacy TORQUE resources,
- Slurm GPU/GRES parsing,
- memory scope and virtual-memory review behaviour,
- mail-event matrices,
- portable and scheduler-specific dependencies,
- arrays including steps/concurrency/multi-range review,
- runtime environment variables,
- output/error filename patterns,
- delayed-start handling,
- scheduler-specific runtime command analysis,
- malformed-input preservation,
- OpenPBS/PBS Professional/TORQUE rendering,
- full conversion integration,
- semantic round trips,
- example-registry/menu logic,
- realistic Recommended example structure,
- PBS/Slurm command-helper catalogue and target emphasis,
- every shipped PBS and Slurm example.

## Core Invariants

Tests enforce several safety properties:

1. Unsupported or malformed scheduler syntax must not disappear silently.
2. The converter must not invent an exact mapping where scheduler semantics differ.
3. `PBS_NODEFILE` and `SLURM_JOB_NODELIST` remain distinct concepts.
4. PBS execution group is not Slurm accounting identity.
5. Scheduler-specific GPU type/property information must be surfaced for review when it cannot be expressed portably.
6. Recommended examples appear once, before normal categories.
7. The example catalogue and regression tests share the same production data.
8. The command helper always exposes both scheduler families and only changes emphasis based on the current target.
