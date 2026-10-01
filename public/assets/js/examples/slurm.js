export const SLURM_EXAMPLE_SCRIPTS = Object.freeze({
    "basic-job": `#!/bin/bash

#SBATCH --job-name=basic-job
#SBATCH --partition=batch
#SBATCH --time=00:05:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=2G

set -euo pipefail

echo "Basic Slurm job"
echo "Job ID:     \${SLURM_JOB_ID}"
echo "Job name:   \${SLURM_JOB_NAME}"
echo "Node:       $(hostname)"
echo "Start time: $(date)"

sleep 10

echo "End time:   $(date)"
echo "Job completed successfully."`,

    "send-email": `#!/bin/bash

#SBATCH --job-name=mail-test
#SBATCH --output=mail-test-%j.out
#SBATCH --error=mail-test-%j.err

#SBATCH --time=00:02:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1

# Replace this address before submitting the job.
#SBATCH --mail-user=user@example.com
#SBATCH --mail-type=BEGIN,END,FAIL

echo "Slurm mail test"
echo "Job ID:      \${SLURM_JOB_ID}"
echo "Job name:    \${SLURM_JOB_NAME}"
echo "Node:        $(hostname)"
echo "Start time:  $(date)"

sleep 30

echo "End time:    $(date)"
echo "Job completed successfully."`,

    "mpi-job": `#!/bin/bash

#SBATCH --job-name=mpi-example
#SBATCH --partition=batch
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=8
#SBATCH --cpus-per-task=1
#SBATCH --mem=16G
#SBATCH --time=00:15:00

module load openmpi

echo "MPI job: \${SLURM_JOB_ID}"
echo "Allocated nodes:"
scontrol show hostnames "\${SLURM_JOB_NODELIST}"
echo "Starting 16 MPI ranks at $(date)"

srun ./mpi-app

echo "MPI job finished at $(date)"`,

    "gpu-job": `#!/bin/bash

#SBATCH --job-name=gpu-example
#SBATCH --partition=gpu
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --gpus-per-node=1
#SBATCH --time=00:10:00

echo "GPU validation job"
echo "Job ID: \${SLURM_JOB_ID}"
echo "Node:   $(hostname)"
echo "Start:  $(date)"

nvidia-smi

# Replace this with your real GPU workload.
python gpu_workload.py

echo "End:    $(date)"`,

    "output-error": `#!/bin/bash

#SBATCH --job-name=io-example
#SBATCH --partition=batch
#SBATCH --time=00:05:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.err

echo "This line is written to standard output."
echo "Job ID: \${SLURM_JOB_ID}"
echo "This line is written to standard error." >&2

sleep 5

echo "Inspect the .out and .err files after the job completes."`,

    "environment-variables": `#!/bin/bash

#SBATCH --job-name=environment-example
#SBATCH --partition=batch
#SBATCH --time=00:05:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --export=ALL,DATASET=training,OMP_NUM_THREADS=4

echo "Job ID:           \${SLURM_JOB_ID}"
echo "Job name:         \${SLURM_JOB_NAME}"
echo "Partition:        \${SLURM_JOB_PARTITION}"
echo "Submit directory: \${SLURM_SUBMIT_DIR}"
echo "Dataset:          \${DATASET}"
echo "OMP threads:      \${OMP_NUM_THREADS}"

cd "\${SLURM_SUBMIT_DIR}"
./application`,

    "openmp-job": `#!/bin/bash

#SBATCH --job-name=openmp-example
#SBATCH --partition=batch
#SBATCH --time=00:15:00
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=16
#SBATCH --mem=32G

export OMP_NUM_THREADS="\${SLURM_CPUS_PER_TASK:-16}"
export OMP_PLACES=cores
export OMP_PROC_BIND=close

echo "OpenMP threads: \${OMP_NUM_THREADS}"
echo "Node: $(hostname)"

./openmp-app`,

    "hybrid-mpi-openmp": `#!/bin/bash

#SBATCH --job-name=hybrid-example
#SBATCH --partition=batch
#SBATCH --time=00:30:00
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=4
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G

module load openmpi
export OMP_NUM_THREADS="\${SLURM_CPUS_PER_TASK:-4}"
export OMP_PLACES=cores
export OMP_PROC_BIND=spread

echo "Running 4 MPI ranks per node with \${OMP_NUM_THREADS} OpenMP threads each."

srun ./hybrid-app`,

    "exclusive-node": `#!/bin/bash

#SBATCH --job-name=exclusive-example
#SBATCH --partition=batch
#SBATCH --time=00:20:00
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=32
#SBATCH --mem=64G
#SBATCH --exclusive

echo "Exclusive-node job"
echo "Job ID: \${SLURM_JOB_ID}"
echo "Node:   $(hostname)"

./application`,

    "pbs-select-resources": `#!/bin/bash

#SBATCH --job-name=resource-topology-example
#SBATCH --partition=batch
#SBATCH --time=00:30:00
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=8
#SBATCH --cpus-per-task=2
#SBATCH --mem=64G
#SBATCH --gpus-per-node=2

echo "Resource topology example"
echo "Nodes: \${SLURM_JOB_NUM_NODES:-4}"
echo "Tasks per node: 8"
echo "CPUs per task: 2"

echo "Starting workload..."
srun ./application`,

    "job-array": `#!/bin/bash

#SBATCH --job-name=array-example
#SBATCH --partition=batch
#SBATCH --time=00:05:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --array=1-10%2
#SBATCH --output=array-%A_%a.out

echo "Array job ID: \${SLURM_ARRAY_JOB_ID}"
echo "Array task:   \${SLURM_ARRAY_TASK_ID}"
echo "Node:         $(hostname)"

INPUT_FILE="input_\${SLURM_ARRAY_TASK_ID}.dat"
echo "Would process: \${INPUT_FILE}"

# Replace the echo above with your real processing command.
# ./process-item "\${INPUT_FILE}"`,

    "job-dependency": `#!/bin/bash

#SBATCH --job-name=dependency-example
#SBATCH --partition=batch
#SBATCH --time=00:05:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G

# Replace the example IDs with jobs that already exist on your cluster.
#SBATCH --dependency=afterok:12345,afterany:67890

echo "Dependency-controlled job"
echo "Job ID: \${SLURM_JOB_ID}"
echo "Started after the requested dependency conditions were satisfied."

./post-process`,

    "delayed-start": `#!/bin/bash

#SBATCH --job-name=delayed-example
#SBATCH --partition=batch
#SBATCH --time=00:05:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --begin=2026-10-02T14:30:00

echo "Delayed-start example"
echo "Job ID: \${SLURM_JOB_ID}"
echo "Actual start: $(date)"

./application`,

    "review-required": `#!/bin/bash

#SBATCH --job-name=review-example
#SBATCH --partition=batch
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=4
#SBATCH --qos=gold
#SBATCH --constraint=avx512
#SBATCH --dependency=afterok:12345?afterany:67890

echo "This example intentionally includes Slurm-specific features."
echo "The converter should preserve them as REVIEW items rather than guessing."

scontrol show job "\${SLURM_JOB_ID}"
srun hostname`
});
