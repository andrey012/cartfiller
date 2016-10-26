cartfiller = {
    title: 'sample test',
    globals: {
    },
    details: [
        '# Here comes your test',
        {_say: {message: 'Hello World!'}},
        {openTodomvc: {flavour: "react"}},
        {removeAllTasks: {}},
        {addTask: {name: 'task one'}},
        {addTask: {name: 'task two'}},
        {addTask: {name: 'task three'}},
        {triggerCheckbox: {name: 'task two'}},
        {filter: {type: 'Active'}},
        {makeSureTaskIsNotThere: {name: 'task two'}},
        {makeSureTaskIsThere: {name: 'task one'}},
        {makeSureTaskIsThere: {name: 'task three'}},
        {triggerCheckbox: {name: 'task one'}},
        {makeSureTaskIsNotThere: {name: 'task one'}},

        '# Ok, now we want random task',
        {_set: {ref: ['randomTaskName'], value: ['task ', ['_random']]}},
        {addTask: {name: ['randomTaskName']}},
        {makeSureTaskIsThere: {name: ['randomTaskName']}},
    ]
}
