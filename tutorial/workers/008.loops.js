(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        /**
         * COMING SOON
         */
        
        cf.task('removeAllItems')
            .while(
                cf.get('#todo-list:visible li:visible').first().exists(),
                cf.get('.destroy')
                .css('display', 'block')
                .click()
            )
    });
})(window, document);
