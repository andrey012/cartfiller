(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        /**
         * Customs steps is a way to get execution and do somethng yourself.
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
        /**
         * Inside custom steps main entry point is api. There is a generated documentation for it
         * in /docs/CartFiller.Api.html in this repository
         */
        /**
         * COMING SOON - SOME EXAMPLES WILL BE HERE
         */
    });
})(window, document);
