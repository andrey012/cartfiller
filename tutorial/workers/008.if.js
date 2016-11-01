(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){

        cf.task('ifDemo')
        /**
         * .if gets two parameters - condition and action. If condition is not met then
         * action steps are skipped
         */
            .if(
                cf.get('label:visible').exists(),
                cf.say('label exists').set('ifDemo', 'label exists')
            )

        /**
         * .ifNot is opposite to if
         */
            .ifNot(
                cf.get('iframe:visible').exists(),
                cf.say('iframe does not exist').set('ifNotDemo', 'iframe does not exist')
            )

        /**
         * You can use libraries and nest things as well as use your own steps. 
         */
            .if(
                cf.getlib('newTodoItem'),
                cf
                    .say('input exits').set('ifLibDemo', 'input exists')
                    .if(
                        cf.then(function() {
                            api.result()
                        }),
                        cf.say('my function evaluated to YES').set('customCondition1', 'YES')
                    )
                    .ifNot(
                        cf.then(function() {
                            api.result('error');
                        }),
                        cf.say('my function evaluated to NO').set('customCondition2', 'NO')
                    )
            )
        
    });
})(window, document);
