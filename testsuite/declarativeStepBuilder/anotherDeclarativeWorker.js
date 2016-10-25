/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        cf
        .generator('declarativeOpenHomeGenerator', function(noOnload) {
            return cf
                .name('find home link').get('a').first().click()
                .useIfNot(noOnload, cf.click(api.onload)) // tbd: think how to avoid using api here
                .waitFor(lib('partNumberInput'))
        })
        .use('declarativeOpenHomeGenerator')
        .export('declarativeOpenHome')
        
    });
})(window, document);
