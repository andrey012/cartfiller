cartfiller = {
    globals: {
    },
    worker: [
        "todoMvcWorker.js",
    ],
    tests: {
        todoMvcTest: true,
        'todoMvcTest?pure=true': true,
        clearCompleted: true,
        toggleAll: true
    }
}
