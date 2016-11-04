/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        /* basic entities: 
         * cf.task - define a task (list of steps)
         *   -> cf.use - use task
         * cf.lib - define helper function
         *   -> lib - use result of helper
         * cf.generator - define task builder (function with parameters that builds list of steps)
         *   -> cf.use - call generator and use generated steps
         * 
         * selectors
         * cf.get -- start selecting
         * .find, .closest, .parent, .filter
         * 
         * actions on selectors
         * .exists, .absent, .type, .click, .paste
         * 
         * actions that do not need selectors
         * .wait
         * .onload
         */
        cf
        .task('declarativeClearCart')
        .use(cf.task('declarativeOpenCart')
            .ifNot(
                lib(cf.lib('cartTitle', 
                    cf.get('h2:visible')
                    .filter(function(i,el){ return api.compareCleanText("Your cart", el.textContent);})
                )).exists(), 
                cf.get(cf.lib('openCartLink', cf
                    .get('a:visible')
                    .filter(function(i,el){ return api.compareCleanText("Open Cart", el.textContent);})
                ))
                .click()
                .get(lib(cf.lib('removeAllItemsButton', cf
                    .get('a:visible')
                    .filter(function(i,el){ return api.compareCleanText("Remove all items", el.textContent);})
                ))).exists()
            )
            .get('div#container:visible').find('table:visible').find('thead:visible').find('tr:visible th:visible').filter(function(i,el){ return api.compareCleanText("Total", el.textContent);}).exists()
            .get(lib('cartTitle')).exists()
            .share('declarativeOpenCartShare')
        )
        .use(cf.task('declarative - exported since - only Remove All Items button')
            .get(lib('removeAllItemsButton'))
            .click()
        )
         
        cf
        .task('declarativeClearCart2')
        .use('declarativeOpenCart')
        .get(lib('removeAllItemsButton'))
        .click()
        .export()

        cf
        .task('declarativeClearCart3')
        .use('declarativeOpenCartShare')
        .get(lib('removeAllItemsButton'))
        .click()
        .export()

        cf
        .generator('myGenerator', function(a, b, c) {
            return cf
                .say(a)
                .say(b)
                .say(c);
        })

        cf
        .task('declarativeGeneratedTask')
        .use('myGenerator', 1, 2, 3)
        .use('myGenerator', 4, 5, 6)
        .export()

        cf
        .task('declarativeTypePartNumber')
        .lib('partNumberInput', cf.get('input[name="partNumber"][type="text"]:visible'))
        .ifNot(lib('partNumberInput').exists(), cf.use('declarativeOpenHomeGenerator', true))
        .get(lib('partNumberInput')).as('searchBox')
        .lib('searchButton', cf.get('input[value="Search"][type="submit"]:visible'))
        .get(lib('searchButton')).as('searchButton')
        .with('searchBox').type('123')
        .with('searchBox').type('${part number}')
        .with('searchBox', 'searchButton').then(function(searchBox, searchButton) {
            api.arrow([searchBox[0], searchButton[0]], 1).result();
        })
        .with('searchButton').click()
        .use('waitForResultsToAppear')
        .export();

        cf
        .task('guessPartNumber')
        .then(function(){ 
            globals.guessedPartNumber = task['part number']; 
            api.result();
        })
        .name('restart')
        .use('declarativeOpenHomeGenerator', true)
        .get(lib('partNumberInput')).exists().type('${guessedPartNumber}')
        .get(lib('searchButton')).click()
        .lib('searchResultLines', cf
            .get('table.table.table-bordered:visible thead:visible tr:visible th:visible')
            .filter(function(i,el){ return api.compareCleanText("Part number", el.textContent);})
            .closest('table')
            .find('tbody:visible tr:visible')
        )
        .name('wait for results to appear').uselib('searchResultLines').exists()
        .since('wait for results to appear').share('waitForResultsToAppear')
        .if(
            lib('searchResultLines')
            .filter(function(i,e){return -1 === e.textContent.indexOf('Nothing found');})
            .exists(), 
            cf.skipStep('repeat')
        )
        .then(function(){ 
            globals.guessedPartNumber = (parseInt(globals.guessedPartNumber) + 1);
            api.result();
        })
        .name('repeat').repeatStep('restart')
        .export()
        
    });
})(window, document);
