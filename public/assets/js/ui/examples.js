export const EXAMPLES = Object.freeze({
    pbs: `#!/bin/bash
#PBS -N hello_world
#PBS -q batch
#PBS -A research
#PBS -l select=2:ncpus=8:mpiprocs=8:mem=32gb:ngpus=1
#PBS -l place=scatter:exclhost
#PBS -l walltime=50:00:00
#PBS -j oe
#PBS -o hello_world.log
#PBS -m abe
#PBS -M user@example.com
#PBS -J 1-10%2
#PBS -V

cd $PBS_O_WORKDIR
module load mpich
mpiexec -n 16 hello_world`,

    slurm: `#!/bin/bash
#SBATCH --job-name=hello_world
#SBATCH --partition=batch
#SBATCH --account=research
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=8
#SBATCH --cpus-per-task=1
#SBATCH --mem=32G
#SBATCH --gpus-per-node=1
#SBATCH --time=2-02:00:00
#SBATCH --exclusive
#SBATCH --output=$SLURM_JOB_NAME-$SLURM_JOB_ID.log
#SBATCH --mail-type=BEGIN,END,FAIL
#SBATCH --mail-user=user@example.com
#SBATCH --array=1-10%2
#SBATCH --export=ALL

cd $SLURM_SUBMIT_DIR
module load mpich
srun hello_world`
});
