(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){

        /**
         * There are different ways to bring CartFiller to browser: 
         * 1. serve as static content from your web application
         * 2. use backend.js as proxy to your web application
         * 3. serve from filesystem
         * 4. serve from another domain
         * 
         * Of those - 1 and 2 are most common. In either case this variable will give you 
         * host and port where CartFiller was served and where most likely your project is. 
         * e.g. http://locahost:8080
         * 
         * So, add url of your project to this hostAndPort and open it using cf.openUrl
         */
        globals.hostAndPort = globals.hostAndPort || globals._cartFillerInstallationUrl.split('/').slice(0, 3).join('/');


        cf.task('yourFirstTask')
            .say('Your hostAndPort is ${hostAndPort}')
            .openUrl(globals.hostAndPort + '/')
            .ready()
            .get('a:visible')
            /**
             * go on writing steps
             */
    });
})(window, document);
