/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    var baseUrl = window.location.href.replace(/\/[^\/]+\/[^\/]*$/, '') + '/samples/sample-shop.html';
    var registerCallback = function(window, document, api, task, job){
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
    };
    cartFillerAPI().registerWorker(registerCallback);
})(window, document);