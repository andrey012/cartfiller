(function(undefined) {
    var injector;
    window.addEventListener("message", function(event){
        var test = /^cartFillerMessage:(.*)$/.exec(event.data);
        if (test){
            var message = JSON.parse(test[1]);
            if (message.cmd == 'bootstrap') {
                require.config({
                    paths: {
                        'angular': message.lib + '/angular/angular.min',
                        'angular-route': message.lib + '/angular-route/angular-route.min',
                        'angular-resource': message.lib + '/angular-resource/angular-resource.min',
                        'jquery': message.lib + '/jquery/dist/jquery.min',
                        'bootstraptw': message.lib + '/bootstrap/dist/js/bootstrap.min',
                    },
                    shim: {
                        'angular' : {exports: 'angular', deps: ['jquery', 'bootstraptw']},
                        'angular-route': ['angular'],
                        'angular-resource': ['angular'],
                        'bootstraptw': ['jquery'],
                    },
                    deps: ['bootstrap'],
                });
                define('cfMessageService', ['app'], function(app){
                    app.service('cfDebug', function(){
                        return {
                            debugEnabled: message.debug
                        };
                    }),
                    app.service('cfMessage', function($rootScope){
                        var postMessageListeners = [];
                        return {
                            send: function(cmd, details) {
                                if (undefined === details) {
                                    details = {};
                                }
                                details.cmd = cmd; event.source.postMessage('cartFillerMessage:' + JSON.stringify(details), '*');
                            },
                            receive: function(cmd, details) {
                                angular.forEach(postMessageListeners, function(listener){
                                    listener(cmd, details);
                                });
                            },
                            register: function(cb){
                                postMessageListeners.push(cb);
                            }
                        }
                    });
                });
                require(['bootstrap'], function(app){
                    injector = app;
                });
            } else {
                if ("object" === typeof injector){
                    injector.invoke(['cfMessage', '$rootScope', function(cfMessage, $rootScope){
                        $rootScope.$apply(function(){
                            cfMessage.receive(message.cmd, message);
                        });
                    }]);
                }
            }
        }
    }, false);

    window.parent.postMessage('cartFillerMessage:{"cmd":"register"}', '*');
})();