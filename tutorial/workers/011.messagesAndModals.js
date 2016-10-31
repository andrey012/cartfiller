(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
     
        cf.task('sayExample')
            /**
             * cf.say displays a message. This is normally useless in tests, but can be useful if you record
             * demo video or for debugging;
             */
            .say('${message}')

        cf.task('sayPreExample')
            /**
             * cf.say has second parameter 'pre' which says, that text should be wrapped in 'pre'
             */
            .say('${message}', true)

        cf.task('sayPreExampleWithNextButton')
            /**
             * cf.say has third parameter 'nextButton' which gives name for [close] button, and makes
             * message stay forever when launched in slow mode (kind of demo)
             */
            .say('${message}', true, 'Give me more')
               
    });
})(window, document);
