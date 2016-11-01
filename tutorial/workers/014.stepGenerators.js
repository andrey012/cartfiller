(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        /**
         * Step generator is a function that runs at build time and returns serie of steps.
         * Generators are useful when you have to create several tasks, which contain similar
         * set of steps but with different flavor. For example imagine you have a form of 20 inputs
         * and one task is to fill that form accoring to task parameters, and another task is to 
         * verify if this form is filled correctly (compare each input with task parameter). 
         * See example for this case below. 
         * Some more simple examples: 
         */
        cf.generator('generateAddItem', function(itemName, message) {
            return cf.getlib('newTodoItem')
                .type(itemName)
                .enter()
                .useIf(message, cf.say(message))
                .useIfNot(message, cf.say('no message, sorry'))
        })

        cf.task('addItemWithItemName')
            .use('generateAddItem', '${itemName}', 'addItemWithItemName takes [itemName] parameter')

        cf.task('addItemWithTodoItemName')
            .use('generateAddItem', '${todoItemName}', 'addItemWithTodoItemName takes [todoItemName] parameter')

        cf.task('addItemWithItemNameWithoutMessage')
            .use('generateAddItem', '${itemName}')

        /**
         * More complex example: 
         * * fillOrVerifyInput operates on one input - finds it by heading, and then depending
         *   on fill parameter (which is build time) either types text there or compares. 
         * * fillOrVerifyWholeForm does this for whole form by using fillOrVerifyInput for
         *   each field. So you only have one place where list of fields live
         * * fillForm task fills form
         * * verifyForm task verifies form
         */
        cf.generator('fillOrVerifyInput', function(inputHeading, taskParameterName, fill) {
            return cf.get('span').withText(inputHeading).closest('div').find('input[type="text"]')
                .useIf(fill, cf.type('${' + taskParameterName + '}'))
                .useIfNot(fill, cf.then(function(input) {
                    api.result(api.compare(task[taskParameterName], input.val()));
                }))
        })
        cf.generator('fillOrVerifyWholeForm', function(fill) {
            return cf
                .use('fillOrVerifyInput', 'First Name:', 'firstName', fill)
                .use('fillOrVerifyInput', 'Last Name:', 'lastName', fill)
                .use('fillOrVerifyInput', 'City:', 'city', fill)
                .use('fillOrVerifyInput', 'Email:', 'email', fill)
        })
        cf.task('fillForm').use('fillOrVerifyWholeForm', true)
        cf.task('verifyForm').use('fillOrVerifyWholeForm', false)
        

        
    });
})(window, document);
