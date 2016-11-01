(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        /**
         * Library entries are sets of steps that are shared between all workers. They have one common 
         * namespace. Usually it is useful to add some selectors into library, (aka page objects), so, that
         * when DOM of target application changes after redesign you only have to change your library entry.
         */

        cf.task('toggleItem')
        /**
         * .lib adds a step or several steps to a library. 
         * IMPORTANT: .lib does not add this steps to this task, only to the library. 
         */
            .lib('todolist', cf
                .get('ul#todo-list:visible')
            )
        /**
         * if you want to add something to library and use it right away, do
         * .get(cf.lib( ... ))
         */
            .get(
                cf.lib(
                    'getItemLi', 
                    cf
        /**
         * .getlib gets something from library.
         */
                        .getlib('todolist')
                        .find('label:visible')
                        .withText('${name}')
                        .closest('li:visible')
                )
            )
            .find('input[type="checkbox"]:visible')
            .click()

        /**
         * You can also put something to the library outside of task: 
         */
        cf
            .lib('newTodoItem', cf.get('#new-todo:visible'))


        
    });
})(window, document);
