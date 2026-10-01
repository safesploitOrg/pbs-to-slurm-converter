#!/bin/bash
#SBATCH --job-name=research-job
#SBATCH --partition=batch
#SBATCH --account=science
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=4
#SBATCH --cpus-per-task=2
#SBATCH --mem=32G
#SBATCH --gpus-per-node=1
#SBATCH --time=1-01:30:00
#SBATCH --exclusive
#SBATCH --output=%x-%j.out
#SBATCH --mail-type=BEGIN,END,FAIL
#SBATCH --mail-user=user@example.com
#SBATCH --array=1-20%4
#SBATCH --export=ALL

cd $SLURM_SUBMIT_DIR
srun ./application
