(function(undefined) {
    var injector;
    var config = {};
    var bootstrapped = false;
    var reportError = function(message) {
        if (window.cartFillerEventHandler) {
            window.cartFillerEventHandler({message: message, filename: 'main.js', lineno: 0});
        }
        alert(message);
    };
    setTimeout(function() {
        if (! bootstrapped) {
            reportError('bootstrap message did not come');
        }
    }, 10000);
    config.gruntBuildTimeStamp='';
    window.addEventListener('message', function(event){
        var test = /^cartFillerMessage:(.*)$/.exec(event.data);
        var isDist = false;
        if (test){
            var message = JSON.parse(test[1]);
            if (message.cmd === 'bootstrap') {
                bootstrapped = true;
                if (message.dummy) {
                    return;
                }
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
                if (message.tests || message.testSuite) {
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
                            testSuite: message.testSuite,
                            hashUrl: window.location.hash
                        };
                    });
                });
                if (message.tests) {
                    require(['jquery-cartFiller'], function(){
                        var options = {
                            type: 'framed',
                            minified: false,
                            chooseJob: window.location.href + (
    config.gruntBuildTimeStamp ? ((window.location.href.indexOf('?') === -1 ? '?' : '&') + 
    config.gruntBuildTimeStamp) : ''),
                            debug: true,
                            baseUrl: window.location.href.split('?')[0].replace(/\/[^\/]*$/, ''),
                            inject: 'script',
                            traceStartup: false,
                            logLength: false,
                            useSource: ! isDist
                        };
                        eval($.cartFillerPlugin.getBookmarkletCode(options));  // jshint ignore:line
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

    if (window.parent && window.parent !== window) {
        window.parent.postMessage('cartFillerMessage:{"cmd":"register"}', '*');
    } else {
        setTimeout(function(){
            if (! window.cartFillerAPI) {
                reportError('inject.js was not launched');
            }
        }, 10000);
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
