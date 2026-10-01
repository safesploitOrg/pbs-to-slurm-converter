import { PBS_EXAMPLE_SCRIPTS } from "./pbs.js";
import { SLURM_EXAMPLE_SCRIPTS } from "./slurm.js";

export const EXAMPLE_CATEGORIES = Object.freeze([
    { id: "general", label: "General" },
    { id: "parallel", label: "Parallel Workloads" },
    { id: "resources", label: "Resources" },
    { id: "scheduling", label: "Scheduling" },
    { id: "compatibility", label: "Compatibility" }
]);

export const EXAMPLE_DEFINITIONS = Object.freeze([
    { id: "basic-job", label: "Basic Job", category: "general", recommended: true },
    { id: "send-email", label: "Send Email", category: "general", recommended: true },
    { id: "mpi-job", label: "MPI Job", category: "parallel", recommended: true },
    { id: "gpu-job", label: "GPU Job", category: "resources", recommended: true },
    { id: "output-error", label: "Output & Error Files", category: "general" },
    { id: "environment-variables", label: "Environment Variables", category: "general" },
    { id: "openmp-job", label: "OpenMP Job", category: "parallel" },
    { id: "hybrid-mpi-openmp", label: "Hybrid MPI + OpenMP", category: "parallel" },
    { id: "exclusive-node", label: "Exclusive Node", category: "resources" },
    { id: "pbs-select-resources", label: "PBS Pro Select Resources", category: "resources" },
    { id: "job-array", label: "Job Array", category: "scheduling" },
    { id: "job-dependency", label: "Job Dependency", category: "scheduling" },
    { id: "delayed-start", label: "Delayed Start", category: "scheduling" },
    { id: "legacy-torque", label: "Legacy TORQUE", category: "compatibility" },
    { id: "review-required", label: "Unsupported / Review Required", category: "compatibility" }
]);

const SCRIPTS_BY_SCHEDULER = Object.freeze({
    pbs: PBS_EXAMPLE_SCRIPTS,
    slurm: SLURM_EXAMPLE_SCRIPTS
});

export function getExamplesForScheduler(scheduler) {
    const scripts = SCRIPTS_BY_SCHEDULER[scheduler] ?? {};
    return EXAMPLE_DEFINITIONS
        .filter((definition) => Object.hasOwn(scripts, definition.id))
        .map((definition) => ({
            ...definition,
            scheduler,
            script: scripts[definition.id]
        }));
}

export function getExampleById(scheduler, id) {
    return getExamplesForScheduler(scheduler).find((example) => example.id === id) ?? null;
}

export function getExampleGroups(scheduler) {
    const examples = getExamplesForScheduler(scheduler);
    const recommended = examples.filter((example) => example.recommended);
    const groups = [];

    if (recommended.length > 0) {
        groups.push({
            id: "recommended",
            label: "★ Recommended",
            examples: recommended
        });
    }

    for (const category of EXAMPLE_CATEGORIES) {
        const categoryExamples = examples.filter((example) => (
            !example.recommended && example.category === category.id
        ));
        if (categoryExamples.length > 0) {
            groups.push({
                id: category.id,
                label: category.label,
                examples: categoryExamples
            });
        }
    }

    return groups;
}
