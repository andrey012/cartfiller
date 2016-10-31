cartfiller = {
    details: [
        /**
         * Tests can be parametrized in a simple url parameter style. Check out cartfiller.js to see how this
         * test is mentioned
         */
        {openTodomvc: {}},
        {removeAllItems: {}},
        /**
         * if: '%parameter%' - means that any parameter value will work. If parameter with that name is set
         * then 'then' branch will be used, otherwise 'else' branch will be used.
         */
        {if: 'parameter1', then: [
            {addItem: {name: 'item from parametrized test 1'}},
        ], else: [
            {addItem: {name: 'item from parametrized test 2'}},
        ]},
        /**
         * if: {'%parameter%': '%value'} - means, that parameter should match value
         */
        {if: {parameter2: 'thevalue'}, then: [
            {addItem: {name: 'item from parametrized test 3'}},
        ], else: [
            {addItem: {name: 'item from parametrized test 4'}},
        ]},
        {if: {parameter2: 'asdf'}, then: [
            {addItem: {name: 'item from parametrized test 5'}},
        ], else: [
            {addItem: {name: 'item from parametrized test 6'}},
        ]},
        {if: 'parameter2', then: [
            {addItem: {name: 'item from parametrized test 7'}},
        ], else: [
            {addItem: {name: 'item from parametrized test 8'}},
        ]},

        {if: 'withParameters', then: [
            {makeSureItemExists: {name: 'item from parametrized test 1'}},
            {makeSureItemExists: {name: 'item from parametrized test 3'}},
            {makeSureItemExists: {name: 'item from parametrized test 6'}},
            {makeSureItemExists: {name: 'item from parametrized test 7'}},
        ], else: [
            {makeSureItemExists: {name: 'item from parametrized test 2'}},
            {makeSureItemExists: {name: 'item from parametrized test 4'}},
            {makeSureItemExists: {name: 'item from parametrized test 6'}},
            {makeSureItemExists: {name: 'item from parametrized test 8'}},
        ]}
    ]
}