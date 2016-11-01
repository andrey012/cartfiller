(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        cf.task('passingData')
            /**
             * Normally whatever is result of one step becomes a parameter of next step. 
             */
            .getlib('newTodoItem')
            .then(function(input) {
                api.result(input[0].nodeName === 'INPUT' ? '' : 'mismatch');
            })
            /**
             * Also, whatever is first parameter of N'th step will become second parameter of N+1th step.
             * This is only true within a task. Very first step of a task gets result of
             * last step of previous task, but that's it. 
             */
            .get('#header:visible')
            .get('#new-todo:visible')
            .get('#todoapp:visible')
            .then(function(section, input, header) {
                api.result(
                    api.compare('INPUT', input[0].nodeName) +
                    api.compare('SECTION', section[0].nodeName) + 
                    api.compare('HEADER', header[0].nodeName)
                );
            })
            /**
             * This may not always be convenient. Inside one task it is possible to pass
             * named parameters like this. Note, that I have preserved order of initial get's,
             * but reversed the order of parameters of function within then. 
             * 
             */
            .get('#header:visible').as('theHeader')
            .get('#new-todo:visible').as('theInput')
            .get('#todoapp:visible').as('theSection')
            .say('a')
            .say('b')
            .get('a').withText('that does not exist')
            .with('theHeader', 'theInput', 'theSection')
            .then(function(header, input, section) {
                api.result(
                    api.compare('INPUT', input[0].nodeName) +
                    api.compare('SECTION', section[0].nodeName) + 
                    api.compare('HEADER', header[0].nodeName)
                );
            })
            /**
             * This trick can be used in conditionals as well:
             */
            .get('#new-todo:visible').as('myNewTodo')
            .if(
                cf
                    .say('we\'re going to check whether input exists')
                    .with('myNewTodo').exists(),
                cf
                    .say('we\'re going to create new item')
                    .with('myNewTodo').type('myNewTodo Item').enter()
            )
            /**
             * Inside your custom steps, when you want to pass selector to next step - 
             * api.arrow will implicitly do that. See 011.customSteps.js for more examples.
             */
            .then(function() {
                api.find('#new-todo:visible').arrow().result();
            })
            /**
             * This may sound weird, but it is sometimes not only selectors you want to operate, you can have 
             * any other data in your steps. Use api.return for that:
             */
            .then(function() {
                api.return(15).result();
            })
            .then(function(x) {
                api.result(api.compare(15, x));
            })




        
    });
})(window, document);
