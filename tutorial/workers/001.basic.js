/**
 * Worker is JS file. Right now old vanilla JavaScript is used, there is no transilation. There is template
 * that can be used to start with new worker. 
 */
(function(window, document, undefined){
    /**
     * First of all it is important to understand, that your JS code operates into two completely
     * different stages - build time and run time. During build time you describe your steps. Usually
     * your code will not be executed during runtime, except custom steps. Parameters of this callback
     * have different meaning depending on stage. 
     * 
     * window is set to the frame where target website lives. 
     * document is set to null because it is new after each page load, so use window.document
     * api is helpful for writing your steps manually in an imperative manner, there are some helpers available
     *      during build, but most likely you will not need them.
     * task keeps task properties, again should be used in manual steps, does not make any sense during build
     * job keeps some other properties about test itself, probably you will not need it, available both during
     *      build and during run time
     * globals is available both during build time and runtime. 
     * lib is a shortcut to reference library entries, however it can be deprecated
     * cf is main entry point to declare you tasks and steps
     */
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        // Often there are several deployments of same project - dev, staging, demo, and it is 
        // useful to have tests on each instance, and tests should be able to figure out 
        // location of project themselves. There are two ways for that - 
        // * globals._cartFillerInstallationUrl - the one where cartfiller is, usually ends with 
        //        .../dist
        // * globals._rootCartfillerPath - the url of testsuite (cartfiller.js/json file), which 
        //        can be injected with url parameters, so you can have separate test url for 
        //        each deployment.
        // Using either of them you can figure out where your project is.
        // In this case we use cartfiller installation url - trim trailing /dist
        // In other case you will want to use globals._rootCartfillerPath or even your own
        // global variable
        globals.baseUrl = globals._cartFillerInstallationUrl.replace(/\/[^\/]*\/?$/, '') + '/node_modules/todomvc/examples/react';

        /**
         * cf.task starts task declaration. You do not need to say something in the end of the chain. 
         */
        cf.task('openTodomvc')
            /**
             * cf.openUrl simply makes window.location.href = specified url. It does not wait for page
             * to get loaded. 
             */
            .openUrl(globals.baseUrl)
            /**
             * cf.get executes css selector against document.
             */
            .get('input#new-todo:visible')
            /**
             * cf.exists is one of assertion, and all assertions implicitly wait for desired state to be 
             * reached. cf.exists asserts that there is at least one element found by selector.
             */
            .exists()
            /**
             * cf.then lets you take control over test execution. Parameters are results of previous steps
             * first parameter - result of nearest previous step, second parameter - result of step above, etc
             */
            .then(function(a, b, c/*, ... */) {
                api.arrow(a); // draws an arrow
                api.say(a.text()); // shows a message
                api.result(); // submits successful result
            })
            /**
             * cf.ready waits until document.readyState will become 'complete'
             */
            .ready()
            /**
             * cf.pause just waits for defined timeout in ms. Generally it is discouraged to use it,
             * but still sometimes you want it to be there
             */
            .pause(200)
            /**
             * cf.name names a step. This can be useful for 2 purposes: 
             * 1. name will become a title (shown when mouse hovered) for a step in the dashboard. By default
             *    step is named by the function that created it
             * 2. name can be referred to when sharing pieces of tasks (see 013.sharingSteps.js)
             */
            .name('myStepName').say('Hello')
            

        cf.task('More human readable task name')
            .say('Tasks can have more human readable names as well')


    });
})(window, document);
