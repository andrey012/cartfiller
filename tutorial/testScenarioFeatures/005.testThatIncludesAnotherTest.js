cartfiller = {
    details: [

        /**
         * So, you can include other tests, check out the includedTest.js file.
         * It is important, that includedTest is listed in cartfiller.js/json, otherwise it will be 'not found'
         * Inside cartfiller.js/json includedTest can be listed as : false, (to prevent it from being executed
         * when running a testsute)
         */
        function(){/* {include: 'includedTest'} */},
        {include: '006.includedTest'},
        {_assertEquals: {ref: ["param1was"], value: "not set"}},

        /**
         * Included tests can also be parametrized, which has 2 consequences: 
         * 1. included test can be branched using parameter (see includedTest.js)
         * 2. included test gets parameter in its global vars
         */
        function(){/* {include: 'includedTest', param1: 'asdf'} */},
        {include: '006.includedTest', param1: 'asdf'},
        {_assertEquals: {ref: ["param1was"], value: "set"}},
        {_assertEquals: {ref: ["param1wasSetTo"], value: "asdf"}},

        /**
         * Included tests themselves can use their parameters to include other tests
         * check out anotherIncludedTest.js
         */
        function(){/* {include: 'anotherIncludedTest', param2: 'fdsa'} */},
        {include: '007.anotherIncludedTest', param2: 'fdsa'},
        {_assertEquals: {ref: ["param1was"], value: "set"}},
        {_assertEquals: {ref: ["param1wasSetTo"], value: "fdsa"}},
    ]
}