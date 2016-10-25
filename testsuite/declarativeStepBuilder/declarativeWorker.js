/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        cf
        .lib('cartTitle', cf.get('h2:visible').filter(function(i,el){ return api.compareCleanText("Your cart", el.textContent);}))
        .if(lib('cartTitle').exists(), cf.skipStep('wait for remove all items button to appear'))
        .lib('openCartLink', cf.get('a:visible').filter(function(i,el){ return api.compareCleanText("Open Cart", el.textContent);}))
        .then(function(){
            lib('openCartLink').exists();
        })
        .get(lib('openCartLink'))
        .click()
        .lib('removeAllItemsButton', cf.get('a:visible').filter(function(i,el){ return api.compareCleanText("Remove all items", el.textContent);}))
        .name('wait for remove all items button to appear').waitFor(lib('removeAllItemsButton').exists())
        .get(lib('cartTitle')).exists()
        .share('declarativeOpenCartShare')
        .export('declarativeOpenCart')

        .name('find remove all items button')
        .get(lib('removeAllItemsButton'))
        .click()
        .export('declarativeClearCart')
        .since('find remove all items button').export('declarative - exported since - only Remove All Items button')
         
        cf
        .use('declarativeOpenCart')
        .get(lib('removeAllItemsButton'))
        .click()
        .export('declarativeClearCart2')

        cf
        .use('declarativeOpenCartShare')
        .get(lib('removeAllItemsButton'))
        .click()
        .export('declarativeClearCart3')

        cf
        .generator('myGenerator', function(a, b, c) {
            return cf
                .say(a)
                .say(b)
                .say(c);
        })

        cf
        .use('myGenerator', 1, 2, 3)
        .use('myGenerator', 4, 5, 6)
        .export('declarativeGeneratedTask')

        cf
        .lib('partNumberInput', cf.get('input[name="partNumber"][type="text"]:visible'))
        .ifNot(lib('partNumberInput'), cf.use('declarativeOpenHomeGenerator', true))
        .get(lib('partNumberInput')).as('searchBox')
        .lib('searchButton', cf.get('input[value="Search"][type="submit"]:visible'))
        .get(lib('searchButton')).as('searchButton')
        .with('searchBox').type(cf.const('123'))
        .with('searchBox').type('part number')
        .with('searchBox', 'searchButton').then(function(searchBox, searchButton) {
            api.arrow([searchBox[0], searchButton[0]], 1).result();
        })
        .with('searchButton').click()
        .use('waitForResultsToAppear')
        .export('type part number');

        cf
        .then(function(){ 
            globals.guessedPartNumber = task['part number']; 
            api.result();
        })
        .name('restart')
        .use('declarativeOpenHomeGenerator', true)
        .get(lib('partNumberInput')).exists().type('guessedPartNumber')
        .get(lib('searchButton')).click()
        .lib('searchResultLines', cf.get('table.table.table-bordered:visible thead:visible tr:visible th:visible').filter(function(i,el){ return api.compareCleanText("Part number", el.textContent);}).closest('table').find('tbody:visible tr:visible'))
        .name('wait for results to appear').waitFor(lib('searchResultLines').exists())
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
        .export('guessPartNumber')
        
    });
})(window, document);
