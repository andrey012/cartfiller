cartfiller = {
    globals: {
        emailOfUserA: 'usera@example.com',
        emailOfUserB: 'userb@example.com',
        adminUser: 'UserA',
    },
    details: [
        /**
         * Arrays are reserved thing when used as parameters. There are two cases: 
         * 1. when array has single element then lookup in globals happens
         * 2. when array has more then one element, then string concat happens. 
         * This is done recursively, here are some examples
         */

        /**
         * This message will say 'one'
         */
        "### {_say: {message: 'one'}}",
        {_say: {message: 'one'}},
        {_assertEquals: {ref: 'one', value: 'one'}},
        /**
         * This message will say 'one two'
         */
        "### {_say: {message: ['one', ' ', 'two']}}",
        {_say: {message: ['one', ' ', 'two']}},
        {_assertEquals: {ref: ['one', ' ', 'two'], value: 'one two'}},
        /**
         * This message will say 'usera@example.com' because higher in globals section we 
         * define emailOfUserA = 'usera@example.com'
         */
        "### {_say: {message: ['emailOfUserA']}}",
        {_say: {message: ['emailOfUserA']}},
        {_assertEquals: {ref: ['emailOfUserA'], value: 'usera@example.com'}},
        /**
         * This message will say 'here is email of user A: usera@example.com' because string concatenation 
         * happens after global lookup
         */
        "### {_say: {message: ['here is email of user A: ', ['emailOfUserA']]}}",
        {_say: {message: ['here is email of user A: ', ['emailOfUserA']]}},
        {_assertEquals: {ref: ['here is email of user A: ', ['emailOfUserA']], value: 'here is email of user A: usera@example.com'}},
        /**
         * Now some interesting stuff - we have also adminUser set to UserA, so
         * ['emailOf', ['adminUser']] will be resolved into 'emailOfUserA', then ['emailOfUserA'] will
         * be resolved into 'usera@example.com' and then ['email of admin user is: ', 'usera@example.com'] will
         * be resolved into 'email of admin user is: usera@example.com'
         * This message will say 'email of admin user is: usera@example.com'
         */
        "### {_say: {message: ['email of admin user is: ', [['emailOf', ['adminUser']]]]}}",
        {_say: {message: ['email of admin user is: ', [['emailOf', ['adminUser']]]]}},
        {_assertEquals: {ref: ['email of admin user is: ', [['emailOf', ['adminUser']]]], value: 'email of admin user is: usera@example.com'}},

        /**
         * Now we can change global parameters. This comes from the fact, that task can change globals 
         * in two ways: 
         * 1. first of all task can change globals by addressing globals directly. See workers/globals.js
         * 2. but also, task can change task parameters, which, when refer to global variables will in 
         *    turn change global variable values. For example builtin task _set inside its code says
         *    task.ref = task.value. If you say
         */
        "### {_set: {ref: 'a', value: 'b'}}",
        {_set: {ref: 'a', value: 'b'}},
        /**
         * then nothing happens, but if you say:
         */
        "### {_set: {ref: ['emailOfUserA'], value: 'usera111@example.com'}}",
        {_set: {ref: ['emailOfUserA'], value: 'usera111@example.com'}},
        /**
         * then email of user a will be changed: 
         */
        "### {_say: {message: ['here is email of user A: ', ['emailOfUserA']]}}",
        {_say: {message: ['here is email of user A: ', ['emailOfUserA']]}},
        {_assertEquals: {ref: ['here is email of user A: ', ['emailOfUserA']], value: 'here is email of user A: usera111@example.com'}},
        /**
         * So, we have changed global variable value during test execution, and from now on within this test 
         * it will have new value. If we will try our older example - it will now say: 
         * 'email of admin user is: usera111@example.com'. 
         * But when you will restart this test - email of user a will be back usera@example.com, because
         * global variables are reset each time test is loaded. However, if you will try to repeat this
         * test without reloading (e.g. by using ||>>> button) - it will fail, because globals are only
         * reset on test load.
         */
        "### {_say: {message: ['email of admin user is: ', [['emailOf', ['adminUser']]]]}}",
        {_say: {message: ['email of admin user is: ', [['emailOf', ['adminUser']]]]}},
        {_assertEquals: {ref: ['email of admin user is: ', [['emailOf', ['adminUser']]]], value: 'email of admin user is: usera111@example.com'}},
        /**
         * There are also some helpers - see loopingTest.js
         */

        
    ]
}