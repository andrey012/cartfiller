cartfiller = {
    details: [
        /**
         * Sometimes we want to stress our applications by entering hundreds of entities and watching 
         * time delays
         */
        
        {openTodomvc: {}},
        {removeAllItems: {}},
        /**
         * One way of looping is very similar to 
         * for (var i = 0; i < 20; i ++) { ... ]}
         */
        /**
         * This sets global variable x to 0
         */
        {_set: {ref: ['i'], value: 0}},

        /**
         * Add item named 'item %i' (see 004.referencingGlobalsTest.js)
         */
        
        {addItem: {name: ['item ', ['i']]}},

        /**
         * Doing i++ on global variable i
         */
        {_inc: {ref: ['i']}},

        /**
         * looping while i < 5 (not inclusive). The tricky part here is 3 - number of tasks to 
         * loop including this one. We are looping 3 tasks: 
         * * {addItem: {name: ['item ', ['i']]}}
         * * {_inc: {ref: ['i']}}
         * * {_loop: {ref: ['i'], tasks: 3, value: 5}}
         */
        {_loop: {ref: ['i'], tasks: 3, value: 5}},
        

        {makeSureItemExists: {name: "item 0"}},
        {makeSureItemExists: {name: "item 1"}},
        {makeSureItemExists: {name: "item 2"}},
        {makeSureItemExists: {name: "item 3"}},
        {makeSureItemExists: {name: "item 4"}},
        {makeSureItemDoesNotExist: {name: "item 5"}},
        {removeAllItems: {}},

        /**
         * Another way is doing forEach on an array. 
         * * values is string that will be splitted using separator
         * * separator is used to split string
         * * value is reference to global variable that will keep the value
         */
        {_foreach: {values: "Alice,Bob,John", separator: ",", value: ["name"]}},
        /**
         * Inside the loop we will create todo item named 'send invitation to %name%'
         */
        {addItem: {name: ['send invitation to ', ['name']]}},
        /**
         * This marks end of the loop
         */
        {_endforeach: {}},
        /**
         * Now we have 3 items created
         */
        {makeSureItemExists: {name: "send invitation to Alice"}},
        {makeSureItemExists: {name: "send invitation to Bob"}},
        {makeSureItemExists: {name: "send invitation to John"}},

        {removeAllItems: {}},
        /**
         * Loops can be nested as well
         */
        {_foreach: {values: "send email to,call", separator: ",", value: ["what"]}},
        {_foreach: {values: "Alice,Bob,John", separator: ",", value: ["name"]}},
        {addItem: {name: [['what'], ' ', ['name']]}},
        {_endforeach: {}},
        {_endforeach: {}},
        {makeSureItemExists: {name: "send email to Alice"}},
        {makeSureItemExists: {name: "send email to Bob"}},
        {makeSureItemExists: {name: "send email to John"}},
        {makeSureItemExists: {name: "call Alice"}},
        {makeSureItemExists: {name: "call Bob"}},
        {makeSureItemExists: {name: "call John"}},
        {removeAllItems: {}},

        /**
         * And finally if we want items to be named like 'send %name% email with invitation' - we can 
         * have variable prefix = 'send' and variable suffix = 'email with invitation' and put 
         * variable name in between them. In this case we use _foreach with parameters: 
         * * values - now this is 2d array of rows that consist from field values
         * * separator - is used to separate rows
         * * fieldSeparator - is used to separate fields - used for both values and fields parameter
         * * fields - name of global variables that will be initialized with values. Same fieldSeparator 
         *   is used. So, we say prefix%suffix, which means, that global variables prefix and suffix
         *   will be populated
         */
        {_foreach: {values: "send % email with invitation,call % to confirm", separator: ",", fieldSeparator: "%", fields: "prefix%suffix"}},
        {_foreach: {values: "Alice,Bob,John", separator: ",", value: ["name"]}},

        {addItem: {name: [['prefix'],' ', ['name'],' ', ['suffix']]}},

        {_endforeach: {}},
        {_endforeach: {}},
        
        {makeSureItemExists: {name: "send Alice email with invitation"}},
        {makeSureItemExists: {name: "send Bob email with invitation"}},
        {makeSureItemExists: {name: "send John email with invitation"}},
        {makeSureItemExists: {name: "call Alice to confirm"}},
        {makeSureItemExists: {name: "call Bob to confirm"}},
        {makeSureItemExists: {name: "call John to confirm"}},

    ]
}