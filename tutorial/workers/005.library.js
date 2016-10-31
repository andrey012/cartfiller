(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        /**
         * COMING SOON
         */

        cf.lib('getItemLi', cf
            .getlib('todolist')
            .find('label:visible')
            .withText('${name}')
            .closest('li:visible')
        )

        cf.lib('todolist', cf
            .get('ul#todo-list:visible')
        )
        
    });
})(window, document);
