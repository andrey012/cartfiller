(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        
        cf.task('^TodoMVC is open$')
            .use('openTodomvc')


        cf.task('^task list is empty$')
            .use('removeAllItems')

        
        cf.task('^user types ${textToType} in the input textbox$')
            .use('typeExampleWithTextFromTaskParameters')

        cf.task('^presses enter$')
            .use('pressEnterExample')


        cf.task('^${name} should appear in the list of tasks$')
            .use('makeSureItemExists')
            
        
    });
})(window, document);
