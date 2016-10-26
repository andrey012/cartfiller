cartfiller = {
    title: 'sample test',
    globals: {
    },
    details: [
        '# Sample test for TodoMVC',
        {openTodomvc: {}},
        {removeAllTasks: {}},
        '## Add some tasks',
        {addTask: {name: 'task one'}},
        {addTask: {name: 'task two'}},
        {addTask: {name: 'task three'}},
        '## Select task as completed',
        {triggerCheckbox: {name: 'task two'}},
        '## Set filter to show only active tasks',
        {filter: {type: 'Active'}},
        '## Verifications', 
        {makeSureTaskIsNotThere: {name: 'task two'}},
        {makeSureTaskIsThere: {name: 'task one'}},
        {makeSureTaskIsThere: {name: 'task three'}},
        {triggerCheckbox: {name: 'task one'}},
        {makeSureTaskIsNotThere: {name: 'task one'}},

        '# Ok, now we want random task name',
        {_set: {ref: ['randomTaskName'], value: ['task ', ['_random']]}},
        {addTask: {name: ['randomTaskName']}},
        {makeSureTaskIsThere: {name: ['randomTaskName']}},
    ]
}
