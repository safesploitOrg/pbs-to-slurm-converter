export const PBS_EXAMPLE_SCRIPTS = Object.freeze({
    "basic-job": `#!/bin/bash
#PBS -N basic-job
#PBS -q batch
#PBS -l select=1:ncpus=4:mem=8gb
#PBS -l walltime=01:00:00

cd $PBS_O_WORKDIR
echo "Hello from PBS"`,

    "send-email": `#!/bin/bash
#PBS -N mail-example
#PBS -q batch
#PBS -l select=1:ncpus=4:mem=8gb
#PBS -l walltime=01:00:00
#PBS -M user@example.com
#PBS -m abe

cd $PBS_O_WORKDIR
echo "Job started"
sleep 30
echo "Job complete"`,

    "mpi-job": `#!/bin/bash
#PBS -N mpi-example
#PBS -q batch
#PBS -l select=2:ncpus=8:mpiprocs=8:mem=16gb
#PBS -l place=scatter
#PBS -l walltime=02:00:00

cd $PBS_O_WORKDIR
module load mpi
mpiexec -n 16 ./mpi-app`,

    "gpu-job": `#!/bin/bash
#PBS -N gpu-example
#PBS -q gpu
#PBS -l select=1:ncpus=8:mem=32gb:ngpus=1
#PBS -l place=exclhost
#PBS -l walltime=04:00:00

cd $PBS_O_WORKDIR
python train.py`,

    "output-error": `#!/bin/bash
#PBS -N io-example
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=4gb
#PBS -o $PBS_JOBNAME-$PBS_JOBID.out
#PBS -e $PBS_JOBNAME-$PBS_JOBID.err

cd $PBS_O_WORKDIR
./application`,

    "environment-variables": `#!/bin/bash
#PBS -N environment-example
#PBS -q batch
#PBS -l select=1:ncpus=4:mem=8gb
#PBS -V
#PBS -v DATASET=training,OMP_NUM_THREADS=4

cd $PBS_O_WORKDIR
echo "Job: $PBS_JOBID"
echo "Queue: $PBS_QUEUE"
./application`,

    "openmp-job": `#!/bin/bash
#PBS -N openmp-example
#PBS -q batch
#PBS -l select=1:ncpus=16:ompthreads=16:mem=32gb
#PBS -l walltime=02:00:00

cd $PBS_O_WORKDIR
export OMP_NUM_THREADS=16
./openmp-app`,

    "hybrid-mpi-openmp": `#!/bin/bash
#PBS -N hybrid-example
#PBS -q batch
#PBS -l select=2:ncpus=16:mpiprocs=4:ompthreads=4:mem=32gb
#PBS -l place=scatter
#PBS -l walltime=04:00:00

cd $PBS_O_WORKDIR
export OMP_NUM_THREADS=4
mpiexec -n 8 ./hybrid-app`,

    "exclusive-node": `#!/bin/bash
#PBS -N exclusive-example
#PBS -q batch
#PBS -l select=1:ncpus=32:mem=64gb
#PBS -l place=scatter:exclhost
#PBS -l walltime=06:00:00

cd $PBS_O_WORKDIR
./application`,

    "pbs-select-resources": `#!/bin/bash
#PBS -N select-example
#PBS -q batch
#PBS -l select=4:ncpus=16:mpiprocs=8:ompthreads=2:mem=64gb:ngpus=2
#PBS -l place=scatter
#PBS -l walltime=08:00:00

cd $PBS_O_WORKDIR
mpiexec -n 32 ./application`,

    "job-array": `#!/bin/bash
#PBS -N array-example
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=4gb
#PBS -J 1-100%10

cd $PBS_O_WORKDIR
./process-item "$PBS_ARRAY_INDEX"`,

    "job-dependency": `#!/bin/bash
#PBS -N dependency-example
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=4gb
#PBS -W depend=afterok:12345,afterany:67890

cd $PBS_O_WORKDIR
./post-process`,

    "delayed-start": `#!/bin/bash
#PBS -N delayed-example
#PBS -q batch
#PBS -l select=1:ncpus=2:mem=4gb
#PBS -a 202610021430.00

cd $PBS_O_WORKDIR
./application`,

    "legacy-torque": `#!/bin/bash
#PBS -N torque-example
#PBS -q batch
#PBS -l nodes=2:ppn=8:gpus=1
#PBS -l walltime=02:00:00
#PBS -t 1-10

cd $PBS_O_WORKDIR
mpiexec -n 16 ./application`,

    "review-required": `#!/bin/bash
#PBS -N review-example
#PBS -q batch
#PBS -l select=1:ncpus=8+2:ncpus=32
#PBS -l scratch=100gb
#PBS -W umask=0027

cd $PBS_O_WORKDIR
pbsdsh hostname`
});
