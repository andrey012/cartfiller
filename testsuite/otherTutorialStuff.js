(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        

        cf.task('makeSureThatNoItemsExist')
            .get('#todo-list:visible li:visible label:visible')
            .absent()


    });
})(window, document);
