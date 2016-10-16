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
                    api.result(api.compare(task.host, this.getElementById('domainname').textContent));
                }
            ]


        };
    });
})(window, document);