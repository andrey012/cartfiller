(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals){
        globals.baseUrl = job.cartFillerInstallationUrl.replace(/(src|dist)\/[^\/]*$/, 'testsuite/multidomain/');
        return {
            'open': [
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
                            api.arrow(e).openRelay(e.getAttribute('href')).result();
                            return false;
                        }
                    }, function() {api.result('link not found: [' + task.name + ']');});

                }
            ],
            'drill': [
                '', function() {
                    var fn = task.highlight ? 'highlight' : 'arrow';
                    api.drill(function(window) {
                        var pc = task.path.split('/');
                        var i = pc[0];
                        if (! i || task.all) {
                            api[fn](window.document.getElementsByTagName('a')[0]).result();
                        }
                        if (i) {
                            return window.frames[parseInt(i)];
                        }
                    }, function(window) {
                        var pc = task.path.split('/');
                        var i = pc[1];
                        if (! i || task.all) {
                            api[fn](window.document.getElementsByTagName('a')[0]).result();
                        }
                        if (i) {
                            return window.frames[parseInt(i)];
                        }
                    }, function(window) {
                        var pc = task.path.split('/');
                        var i = pc[2];
                        if (! i || task.all) {
                            api[fn](window.document.getElementsByTagName('a')[0]).result();
                        }
                        if (i) {
                            return window.frames[parseInt(i)];
                        }
                    }, function(window) {
                        var pc = task.path.split('/');
                        var i = pc[3];
                        if (! i || task.all) {
                            api[fn](window.document.getElementsByTagName('a')[0]).result();
                        }
                        if (i) {
                            return window.frames[parseInt(i)];
                        }
                    });
                }
            ]
        }
    });
})(window, document);