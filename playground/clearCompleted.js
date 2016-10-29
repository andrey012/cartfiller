cartfiller = {
    details: [
        {include: 'todoMvcTest', pure: true},
        {filter: {type: 'completed'}},
        {makeSureItemIsThere: {name: "item #one"}},
        {makeSureItemIsThere: {name: "item two"}},
        {clearCompleted: {}},
        {makeSureItemIsNotThere: {name: "item #one"}},
        {makeSureItemIsNotThere: {name: "item two"}},
        {filter: {type: 'all'}},
        {makeSureItemIsNotThere: {name: "item #one"}},
        {makeSureItemIsNotThere: {name: "item #two"}},
        
    ]
}