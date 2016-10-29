/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        cf
        .task('declarativeOpenHome')
        .generator('declarativeOpenHomeGenerator', function(noOnload) {
            return cf
                .name('find home link').get('a').first()
                .useIf(noOnload, cf.click())
                .useIfNot(noOnload, cf.click(api.onload)) // tbd: think how to avoid using api here
                .getlib('partNumberInput')
                .exists()
        })
        .use('declarativeOpenHomeGenerator', true)
        .export()
        
    });
})(window, document);
