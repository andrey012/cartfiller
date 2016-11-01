cartfiller = {
    details: [
        /**
         * See 006.testThatIncludesAnotherTest.js
         * Here we simply branch scenario depending on whether param1 was defined or not
         * and if it was defined - we put its value to globals ['param1wasSetTo'] variable
         */
        {if: 'param1', then: [
            {_set: {ref: ['param1was'], value: 'set'}},
            {_set: {ref: ['param1wasSetTo'], value: ['param1']}}
        ], else: [
            {_set: {ref: ['param1was'], value: 'not set'}},
        ]}
    ]
}