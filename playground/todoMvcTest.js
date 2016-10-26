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
        {addTask: {name: 'task two', skipIntro: true}},
        {addTask: {name: 'task three', skipIntro: true}},
        '## Select task as completed',
        {triggerCheckbox: {name: 'task two'}},
        '## Set filter to show only active tasks',
        {filter: {type: 'Active'}},
        '## Verifications', 
        {makeSureTaskIsNotThere: {name: 'task two'}},
        {makeSureTaskIsThere: {name: 'task one'}},
        {makeSureTaskIsThere: {name: 'task three', skipIntro: true}},
        {triggerCheckbox: {name: 'task one', skipIntro: true}},
        {makeSureTaskIsNotThere: {name: 'task one', skipIntro: true}},

        '# Ok, now we want random task name',
        {_set: {ref: ['randomTaskName'], value: ['task ', ['_random']]}},
        {addTask: {name: ['randomTaskName'], skipIntro: true}},
        {makeSureTaskIsThere: {name: ['randomTaskName'], skipIntro: true}},
    ]
}
