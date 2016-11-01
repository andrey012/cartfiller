(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){

        /**
         * One task can use any other task inside its body. You can't map a parameter name in this case,
         * parameters will be one and same for task1 that is being used and task2 that uses task1
         */
        cf.task('task1isBeingUsedByTask2')
            .set('task1var', 'task1val')
        
        cf.task('task2usesTask1')
            .set('task1var', 'task2val')
            .then(function() {
                api.result(api.compare('task2val', globals.task1var))
            })
            .use('task1isBeingUsedByTask2')
            .then(function() {
                api.result(api.compare('task1val', globals.task1var))
            })

        /**
         * You can also share parts of task, without exposing this share to test scenario. Parts of tasks
         * shared in such way can't be used in test scenario, but can be used in other tasks
         */
        cf
            .use('openTodomvc')
            .getlib('newTodoItem')
            .type('test').enter()
            .use('removeAllItems')
            .share('prepareCleanTodoMvc')
        /**
         * We do not use cf.task() in the beginning, and we use .share on the tail. 
         * prepareCleanTodoMvc will not be exposed as task for testSuite. But we can use it. 
         * However, the namespace of normal tasks and shared pieces is common, so if you try
         * to give same names for task and shared piece - it will not work
         */
        
        cf.task('coolTask')
            .use('prepareCleanTodoMvc')
            .say('we are really ready now')

        /**
         * Sometimes you really may want to cut out part of other task and share it. It's a bit
         * dirty but is useful in real life. 
         */
        cf.task('baseTaskWhichContainsPieceToShare')
            .set('baseTaskWhichContainsPieceToShare1', 1)
            .set('baseTaskWhichContainsPieceToShare2', 2)
            .name('I want to share from here on')
            .set('baseTaskWhichContainsPieceToShare3', 3)
            .set('baseTaskWhichContainsPieceToShare4', 4)
            .since('I want to share from here on').share('sharedPieceOfBaseTask')
        
        /**
         * So, if we'll decide to use sharedPieceOfBaseTask, then we only take steps, that set
         * 3 and 4, not 1 and 2
         */
        cf.task('taskThatContainsSharedPieceOfBaseTask')
            .use('sharedPieceOfBaseTask')
            .then(function() {
                api.result(
                    api.compare(undefined, globals.baseTaskWhichContainsPieceToShare1) +
                    api.compare(undefined, globals.baseTaskWhichContainsPieceToShare2) +
                    api.compare(3, globals.baseTaskWhichContainsPieceToShare3) +
                    api.compare(4, globals.baseTaskWhichContainsPieceToShare4)
                );
            })
        /**
         * You can also feed cf.use with another task: 
         */
        cf.task('outerTask')
            .use(
                cf.task('innerTask')
                    .set('innerTaskVar', 'innerTaskVal')
            )
            .then(function() {
                api.result(api.compare('innerTaskVal', globals.innerTaskVar));
            })
        
    });
})(window, document);
