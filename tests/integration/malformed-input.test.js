import test from "node:test";
import assert from "node:assert/strict";
import { convert } from "../../public/assets/js/core/converter.js";

test("malformed PBS syntax never crashes or silently disappears", () => {
    const input = `#!/bin/bash
#PBS -l walltime=banana
#PBS -l select=1:ncpus=banana
#PBS -l mem=nope
#PBS -J a-b
echo test`;

    const result = convert({ input, sourceScheduler: "pbs", targetScheduler: "slurm" });
    assert(result.output.length > 0);
    assert(result.warnings.length > 0);
    assert.match(result.output, /REVIEW:/);
    assert.match(result.output, /walltime=banana|source resource preserved/);
    assert.match(result.output, /-J a-b/);
});

test("malformed Slurm syntax never crashes or silently disappears", () => {
    const input = `#!/bin/bash
#SBATCH --nodes=foo
#SBATCH --mem=
#SBATCH --gpus=banana
#SBATCH --array=a-b
#SBATCH --time=banana
echo test`;

    const result = convert({ input, sourceScheduler: "slurm", targetScheduler: "pbs" });
    assert(result.output.length > 0);
    assert(result.warnings.length > 0);
    assert.match(result.output, /REVIEW:/);
    assert.match(result.output, /--nodes=foo/);
    assert.match(result.output, /--array=a-b/);
});

test("CRLF, blank lines and quoted values are tolerated", () => {
    const input = "#!/bin/bash\r\n#PBS -N \"quoted job\"\r\n#PBS -q batch\r\n\r\necho test\r\n";
    const result = convert({ input, sourceScheduler: "pbs", targetScheduler: "slurm" });
    assert.match(result.output, /#SBATCH --job-name="quoted job"/);
});

test("relative or malformed start times are review-only when the target cannot represent them", () => {
    const slurm = convert({
        input: "#!/bin/bash\n#SBATCH --begin=now+1hour\necho test",
        sourceScheduler: "slurm",
        targetScheduler: "pbs"
    });
    assert.doesNotMatch(slurm.output, /#PBS -a /);
    assert.match(slurm.output, /REVIEW: start time 'now\+1hour'/);

    const pbs = convert({
        input: "#!/bin/bash\n#PBS -a 101230\necho test",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.doesNotMatch(pbs.output, /#SBATCH --begin=/);
    assert.match(pbs.output, /REVIEW: PBS start time '101230'/);
});

test("PBS physical and virtual memory variants remain distinguishable", () => {
    const result = convert({
        input: "#!/bin/bash\n#PBS -l mem=8gb\n#PBS -l pmem=2gb\n#PBS -l vmem=16gb\n#PBS -l pvmem=4gb\necho test",
        sourceScheduler: "pbs",
        targetScheduler: "slurm"
    });
    assert.match(result.output, /#SBATCH --mem=8G/);
    assert.match(result.output, /#SBATCH --mem-per-cpu=2G/);
    assert.match(result.output, /REVIEW: PBS vmem=16G/);
    assert.match(result.output, /REVIEW: PBS pvmem=4G/);
});
