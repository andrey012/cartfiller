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
        var prefix = 'cartFillerMessage:';
        var isDist = false;
        if (prefix === event.data.substr(0, prefix.length)) {
            var message = JSON.parse(event.data.substr(prefix.length));
            if (message.cmd === 'bootstrap') {
                if (bootstrapped && ! message.forceBootstrap) {
                    return;
                }
                bootstrapped = true;
                if (message.dummy) {
                    return;
                }
                if (message.forceBootstrap) {
                    event = {source: window};
                }
                var paths = {
                    'angular': message.lib.replace(/\/$/, '') + '/angular/angular.min',
                    'angular-route': message.lib.replace(/\/$/, '') + '/angular-route/angular-route.min',
                    'jquery': message.lib.replace(/\/$/, '') + '/jquery/dist/jquery.min',
                    'bootstraptw': message.lib.replace(/\/$/, '') + '/bootstrap/dist/js/bootstrap.min',
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
                        var callPhantom = false;
                        try {

                            if (window.parent && window.parent.callPhantom && ('function' === typeof window.parent.callPhantom)) {
                                callPhantom = window.parent.callPhantom;
                            }
                        } catch (e) {}
                        return {
                            debugEnabled: message.debug,
                            src: message.src,
                            useSource: ! isDist,
                            callPhantom: callPhantom,
                            makeFilesystemSafeTestName: function(testName) {
                                var pc = testName.split('?');
                                var name = encodeURIComponent(pc.shift());
                                if (! pc.length) {
                                    return name;
                                }
                                var params = encodeURIComponent(pc.join('?'));
                                if (params.length > 64) {
                                    // we need some extremely simple hashing for everything after 32 chars
                                    var first = params.substr(0, 32);
                                    var toHash = params.substr(32).split('').map(function(c){ return c.charCodeAt(0);});
                                    for (var i = 24; i < toHash.length; i ++ ) {
                                        toHash[i % 24] += toHash[i];
                                    }
                                    var second = btoa(
                                        String.fromCharCode.apply(
                                            null, 
                                            new Uint8Array(
                                                toHash.slice(0, 24).map(function(v){
                                                    return v % 256;
                                                })
                                            )
                                        )
                                    );
                                    params = first + second;
                                }
                                return name + encodeURIComponent('?') + params;
                            }
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
                            hashUrl: message.hashUrl,
                            urlOnBoot: message.urlOnBoot
                        };
                    });
                });
                if (message.tests) {
                    var x = new XMLHttpRequest();
                    x.onload = function(){
                        if (x.responseText !== '?' + config.gruntBuildTimeStamp && x.responseText !== '?0000000000') {
                            console.log('new version of CartFiller was deployed, switching to it');
                            var hash = window.location.href.split('#');
                            var pc = hash[0].split('?');
                            var version = 'cfv' + x.responseText.replace('?', '');
                            var params;
                            if (pc.length > 1) {
                                params = pc.slice(1).join('?').replace(/cfv\d{10,14}/, version);
                                if (-1 === params.indexOf(version)) {
                                    params += '&' + version;
                                }
                            } else {
                                params = version;
                            }
                            hash[0] = pc[0] + '?' + params;
                            // let's show message and then safely redirect to newer version. 
                            document.write('<!DOCTYPE html><html><head></head><body data-old-cartfiller-version-detected="1"><h1>Cached cartfiller version is older then now available from the server. Please refresh you page to make browser refresh application cache, do Ctrl-Shift-R or Cmd-Shift-R to enforce cache cleanup, or use other tools to clean cache. If you will not refresh, then you will be redirected to new version automatically in 15 seconds</h1></body></html>'); // jshint ignore:line
                            setTimeout(function() {
                                window.location.href = hash.join('#');
                            }, 15000);
                        }
                    };
                    x.open('GET', window.location.href.split(/[#?]/)[0].replace(/\/[^\/]*$/, '/version.json'), true);
                    x.send();
                    require(['jquery-cartFiller'], function(){
                        var myselfUrl = window.location.href.split('#')[0] + (-1 !== window.location.href.indexOf(config.gruntBuildTimeStamp) ? '' : (
    config.gruntBuildTimeStamp ? ((window.location.href.split('#')[0].indexOf('?') === -1 ? '?' : '&') + 
    config.gruntBuildTimeStamp) : ''));
                        var options = {
                            type: 'framed',
                            minified: false,
                            chooseJob: myselfUrl,
                            workerFrameUrl: myselfUrl,
                            debug: true,
                            baseUrl: window.location.href.split(/[#?]/)[0].replace(/\/[^\/]*$/, ''),
                            inject: 'script',
                            traceStartup: false,
                            logLength: false,
                            useSource: ! isDist,
                            useBuildVersion: true
                        };
                        eval($.cartFillerPlugin.getBookmarkletCode(options));  // jshint ignore:line
                    });
                } else {
                    require(['bootstrap'], function(app){
                        injector = app;
                    });
                    require(['jquery'], function() {
                        setTimeout(function showUI() {
                            var div = jQuery(message.testSuite ? '#testSuiteManager.rendered' : '#workerContainer.rendered');
                            if (div.length) {
                                div.show();
                            } else {
                                setTimeout(showUI, 100);
                            }
                        },100);
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

    if (window.parent && window.parent !== window && ! /\#?\/?launchSlaveInFrame$/.test(window.location.hash)) {
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
                lib: window.location.href.split(/[#?]/)[0].replace(/\/[^\/]+\/[^\/]*$/, '/lib/'),
                debug: true,
                tests: true,
                src: window.location.href.split(/[#?]/)[0].replace(/[^\/]+$/, '')
            }),
            '*'
        );
    }
})();
