export const SLURM_EXAMPLE_SCRIPTS = Object.freeze({
    "basic-job": `#!/bin/bash
#SBATCH --job-name=basic-job
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --time=01:00:00

echo "Hello from Slurm"`,

    "send-email": `#!/bin/bash
#SBATCH --job-name=mail-example
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --time=01:00:00
#SBATCH --mail-user=user@example.com
#SBATCH --mail-type=BEGIN,END,FAIL

echo "Job started"
sleep 30
echo "Job complete"`,

    "mpi-job": `#!/bin/bash
#SBATCH --job-name=mpi-example
#SBATCH --partition=batch
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=8
#SBATCH --cpus-per-task=1
#SBATCH --mem=16G
#SBATCH --time=02:00:00

module load mpi
srun ./mpi-app`,

    "gpu-job": `#!/bin/bash
#SBATCH --job-name=gpu-example
#SBATCH --partition=gpu
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=8
#SBATCH --mem=32G
#SBATCH --gpus-per-node=1
#SBATCH --exclusive
#SBATCH --time=04:00:00

python train.py`,

    "output-error": `#!/bin/bash
#SBATCH --job-name=io-example
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --output=%x-%j.out
#SBATCH --error=%x-%j.err

./application`,

    "environment-variables": `#!/bin/bash
#SBATCH --job-name=environment-example
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --export=ALL,DATASET=training,OMP_NUM_THREADS=4

echo "Job: $SLURM_JOB_ID"
echo "Queue: $SLURM_JOB_PARTITION"
./application`,

    "openmp-job": `#!/bin/bash
#SBATCH --job-name=openmp-example
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=16
#SBATCH --mem=32G
#SBATCH --time=02:00:00

export OMP_NUM_THREADS=16
./openmp-app`,

    "hybrid-mpi-openmp": `#!/bin/bash
#SBATCH --job-name=hybrid-example
#SBATCH --partition=batch
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=4
#SBATCH --cpus-per-task=4
#SBATCH --mem=32G
#SBATCH --time=04:00:00

export OMP_NUM_THREADS=4
srun ./hybrid-app`,

    "exclusive-node": `#!/bin/bash
#SBATCH --job-name=exclusive-example
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=32
#SBATCH --mem=64G
#SBATCH --exclusive
#SBATCH --time=06:00:00

./application`,

    "pbs-select-resources": `#!/bin/bash
#SBATCH --job-name=resource-topology-example
#SBATCH --partition=batch
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=8
#SBATCH --cpus-per-task=2
#SBATCH --mem=64G
#SBATCH --gpus-per-node=2
#SBATCH --time=08:00:00

srun ./application`,

    "job-array": `#!/bin/bash
#SBATCH --job-name=array-example
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --array=1-100%10

./process-item "$SLURM_ARRAY_TASK_ID"`,

    "job-dependency": `#!/bin/bash
#SBATCH --job-name=dependency-example
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --dependency=afterok:12345,afterany:67890

./post-process`,

    "delayed-start": `#!/bin/bash
#SBATCH --job-name=delayed-example
#SBATCH --partition=batch
#SBATCH --nodes=1
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G
#SBATCH --begin=2026-10-02T14:30:00

./application`,

    "review-required": `#!/bin/bash
#SBATCH --job-name=review-example
#SBATCH --partition=batch
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=4
#SBATCH --qos=gold
#SBATCH --constraint=avx512
#SBATCH --dependency=afterok:12345?afterany:67890

scontrol show job "$SLURM_JOB_ID"
srun hostname`
});
