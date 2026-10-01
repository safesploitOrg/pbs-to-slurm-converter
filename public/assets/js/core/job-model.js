export function createJobModel() {
    return {
        source: {
            scheduler: null,
            dialect: null
        },
        job: {
            name: null,
            queue: null,
            account: null,
            project: null,
            group: null,
            hold: false,
            rerunnable: null,
            startTime: null
        },
        resources: {
            walltimeSeconds: null,
            chunks: [],
            legacyNodes: null,
            nodes: null,
            tasks: null,
            tasksPerNode: null,
            cpusPerTask: null,
            memory: [],
            gpus: [],
            placement: {
                arrangement: null,
                sharing: null,
                groupBy: null,
                raw: null
            },
            exclusive: false,
            custom: []
        },
        io: {
            stdout: null,
            stderr: null,
            join: null,
            workingDirectory: null
        },
        notifications: {
            email: null,
            events: []
        },
        array: null,
        environment: {
            exportAll: null,
            variables: []
        },
        dependencies: [],
        script: {
            shebang: null,
            body: [],
            reviews: []
        },
        unsupported: []
    };
}

export function addUnsupported(job, entry) {
    job.unsupported.push({
        scheduler: entry.scheduler,
        line: entry.line ?? null,
        directive: entry.directive,
        reason: entry.reason ?? "No portable target equivalent is implemented."
    });
}
