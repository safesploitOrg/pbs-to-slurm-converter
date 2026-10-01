import test from "node:test";
import assert from "node:assert/strict";
import { convert } from "../../public/assets/js/core/converter.js";

test("PBS mail matrix renders precise Slurm events", () => {
    const cases = new Map([
        ["b", "BEGIN"],
        ["e", "END"],
        ["a", "FAIL"],
        ["be", "BEGIN,END"],
        ["abe", "BEGIN,END,FAIL"],
        ["j", "ARRAY_TASKS"]
    ]);

    for (const [flags, expected] of cases) {
        const result = convert({
            input: `#!/bin/bash\n#PBS -M user@example.com\n#PBS -m ${flags}\necho test`,
            sourceScheduler: "pbs",
            targetScheduler: "slurm"
        });
        assert.match(result.output, new RegExp(`#SBATCH --mail-type=${expected}`), flags);
    }
});

test("Slurm-only mail events remain visible when targeting PBS", () => {
    const result = convert({
        input: "#!/bin/bash\n#SBATCH --mail-user=user@example.com\n#SBATCH --mail-type=BEGIN,REQUEUE,STAGE_OUT,INVALID_DEPEND\necho test",
        sourceScheduler: "slurm",
        targetScheduler: "pbs"
    });
    assert.match(result.output, /#PBS -m b/);
    assert.match(result.output, /REVIEW: Slurm mail events not represented in PBS: requeue, stage_out, invalid_dependency/);
});

test("portable dependencies convert in both directions", () => {
    const pbs = convert({
        input: "#!/bin/bash\n#PBS -W depend=after:1,afterany:2,afterok:3,afternotok:4\necho test",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.match(pbs.output, /#SBATCH --dependency=after:1,afterany:2,afterok:3,afternotok:4/);

    const slurm = convert({
        input: "#!/bin/bash\n#SBATCH --dependency=after:1,afterany:2,afterok:3,afternotok:4\necho test",
        sourceScheduler: "slurm",
        targetScheduler: "pbs"
    });
    assert.match(slurm.output, /#PBS -W depend=after:1,afterany:2,afterok:3,afternotok:4/);
});

test("scheduler-specific dependencies are review-only", () => {
    const pbs = convert({
        input: "#!/bin/bash\n#PBS -W depend=beforeok:123,runone:456\necho test",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.match(pbs.output, /REVIEW: PBS dependencies without a portable Slurm mapping/);

    const slurm = convert({
        input: "#!/bin/bash\n#SBATCH --dependency=singleton\necho test",
        sourceScheduler: "slurm",
        targetScheduler: "pbs"
    });
    assert.match(slurm.output, /REVIEW: dependencies without a portable PBS mapping: singleton/);
});
