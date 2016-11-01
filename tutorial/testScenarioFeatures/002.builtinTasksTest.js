cartfiller = {
    globals: {
    },
    /**
     * There are some builtin tasks available for convenience
     */
    details: [
        /**
         * _say displays a message, it has following task parameters: 
         * * message    - what to say. If empty or not set - clears current message
         * * clear      - whether to clear current arrow or not. By default arrow is left on the screen
         *                and message is positioned near the arrow
         * * nextButton - name for [close] button, if used, then, when launced in slow mode test will
         *                pause here until user clicks this button. Button is focused by default so
         *                user can also press spacebar or enter. 
         * * pre        - whether to wrap contents into <pre>
         * * sleepMs    - time to sleep, milliseconds. Only has effect in slow mode or when recording videos.
         *                In slow mode user can still click [close] button which will make test go forward.
         *                Usually used to give user enough time to read long message. By default sleep also
         *                happens, but is calculated based on the message length.
         */
        {_say: {message: 'Hello World!'}},
        {_say: {message: 'function() {\n    return \'Hello World!\';\n}', pre: true, clear: true, nextButton: 'Give me more!', sleepMs: 2500}},
        
        /**
         * _set sets value of global variable. See 005.loopingTest.js and 004.referencingGlobalsTest.js for examples
         */
        {_set: {ref: ['var1'], value: 123}},

        /**
         * _inc increments a value. See 005.loopingTest.js for examples
         */
        {_inc: {ref: ['var1']}},

        /**
         * _loop repeats few tasks if variable does not reach its limit, see 005.loopingTest.js for examples
         */
        {_loop: {ref: ['var1'], value: 125, tasks: 2}},

        /**
         * _assertEquals compares global var with expected value
         */
        {_assertEquals: {ref: ['var1'], value: 125}},

        /**
         * _wait will make CartFiller wait for more tasks to appear when you are writing test and perform these 
         * as soon as they appear (using code hotswap of course). So, the idea is that you create empty test 
         * having only one {_wait: {}} statement, and run it. It will never get to end because it will go on 
         * looping on this _wait task. But then you can go on writing your test by adding new tasks above _wait
         * and you will see that your tasks are executed without need to press anything. 
         * However, if you are going to change things (vs adding new tasks) - then you have to do it manually
         */
        {_wait: {}} && '{_wait: {}} I can\'t really put it here, because testsuite will halt on that point, it is only for developing tests',
        
        /**
         * _foreach and _endforeach is for looping over a 1d or 2d data set. see 005.loopingTest.js for examples
         */
        {_foreach: {values: 'Alice,Bob,John', separator: ',', value: ['name']}},
        /**
         * ... do some tasks here using ['name'] global variable
         */
        {_endforeach: {}},
        
    ]
}