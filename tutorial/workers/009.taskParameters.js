
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        /**
         * COMING SOON
         */
       
        cf.task('addItem')
            .get('#new-todo:visible') // search for new task input
            .type('${name}')
            .enter()
            // make sure that item exists, use getItemLi
            // from lib for that, we'll define getItemLi later
            .getlib('getItemLi')
            .exists() 
            .say('item \'${name}\' added')


    });
})(window, document);
