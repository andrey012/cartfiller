(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals){
        globals.baseUrl = job.cartFillerInstallationUrl.replace(/(src|dist)\/[^\/]*$/, 'testsuite/multiwindow/');
        return {
            'open home': [
                'reset', function(){
                    api.setAdditionalWindows();
                },
                'open', function(){
                    window.location.href = globals.baseUrl;
                    api.onload();
                }
            ],
            'start 2-window mode': [
                '', function() {
                    api.setAdditionalWindows([
                        {
                            url: globals.baseUrl.replace(globals.thisHost, globals.otherHost),
                            slave: job.cartFillerInstallationUrl.replace(globals.thisHost, globals.otherHost)
                        }
                    ]);
                }
            ],
            'start 3-window mode': [
                '', function() {
                    api.setAdditionalWindows([
                        {
                            url: globals.baseUrl.replace(globals.thisHost, globals.otherHost),
                            slave: job.cartFillerInstallationUrl.replace(globals.thisHost, globals.otherHost)
                        },
                        {
                            url: globals.baseUrl.replace(globals.thisHost, globals.thirdHost),
                            slave: job.cartFillerInstallationUrl.replace(globals.thisHost, globals.thirdHost)
                        }
                    ]);
                }
            ],
            'switch to window': [
                '', function() {
                    api.switchToWindow(task.window).result();
                }
            ],
            'make sure, that Hello World is there': [
                '', function() {
                    var e = this.getElementById('domainname');
                    api.arrow(e).result(api.compare(task.host, e.textContent.split(':')[0]));
                }
            ],
            'check marshalling return values between windows': [
                'switch to source window', function() {
                    api.switchToWindow(task.src).result();
                }, 'return value', function() {
                    api.return(task.value).result();
                }, 'switch to dst window', function() {
                    api.switchToWindow(task.dst).result();
                }, 'verify result', function(x, y){
                    api.result(api.compare(task.value, y));
                }
            ],
            'start 1-window mode': [
                'switch to 1st window', function(){
                    api.switchToWindow(0).result();
                },
                '', function() {
                    api.setAdditionalWindows();
                }
            ]






        };
    });
})(window, document);