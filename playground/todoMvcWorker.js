(function(window, document, undefined){
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
        globals.baseUrl = globals._cartFillerInstallationUrl.replace(/\/[^\/]*\/?$/, '') + '/node_modules/todomvc/examples/react';

        cf.task('openTodomvc')
            // we have sample distribution of TodoMVC in node_modules
            .openUrl(globals.baseUrl)
            // let's wait for some element to appear and then make sure
            // that at least document.readyState is complete
            .get('input#new-todo:visible')
            .exists()
            .ready()
            .say('we are ready')


        cf.task('removeAllItems')
            .nop() // this is for audio recording not to go crazy about looping
            .while( // repeat while todo list is visible
                // first argument of .where is condition
                cf.get( // .get is used to start searching for elements - either by 
                        // specifying selector or by using library
                    cf.lib( // cf.lib stores selector into a library. Normally 
                            // this does not mean that selector will be evaluated, but
                            // when cf.lib is the last element inside cf.get - it 
                            // will be evaluated
                        'todolist', // this is name of lib item to store
                        cf.get('ul#todo-list:visible')  // and this is selector, which 
                                                        // we will reuse later
                    )
                ).exists(), // this is the end of condition statement - the condition says, that
                            // specified elements should exist

                // and here comes the loop body
                // find all destroy buttons
                cf.getlib('todolist') // here we are reusing selector that will give us todo list
                .find('button.destroy') // searching inside list
                .first() // selecting first
                .css('display', 'block') // force it to appear (since we can't simulate hover event)
                .exists() // just make visual pause
                .click() // and click on it
            )
            .say('all items removed')


        cf.task('addItem')
            .get('#new-todo:visible') // search for new task input
            .exists() // just make visual pause
            .type('${name}')
            .enter()
            // make sure that item exists, use getItemLi
            // from lib for that, we'll define getItemLi later
            .getlib('getItemLi')
            .exists() 
            .say('item \'${name}\' added')


        cf.task('triggerCheckbox')
            .lib(   // here we are putting selector to lib, and it will not be evaluated until we
                    // use .getlib() later. For now it will only be stored to library. 
                'getItemLi', 
                cf
                    .getlib('todolist') // we can reuse other lib items
                    .find('label:visible')  // we are searching for label that contains item name
                                            // by doing it in two steps
                    .withText('${name}') // get name from task properties
                    .closest('li:visible') // now we want to return whole li, not just label.
            )
            .getlib('getItemLi') // here we evaluate lib item, that we earlier defined
            .find('input[type="checkbox"]:visible') // inside it we are looking for checkbox input
            .exists() // just make visual pause
            .click() 

        cf.task('filter')
            .get('#filters:visible a:visible')
            .withText('${type}')
            .exists() // just make visual pause
            .click()
            // let's make sure filter became selected
            .get('#filters:visible a.selected:visible')
            .withText('${type}')
            .exists()


        cf.task('makeSureItemIsNotThere')
            .getlib('getItemLi') // by using this lib item, we add 'name' parameter to 
                                 // this task, which have to be defined in test.js
            .absent()

        cf.task('makeSureItemIsThere')
            .getlib('getItemLi')
            .exists()
            
    });
})(window, document);
