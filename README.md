# PBS to Slurm Converter

A lightweight browser-based utility for converting PBS/Torque/PBS Pro job scripts into Slurm batch scripts.

## Features

- Live PBS to Slurm conversion as you type or paste
- Empty input by default
- Load example PBS script
- Copy converted Slurm output
- Download converted Slurm script
- Conversion summary and warnings
- Unsupported PBS directive reporting
- PBS environment variable conversion
- Handles common PBS directives including job name, queue, walltime, nodes, memory, arrays, mail, dependencies, exports, and GPUs

## Usage

Open the following file in your browser:

```bash
python -m http.server
```

```bash
chrome http://localhost:8000/public/
```

Paste a PBS script into the input textarea, or click **Load Example**.

## Source

https://github.com/safesploitOrg/pbs-to-slurm-converter
