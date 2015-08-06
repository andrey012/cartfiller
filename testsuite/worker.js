/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job){
        var baseUrl = job.rootCartfillerPath.replace(/\/[^\/]+\/?$/, '') + '/samples/sample-shop.html';
        return {
            sayHello: [
                'open homepage', function() {
                    window.location.href = baseUrl;
                    api.onload();
                },
                'say hello', function() {
                    api.highlight(window.$('#navbar')).say('Hello').result();
                }
            ]
        };
    });
})(window, document);