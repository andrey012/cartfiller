(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        
        cf.task('typeExampleWithStaticText')
            .get('#new-todo:visible')
            /**
             * Typing text key by key
             * Implicitly asserts that element exists
             */
            .type('static text')

        cf.task('typeExampleWithTextFromTaskParameters')
            .get('#new-todo:visible')
            /**
             * Same, but getting thing to  type from task parameters
             * Implicitly asserts that element exists
             */
            .type('${textToType}')


        cf.task('pressEnterExample')
            .get('#new-todo:visible')
            /**
             * Pressing enter
             * Implicitly asserts that element exists
             */
            .enter()


        cf.task('clickExample')
            .get('#todo-list:visible li:visible').nthOfType(0).find('input.toggle[type="checkbox"]:visible')
            /**
             * Clicking element
             * Implicitly asserts that element exists
             */
            .click()

        cf.task('pasteExample')
            .get('#new-todo:visible')    
            /**
             * Pasting value into an input. Useful when you have long texts and want to make tests run faster
             * Implicitly asserts that element exists
             */    
            .paste('${text}')



    });
})(window, document);
