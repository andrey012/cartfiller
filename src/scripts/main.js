(function(undefined) {
    var injector;
    window.addEventListener("message", function(event){
        var test = /^cartFillerMessage:(.*)$/.exec(event.data);
        if (test){
            var message = JSON.parse(test[1]);
            if (message.cmd == 'bootstrap') {
                require([
                    message.angular + '/angular/angular.min.js',
                ], function(){
                    require([
                        message.angular + '/angular-route/angular-route.min.js', 
                        message.angular + '/angular-resource/angular-resource.min.js'
                    ], function(){
                        require(['scripts/controller.js'], function(){
                            angular.module('cartFillerApp').service('cfMessage', function($rootScope){
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
                            injector = angular.bootstrap(document, ["cartFillerApp"]);
                        });
                    });
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