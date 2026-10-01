export const PBS_EXAMPLE_SCRIPTS = Object.freeze({
    "basic-job": `#!/bin/bash

#PBS -N basic-job
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=2gb
#PBS -l walltime=00:05:00

cd "\${PBS_O_WORKDIR}"
set -euo pipefail

echo "Basic PBS job"
echo "Job ID:     \${PBS_JOBID}"
echo "Job name:   \${PBS_JOBNAME}"
echo "Node:       $(hostname)"
echo "Start time: $(date)"

sleep 10

echo "End time:   $(date)"
echo "Job completed successfully."`,

    "send-email": `#!/bin/bash

#PBS -N mail-test
#PBS -o mail-test.out
#PBS -e mail-test.err

#PBS -l select=1:ncpus=1
#PBS -l walltime=00:02:00

# Replace this address before submitting the job.
#PBS -M user@example.com
#PBS -m abe

cd "\${PBS_O_WORKDIR}"

echo "PBS mail test"
echo "Job ID:      \${PBS_JOBID}"
echo "Job name:    \${PBS_JOBNAME}"
echo "Node:        $(hostname)"
echo "Start time:  $(date)"

sleep 30

echo "End time:    $(date)"
echo "Job completed successfully."`,

    "mpi-job": `#!/bin/bash

#PBS -N mpi-example
#PBS -q batch
#PBS -l select=2:ncpus=8:mpiprocs=8:mem=16gb
#PBS -l place=scatter
#PBS -l walltime=00:15:00

cd "\${PBS_O_WORKDIR}"
module load openmpi

echo "MPI job: \${PBS_JOBID}"
echo "Allocated vnode file: \${PBS_NODEFILE}"
echo "Starting 16 MPI ranks at $(date)"

mpiexec -n 16 ./mpi-app

echo "MPI job finished at $(date)"`,

    "gpu-job": `#!/bin/bash

#PBS -N gpu-example
#PBS -q gpu
#PBS -l select=1:ncpus=4:mem=8gb:ngpus=1
#PBS -l walltime=00:10:00

cd "\${PBS_O_WORKDIR}"

echo "GPU validation job"
echo "Job ID: \${PBS_JOBID}"
echo "Node:   $(hostname)"
echo "Start:  $(date)"

nvidia-smi

# Replace this with your real GPU workload.
python gpu_workload.py

echo "End:    $(date)"`,

    "output-error": `#!/bin/bash

#PBS -N io-example
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=4gb
#PBS -l walltime=00:05:00
#PBS -o io-example.out
#PBS -e io-example.err

cd "\${PBS_O_WORKDIR}"

echo "This line is written to standard output."
echo "Job ID: \${PBS_JOBID}"
echo "This line is written to standard error." >&2

sleep 5

echo "Inspect the .out and .err files after the job completes."`,

    "environment-variables": `#!/bin/bash

#PBS -N environment-example
#PBS -q batch
#PBS -l select=1:ncpus=4:mem=8gb
#PBS -l walltime=00:05:00
#PBS -V
#PBS -v DATASET=training,OMP_NUM_THREADS=4

cd "\${PBS_O_WORKDIR}"

echo "Job ID:           \${PBS_JOBID}"
echo "Job name:         \${PBS_JOBNAME}"
echo "Queue:            \${PBS_QUEUE}"
echo "Submit directory: \${PBS_O_WORKDIR}"
echo "Dataset:          \${DATASET}"
echo "OMP threads:      \${OMP_NUM_THREADS}"

./application`,

    "openmp-job": `#!/bin/bash

#PBS -N openmp-example
#PBS -q batch
#PBS -l select=1:ncpus=16:ompthreads=16:mem=32gb
#PBS -l walltime=00:15:00

cd "\${PBS_O_WORKDIR}"
export OMP_NUM_THREADS=16
export OMP_PLACES=cores
export OMP_PROC_BIND=close

echo "OpenMP threads: \${OMP_NUM_THREADS}"
echo "Node: $(hostname)"

./openmp-app`,

    "hybrid-mpi-openmp": `#!/bin/bash

#PBS -N hybrid-example
#PBS -q batch
#PBS -l select=2:ncpus=16:mpiprocs=4:ompthreads=4:mem=32gb
#PBS -l place=scatter
#PBS -l walltime=00:30:00

cd "\${PBS_O_WORKDIR}"
module load openmpi
export OMP_NUM_THREADS=4
export OMP_PLACES=cores
export OMP_PROC_BIND=spread

echo "Running 4 MPI ranks per chunk with \${OMP_NUM_THREADS} OpenMP threads each."

mpiexec -n 8 ./hybrid-app`,

    "exclusive-node": `#!/bin/bash

#PBS -N exclusive-example
#PBS -q batch
#PBS -l select=1:ncpus=32:mem=64gb
#PBS -l place=scatter:exclhost
#PBS -l walltime=00:20:00

cd "\${PBS_O_WORKDIR}"

echo "Exclusive-host job"
echo "Job ID: \${PBS_JOBID}"
echo "Node:   $(hostname)"

./application`,

    "pbs-select-resources": `#!/bin/bash

#PBS -N select-example
#PBS -q batch
#PBS -l select=4:ncpus=16:mpiprocs=8:ompthreads=2:mem=64gb:ngpus=2
#PBS -l place=scatter
#PBS -l walltime=00:30:00

cd "\${PBS_O_WORKDIR}"

echo "PBS select/chunk resource example"
echo "8 MPI processes per chunk"
echo "2 OpenMP threads per process"
echo "2 GPUs per chunk"

mpiexec -n 32 ./application`,

    "job-array": `#!/bin/bash

#PBS -N array-example
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=4gb
#PBS -l walltime=00:05:00
#PBS -J 1-10%2

cd "\${PBS_O_WORKDIR}"

echo "Array task: \${PBS_ARRAY_INDEX}"
echo "Node:       $(hostname)"

INPUT_FILE="input_\${PBS_ARRAY_INDEX}.dat"
echo "Would process: \${INPUT_FILE}"

# Replace the echo above with your real processing command.
# ./process-item "\${INPUT_FILE}"`,

    "job-dependency": `#!/bin/bash

#PBS -N dependency-example
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=4gb
#PBS -l walltime=00:05:00

# Replace the example IDs with jobs that already exist on your cluster.
#PBS -W depend=afterok:12345,afterany:67890

cd "\${PBS_O_WORKDIR}"

echo "Dependency-controlled job"
echo "Job ID: \${PBS_JOBID}"
echo "Started after the requested dependency conditions were satisfied."

./post-process`,

    "delayed-start": `#!/bin/bash

#PBS -N delayed-example
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=4gb
#PBS -l walltime=00:05:00
#PBS -a 202610021430.00

cd "\${PBS_O_WORKDIR}"

echo "Delayed-start example"
echo "Job ID: \${PBS_JOBID}"
echo "Actual start: $(date)"

./application`,

    "legacy-torque": `#!/bin/bash

#PBS -N torque-example
#PBS -q batch
#PBS -l nodes=2:ppn=8:gpus=1
#PBS -l walltime=00:15:00
#PBS -t 1-10

cd "\${PBS_O_WORKDIR}"

echo "Legacy TORQUE-style resource request"
echo "Array index: \${PBS_ARRAYID:-unknown}"

module load openmpi
mpiexec -n 16 ./application`,

    "review-required": `#!/bin/bash

#PBS -N review-example
#PBS -q batch
#PBS -l select=1:ncpus=8+2:ncpus=32
#PBS -l scratch=100gb
#PBS -W umask=0027

cd "\${PBS_O_WORKDIR}"

echo "This example intentionally includes PBS-specific or ambiguous features."
echo "The converter should preserve them as REVIEW items rather than guessing."

pbsdsh hostname`
});
