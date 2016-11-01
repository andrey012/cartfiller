cartfiller = {
    details: [
        /**
         * This test just includes another test. The idea is that when including another
         * test we can map parameters, here we say that param1 of 007.includedTest.js will be 
         * mapped to param2 of this test (008.anotherIncludedTest.js)
         */
        {include: '007.includedTest', param1: ['param2']}
    ]
}