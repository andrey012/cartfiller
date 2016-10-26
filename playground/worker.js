(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        globals.baseUrl = globals._cartFillerInstallationUrl.replace(/\/[^\/]*\/?$/, '');

        cf.task('openTodomvc')
            .openUrl(globals.baseUrl + '/node_modules/todomvc/examples/react')
            .get('input#new-todo:visible').exists().ready().say('we are ready')


        cf.task('removeAllTasks')
            .while(
                cf.get(cf.lib('todolist', cf.get('ul#todo-list:visible'))).exists(),
                cf.getlib('todolist').find('button.destroy').first().css('display', 'block').exists().click()
            )


        cf.task('addTask')
            .get('#new-todo:visible')
            .type(function(){return task.name + '\r'; })
            .getlib('getTaskLi').exists()


        cf.task('triggerCheckbox')
            .get(cf.lib('getTaskLi', cf
                .getlib('todolist').find('label:visible').filter(function(i,el){ return api.compareCleanText(task.name, el.textContent);}).closest('li:visible')
            ))
            .find('input.toggle:visible').exists().click()

        cf.task('filter')
            .get('#filters:visible a:visible').filter(function(i,el){ return api.compareCleanText(task.type, el.textContent);}).exists().click()


        cf.task('makeSureTaskIsNotThere')
            .getlib('getTaskLi').absent()

        cf.task('makeSureTaskIsThere')
            .getlib('getTaskLi').exists()
            
    });
})(window, document);
