
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){

        cf.task('addItem')
            .get('#new-todo:visible') // search for new task input
        /**
         * Tasks are parametrized. Parameters come from test scenarios and sometimes from globals.
         * Parameters can be referred to as ${parameterName} like this:
         */
            .type('${name}')
        
            .enter()
            .getlib('getItemLi')
            .exists() 
        /**
         * Or, inside your custom steps you can get them from task object: 
         */
            .then(function() {
                api.say('item \'' + task.name + '\' added').result();
            })
        /**
         * You can also modify task parameters in your custom step, but don't do that. 
         */
            .then(function() {
                task.someParam = 123;
                api.result();
            })
            .then(function() {
                api.result(api.compare(123, task.someParam));
            })


    });
})(window, document);
