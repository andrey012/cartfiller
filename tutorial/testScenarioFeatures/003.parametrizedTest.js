cartfiller = {
    details: [
        /**
         * Tests can be parametrized in a simple url parameter style. See cartfiller.js to see how this
         * test is mentioned
         */
        {openTodomvc: {}},
        {removeAllItems: {}},
        /**
         * if: '%parameter%' - means that any parameter value will work. If parameter with that name is set
         * then 'then' branch will be used, otherwise 'else' branch will be used.
         */
        {if: 'parameter1', then: [
            {addItem: {name: 'parameter1 exists'}},
        ], else: [
            {addItem: {name: 'parameter1 does not exist'}},
        ]},
        /**
         * if: {'%parameter%': '%value'} - means, that parameter should match value
         */
        {if: {parameter2: 'thevalue'}, then: [
            {addItem: {name: 'parameter2 has value \'thevalue\''}},
        ], else: [
            {addItem: {name: 'parameter2 does not have value \'thevalue\''}},
        ]},
        /**
         * Again in this case parameter2 should be === 'asdf'
         */
        {if: {parameter2: 'asdf'}, then: [
            {addItem: {name: 'parameter2 has value \'asdf\''}},
        ], else: [
            {addItem: {name: 'parameter2 does not have value \'asdf\''}},
        ]},
        /**
         * And in this case it should just exist
         */
        {if: 'parameter2', then: [
            {addItem: {name: 'parameter2 exists'}},
        ], else: [
            {addItem: {name: 'parameter2 does not exist'}},
        ]},
        /**
         * In cartfiller.js we call this test twice, once without parameters
         * and another time with parameter1 = 1, parameter2 = thevalue and withParameters = true.
         * Let's make assertions that it works right
         */
        {if: 'withParameters', then: [
            {makeSureItemExists: {name: 'parameter1 exists'}},
            {makeSureItemExists: {name: 'parameter2 has value \'thevalue\''}},
            {makeSureItemExists: {name: 'parameter2 does not have value \'asdf\''}},
            {makeSureItemExists: {name: 'parameter2 exists'}},
        ], else: [
            {makeSureItemExists: {name: 'parameter1 does not exist'}},
            {makeSureItemExists: {name: 'parameter2 does not have value \'thevalue\''}},
            {makeSureItemExists: {name: 'parameter2 does not have value \'asdf\''}},
            {makeSureItemExists: {name: 'parameter2 does not exist'}},
        ]}
    ]
}