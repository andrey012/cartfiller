(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        
        /**
         * Globals is a key-value storage specific to test. Globals may have initial values, but may 
         * also be changed during test execution as well as from dashboard by doubleclicking on global value. 
         * On the dashboard they live at the very bottom of right dashboard. There are some predefined globals
         * that start with _ (underscore): 
         * * _random -- gives new random value each time
         * * _cartFillerInstallationUrl -- gives url from where CartFiller was launched
         * * _rootCartfillerPath -- gives url where the testsuite file cartfiller.js/json is
         */
        cf.task('readGlobalIntoItemName')
            .uselib('newTodoItem')
            /**
             * First of all .type and .paste will first look into task parameters, and 
             * if referenced parameter is not there - they will look in globals
             */
            .type('${globalParameterOne}')
            .get('#todo-list:visible label:visible')
            /**
             * Same thing with .withText selector function
             */
            .withText("${globalParameterTwo}")
            .exists()
            /**
             * In custom steps you can refer to globals directly
             */
            .then(function() {
                api.result(globals.globalParameterOne === 'globalParameterOneValue' ? '' : 'mismatch');
            })
            /**
             * Or using references which are better described in 
             * tutorial/testScenarioFeatures/referencingGlobalsTest.js
             */
            .then(function() {
                api.result(task.referencedGlobalVariable === 'globalParameterOneValue' ? '' : 'mismatch');
            })
            /**
             * Finally you can set variables within custom steps: 
             */
            .then(function() {
                globals.myGlobalVar = 'asdf';
                api.result();
            })
            .then(function() {
                api.result(globals.myGlobalVar === 'asdf' ? '' : 'mismatch');
            })
            /**
             * And you can modify task parameter, which, when connected to global variable will modify
             * global variable
             */
            .then(function() {
                if (task.referencedGlobalVariable !== 'globalParameterOneValue') {
                    return api.result('mismatch');
                }
                task.referencedGlobalVariable = 'newValue';
                api.result();
            })
            /**
             * So now globals.globalParameterOne will be 'newValue'
             */
            .then(function() {
                if (task.referencedGlobalVariable !== 'newValue') {
                    return api.result('mismatch');
                }
                api.result();
            })
        
    });
})(window, document);
