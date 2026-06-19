const PBS_EXAMPLE = `#!/bin/bash

#PBS -N hello_world
#PBS -q batch
#PBS -l nodes=2:ppn=8
#PBS -l walltime=500:00:00
#PBS -l mem=64gb
#PBS -j oe
#PBS -o $PBS_JOBNAME-$PBS_JOBID.log
#PBS -m abe
#PBS -M user@example.com
#PBS -J 1-10
#PBS -V

cd $PBS_O_WORKDIR

module load mpich

mpiexec -n 16 hello_world`;

const PBS_ENVIRONMENT_REPLACEMENTS = [
    [/\$PBS_O_WORKDIR/g, "$SLURM_SUBMIT_DIR"],
    [/\$PBS_JOBID/g, "$SLURM_JOB_ID"],
    [/\$PBS_JOBNAME/g, "$SLURM_JOB_NAME"],
    [/\$PBS_NODEFILE/g, "$SLURM_JOB_NODELIST"]
];

function normaliseWalltime(value) {
    const parts = value.trim().split(":").map(Number);

    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return value.trim();
    }

    const [hours, minutes, seconds] = parts;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
        return `${days}-${String(remainingHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseNodeRequest(value) {
    const nodesMatch = value.match(/nodes=(\d+)/);
    const ppnMatch = value.match(/ppn=(\d+)/);

    if (!nodesMatch) {
        return [];
    }

    const nodes = Number(nodesMatch[1]);
    const ppn = ppnMatch ? Number(ppnMatch[1]) : 1;
    const ntasks = nodes * ppn;

    return [`#SBATCH -N ${nodes}`, `#SBATCH -n ${ntasks}`];
}

function parseSelectRequest(value) {
    const selectMatch = value.match(/select=(\d+)/);
    const ncpusMatch = value.match(/ncpus=(\d+)/);
    const mpiprocsMatch = value.match(/mpiprocs=(\d+)/);
    const ompthreadsMatch = value.match(/ompthreads=(\d+)/);
    const ngpusMatch = value.match(/(?:ngpus|gpu|gpus)=(\d+)/);

    if (!selectMatch) {
        return [];
    }

    const output = [`#SBATCH --nodes=${selectMatch[1]}`];

    if (mpiprocsMatch) {
        output.push(`#SBATCH --ntasks-per-node=${mpiprocsMatch[1]}`);
    }

    if (ompthreadsMatch) {
        output.push(`#SBATCH --cpus-per-task=${ompthreadsMatch[1]}`);
    } else if (ncpusMatch && !mpiprocsMatch) {
        output.push(`#SBATCH --cpus-per-task=${ncpusMatch[1]}`);
    }

    if (ngpusMatch) {
        output.push(`#SBATCH --gpus=${ngpusMatch[1]}`);
    }

    return output;
}

function mapMailType(value) {
    const cleanValue = value.trim().toLowerCase();

    if (cleanValue === "n") {
        return "NONE";
    }

    if (cleanValue.includes("a") && cleanValue.includes("b") && cleanValue.includes("e")) {
        return "ALL";
    }

    const types = [];

    if (cleanValue.includes("b")) {
        types.push("BEGIN");
    }

    if (cleanValue.includes("e")) {
        types.push("END");
    }

    if (cleanValue.includes("a")) {
        types.push("FAIL");
    }

    return types.length > 0 ? types.join(",") : cleanValue.toUpperCase();
}

function convertDependency(value) {
    return value.replace(/^depend=/, "");
}

function replaceEnvironmentVariables(line) {
    return PBS_ENVIRONMENT_REPLACEMENTS.reduce((updatedLine, [pattern, replacement]) => {
        return updatedLine.replace(pattern, replacement);
    }, line);
}

function convertDirective(line, summary, warnings) {
    const directive = line.replace(/^#PBS\s+/, "").trim();

    if (directive.startsWith("-N ")) {
        summary.push("Job name converted");
        return [`#SBATCH --job-name="${directive.slice(3).trim()}"`];
    }

    if (directive.startsWith("-q ")) {
        summary.push("Queue converted to partition");
        return [`#SBATCH -p ${directive.slice(3).trim()}`];
    }

    if (directive.startsWith("-l ")) {
        const resource = directive.slice(3).trim();

        if (resource.startsWith("nodes=")) {
            summary.push("PBS nodes/ppn converted to Slurm nodes/tasks");
            return parseNodeRequest(resource);
        }

        if (resource.startsWith("select=")) {
            summary.push("PBS select statement converted");
            warnings.push("Review converted select statement manually; cluster policies vary.");
            return parseSelectRequest(resource);
        }

        if (resource.startsWith("walltime=")) {
            summary.push("Walltime converted");
            return [`#SBATCH -t ${normaliseWalltime(resource.replace("walltime=", ""))}`];
        }

        if (resource.startsWith("mem=")) {
            summary.push("Memory converted");
            return [`#SBATCH --mem=${resource.replace("mem=", "")}`];
        }

        if (resource.startsWith("pmem=")) {
            summary.push("Per-CPU memory converted");
            return [`#SBATCH --mem-per-cpu=${resource.replace("pmem=", "")}`];
        }

        if (resource.startsWith("ngpus=")) {
            summary.push("GPU request converted");
            return [`#SBATCH --gpus=${resource.replace("ngpus=", "")}`];
        }
    }

    if (directive.startsWith("-o ")) {
        summary.push("Output log converted");
        return [`#SBATCH --output=${replaceEnvironmentVariables(directive.slice(3).trim())}`];
    }

    if (directive.startsWith("-e ")) {
        summary.push("Error log converted");
        return [`#SBATCH --error=${replaceEnvironmentVariables(directive.slice(3).trim())}`];
    }

    if (directive === "-j oe") {
        summary.push("Joined stdout/stderr detected; Slurm combines output unless --error is set separately");
        return [];
    }

    if (directive.startsWith("-m ")) {
        summary.push("Mail notification type converted");
        return [`#SBATCH --mail-type=${mapMailType(directive.slice(3))}`];
    }

    if (directive.startsWith("-M ")) {
        summary.push("Mail recipient converted");
        return [`#SBATCH --mail-user=${directive.slice(3).trim()}`];
    }

    if (directive.startsWith("-J ")) {
        summary.push("Job array converted");
        return [`#SBATCH --array=${directive.slice(3).trim()}`];
    }

    if (directive === "-V") {
        summary.push("Environment export converted");
        return ["#SBATCH --export=ALL"];
    }

    if (directive.startsWith("-v ")) {
        summary.push("Variable export converted");
        return [`#SBATCH --export=${directive.slice(3).trim()}`];
    }

    if (directive.startsWith("-W ")) {
        const value = directive.slice(3).trim();

        if (value.startsWith("depend=")) {
            summary.push("Dependency converted");
            return [`#SBATCH --dependency=${convertDependency(value)}`];
        }

        if (value.startsWith("group_list=")) {
            summary.push("Group/account converted");
            return [`#SBATCH --account=${value.replace("group_list=", "")}`];
        }
    }

    if (directive === "-r y") {
        summary.push("Requeue flag converted");
        return ["#SBATCH --requeue"];
    }

    if (directive === "-r n") {
        summary.push("No-requeue flag converted");
        return ["#SBATCH --no-requeue"];
    }

    warnings.push(`Unsupported PBS directive: #PBS ${directive}`);
    return [`# Unsupported PBS directive: #PBS ${directive}`];
}

function convertPbsToSlurm(input) {
    const lines = input.split(/\r?\n/);
    const output = [];
    const summary = [];
    const warnings = [];

    for (const line of lines) {
        if (line.trim().startsWith("#PBS")) {
            output.push(...convertDirective(line.trim(), summary, warnings));
            continue;
        }

        output.push(replaceEnvironmentVariables(line));
    }

    return {
        output: output.join("\n").trimEnd(),
        summary,
        warnings
    };
}
