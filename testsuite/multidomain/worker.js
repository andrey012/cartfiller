(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals){
        globals.baseUrl = job.cartFillerInstallationUrl.replace(/(src|dist)\/[^\/]*$/, 'testsuite/multidomain/');

        var selectFrameForLevel = function(level) {
            var pc = task.path.split('/');
            var i = pc[level];
            return api.document().defaultView.frames[parseInt(i)];
        };
        var getPathLevel = function() {
            var pc = task.path.split('/');
            if (! pc[0]) {
                return 0;
            } else {
                return pc.length;
            }
        };
        return {
            'open': [
                '', function() { api.setTimeout(api.result, 5000); },
                '', function(){
                    window.location.href=globals.baseUrl;
                    api.onload();
                }
            ],
            'clicklink': [
                '', function(){
                    api.each(window.document.getElementsByTagName('a'), function(i,e){
                        if (e.textContent === task.name) {
                            api.say('b, value = ' + globals.value).arrow();
                            globals.value ++;
                            api.arrow(e).result();
                            return false;
                        }
                    }, function() {api.result('link not found: [' + task.name + ']');});
                },
                '', function(e){ 
                    e.click(); api.onload(); 
                }
            ],
            'open relay': [
                '', function() {
                    api.each(window.document.getElementsByTagName('a'), function(i,e){
                        if (e.textContent === task.host) {
                            var url = globals.withHelper ? globals._cartFillerInstallationUrl.replace(/127\.0\.0\.\d/, task.host) : e.getAttribute('href');
                            api.arrow(e).openRelay(url, globals.withThankYou).waitFor(function(){ return api.isRelayRegistered(url);});
                            return false;
                        }
                    }, function() {api.result('link not found: [' + task.name + ']');});

                }
            ],
            'drill': [
                '', function() {
                    var fn = task.highlight ? 'highlight' : 'arrow';
                    if (getPathLevel() === 0) {
                        api[fn](api.find('a').first()).result();
                    } else {
                        api.drill(
                            function() { 
                                return selectFrameForLevel(0, this);
                            },
                            function() {
                                if (getPathLevel() === 1) {
                                    api[fn](api.find('a').first()).result();
                                } else {
                                    api.drill(
                                        function() { 
                                            return selectFrameForLevel(1, this);
                                        },
                                        function() { 
                                            if (getPathLevel() === 2) {
                                                api[fn](api.find('a').first()).result();
                                            } else {
                                                api.drill(
                                                    function() { 
                                                        return selectFrameForLevel(2, this);
                                                    },
                                                    function() { 
                                                        if (getPathLevel() === 3, this) {
                                                            api[fn](api.find('a').first()).result();
                                                        } else {
                                                            api.result('too much');
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    )
                                }
                            }
                        );
                    }
                }
            ],
            'resetPasses': [
                '', function(){ globals.passes = 0; api.result(); },
            ],
            'clicklinkWithRecovery': [
                '', function(){
                    if (globals.passes) {
                        api.skipTask().result(api.compare(globals.urlThatShouldBeRecovered, window.location.href));
                    } else {
                        globals.urlThatShouldBeRecovered = window.location.href;
                        api.result();
                    }
                },
                '', function(){
                    globals.passes  = (globals.passes  || 0 ) + 1;
                    api.each(window.document.getElementsByTagName('a'), function(i,e){
                        if (e.textContent === task.name) {
                            api.say('b, value = ' + globals.value).arrow();
                            globals.value ++;
                            api.arrow(e).result();
                            return false;
                        }
                    }, function() {api.result('link not found: [' + task.name + ']');});
                },
                api.clicker(),
                '', function(){
                    api.result();
                }
            ],
            'repeatJob': [
                '', function() {
                    api.repeatJob().result();
                }
            ]

        }
    });
})(window, document);