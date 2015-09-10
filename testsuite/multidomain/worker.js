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
                    api.drill(function(window) {
                        if (task.level === 0) {
                            api.arrow(window.document.getElementsByTagName('a')[0]).result();
                        } else {
                            return window.frames[0];
                        }
                    }, function(window) {
                        if (task.level === 1) {
                            api.arrow(window.document.getElementsByTagName('a')[0]).result();
                        } else {
                            return window.frames[0];
                        }
                    }, function(window) {
                        if (task.level === 2) {
                            api.arrow(window.document.getElementsByTagName('a')[0]).result();
                        } else {
                            return window.frames[0];
                        }
                    }, function(window) {
                        if (task.level === 3) {
                            api.arrow(window.document.getElementsByTagName('a')[0]).result();
                        } else {
                            return window.frames[0];
                        }
                    });
                }
            ]
        }
    });
})(window, document);