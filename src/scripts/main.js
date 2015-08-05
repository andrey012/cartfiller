(function(undefined) {
    var injector;
    window.addEventListener('message', function(event){
        var test = /^cartFillerMessage:(.*)$/.exec(event.data);
        var isDist = false;
        if (test){
            var message = JSON.parse(test[1]);
            if (message.cmd === 'bootstrap') {
                var paths = {
                    'angular': message.lib + '/angular/angular.min',
                    'angular-route': message.lib + '/angular-route/angular-route.min',
                    'jquery': message.lib + '/jquery/dist/jquery.min',
                    'bootstraptw': message.lib + '/bootstrap/dist/js/bootstrap.min',
                };
                var shim = {
                    'angular' : {exports: 'angular', deps: ['jquery', 'bootstraptw']},
                    'angular-route': ['angular'],
                    'bootstraptw': ['jquery']
                };
                var deps = ['bootstrap'];
                if (message.tests) {
                    paths['jquery-cartFiller'] = message.src + 'jquery-cartFiller';
                    shim['jquery-cartFiller'] = ['jquery'];
                    deps.push('jquery-cartFiller');
                }
                require.config({
                    paths: paths,
                    shim: shim,
                    deps: deps,
                    waitSeconds: 30
                });
                define('cfMessageService', ['app'], function(app){
                    app.service('cfDebug', function(){
                        return {
                            debugEnabled: message.debug
                        };
                    }),
                    app.service('cfMessage', function(){
                        var postMessageListeners = [];
                        return {
                            send: function(cmd, details) {
                                if (undefined === details) {
                                    details = {};
                                }
                                details.cmd = cmd;
                                event.source.postMessage('cartFillerMessage:' + JSON.stringify(details), '*');
                            },
                            receive: function(cmd, details) {
                                angular.forEach(postMessageListeners, function(listener){
                                    listener(cmd, details);
                                });
                            },
                            register: function(cb){
                                postMessageListeners.push(cb);
                            },
                            testSuite: message.testSuite
                        };
                    });
                });
                if (message.tests) {
                    require(['jquery-cartFiller'], function(){
                        var a = $('<a/>');
                        $('body').append(a);
                        a.hide();
                        var settings = {
                            type: 'framed',
                            minified: false,
                            chooseJob: window.location.href.split('?')[0],
                            debug: true,
                            baseUrl: window.location.href.split('?')[0].replace(/\/[^\/]*$/, ''),
                            inject: 'script',
                            traceStartup: false,
                            logLength: false,
                            useSource: ! isDist
                        };
                        a.cartFillerPlugin(settings);
                        a[0].click();
                    });
                } else {
                    require(['bootstrap'], function(app){
                        injector = app;
                    });
                    require(['jquery'], function() {
                        jQuery(message.testSuite ? '#testSuiteManager' : '#workerContainer').show();
                    });
                }
            } else {
                if ('object' === typeof injector){
                    injector.invoke(['cfMessage', function(cfMessage){
                        cfMessage.receive(message.cmd, message);
                    }]);
                }
            }
        }
    }, false);

    if (window.parent !== window) {
        window.parent.postMessage('cartFillerMessage:{"cmd":"register"}', '*');
    } else {
        window.postMessage(
            'cartFillerMessage:' + 
            JSON.stringify({
                cmd: 'bootstrap', 
                lib: window.location.href.split('?')[0].replace(/\/[^\/]+\/[^\/]*$/, '/lib/'),
                debug: true,
                tests: true,
                src: window.location.href.split('?')[0].replace(/[^\/]+$/, '')
            }),
            '*'
        );
    }
})();
