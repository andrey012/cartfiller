/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals){
        var baseUrl = job.cartFillerInstallationUrl.replace(/\/[^\/]+\/?$/, '') + '/samples/sample-shop.html';
        var githubPattern = /^https?\:\/\/andrey012.github.io\/cartfiller\//;
        if (githubPattern.test(job.cartFillerInstallationUrl)) {
            baseUrl = githubPattern.exec(job.cartFillerInstallationUrl)[0];
        }
        globals.greeting = 'World';
        return {
            sayHello: [
                'open homepage', function() {
                    window.location.href = baseUrl;
                    api.onload();
                },
                'say hello', function() {
                    api.highlight(window.$('#navbar')).say('Hello ' + globals.greeting).result();
                }
            ]
        };
    });
})(window, document);