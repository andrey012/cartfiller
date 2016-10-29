cartfiller = {
    details: [
        {include: 'todoMvcTest', pure: true},

        {filter: {type: "all"}},
        {makeSureThatItemIsNotDone: {name: 'item three'}},
        {toggleAll: {}},
        {makeSureThatItemIsDone: {name: 'item three'}},

    ]
}