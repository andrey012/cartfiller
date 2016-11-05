(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        
        cf.task('^Given function from workerForOneTest exists$')
            .say('ok')
    });
})(window, document);
