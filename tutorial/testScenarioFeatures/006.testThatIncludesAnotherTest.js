cartfiller = {
    details: [

        /**
         * So, you can include other tests, see 007.includedTest.js file.
         * It is important, that includedTest is listed in cartfiller.js/json, otherwise it will be 'not found'
         * Inside cartfiller.js/json includedTest can be listed as : false, (to prevent it from being executed
         * when running a testsute)
         */
        "{include: '007.includedTest'}",
        {include: '007.includedTest'},
        {_assertEquals: {ref: ["param1was"], value: "not set"}},

        /**
         * Included tests can also be parametrized, which has 2 consequences: 
         * 1. included test can be branched using parameter (see 007.includedTest.js)
         * 2. included test gets parameter in its global vars
         */
        "{include: '007.includedTest', param1: 'asdf'}",
        {include: '007.includedTest', param1: 'asdf'},
        {_assertEquals: {ref: ["param1was"], value: "set"}},
        {_assertEquals: {ref: ["param1wasSetTo"], value: "asdf"}},

        /**
         * Included tests themselves can use their parameters to include other tests
         * see 008.anotherIncludedTest.js. Here we pass param2, but 
         * 008.anotherIncludedTest passes param2 into 007.includedTest as param1
         */
        "{include: '008.anotherIncludedTest', param2: 'fdsa'}",
        {include: '008.anotherIncludedTest', param2: 'fdsa'},
        {_assertEquals: {ref: ["param1was"], value: "set"}},
        {_assertEquals: {ref: ["param1wasSetTo"], value: "fdsa"}},
    ]
}