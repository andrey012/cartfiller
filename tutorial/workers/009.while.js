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
        
        cf.task('whileBreakExample')
        /**
         * You can also do while(true) { ... } type of things by setting first parameter to true
         */
            .while(
                true,
                cf
                    .set('whileBreakExample', 'ok')
                    .if(
                        true,
        /**
         * And then do cf.break() when some condition is met
         */
                        cf.break()
                    )
                    .set('whileBreakExample', 'error')
            )
        
        /**
         * Nested while's are also possible
         */
        cf.task('whileBreakExample2')
            .while(
                true,
                cf
                    .while(
                        true,
                        cf
                            .set('whileBreakExample2a', 'ok')
                            .break()
                            .set('whileBreakExample2a', 'error')
                            
                    )
                    .set('whileBreakExample2b', 'ok')
                    .break()
                    .set('whileBreakExample2b', 'error')
            )

        /**
         * And cf.break can have a parameter - how many while's to break. For example
         * here we have 3 nested while's, and in the innermost one we do .break(2), which
         * means that we'll break 2 innermost while's and continue on the outermost one
         */
        cf.task('whileBreakExample3')
            .while(
                true,
                cf
                    .while(
                        true,
                        cf
                            .set('whileBreakExample3b', 'ok')
                            .while(
                                true,
                                cf
                                    .set('whileBreakExample3a', 'ok')
                                    .break(2)
                                    .set('whileBreakExample3a', 'error')
                                    
                            )
                            .set('whileBreakExample3b', 'error')
                            .break()
                    )
                    .set('whileBreakExample3c', 'ok')
                    .break()
                    .set('whileBreakExample3c', 'error')

            )
    });
})(window, document);
