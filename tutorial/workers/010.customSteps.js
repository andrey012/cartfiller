(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        /**
         * COMING SOON
         */
        cf.task('someDirtyAction')
            .then(function(){
                window.document.write(task.message);
                api.result();
            })

        cf.task('makeSureThatWholeBodyElementContainsOnly')
            .then(function(){ 
                api.result(
                    api.compare(
                        task.text, 
                        window.document
                            .getElementsByTagName('body')[0]
                            .textContent
                    )
                );
            })
    });
})(window, document);
