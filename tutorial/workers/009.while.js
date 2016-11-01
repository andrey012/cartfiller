(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        
        cf.task('removeAllItems')
        /**
         * .while has two parameters - condition and action. It acts same as if but loops while
         * condition is met
         */
            .while(
                cf.get('#todo-list:visible li:visible').exists(),
                cf.get('.destroy')
                .css('display', 'block')
                .click()
            )

        cf.task('removeAllItemsUsingWhileNot')
        /**
         * .whileNot do the same but until condition is met
         */
            .whileNot(
                cf.get('#todo-list:visible li:visible').absent(),
                cf.get('.destroy')
                .css('display', 'block')
                .click()
            )
    });
})(window, document);
