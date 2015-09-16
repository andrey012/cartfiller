(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals){
        function j(s) { return window.jQuery ? window.jQuery(s) : []; }
        function jc(s) { 
            var iframe = j('[name="cartFillerChooseJobFrame"]:visible');
            if (! iframe.length) return [];
            return iframe[0].contentWindow.jQuery ? iframe[0].contentWindow.jQuery(s) : [];
        }
        function jw(s) {
            var iframe = j('[name="cartFillerWorkerFrame"]:visible');
            if (! iframe.length) return [];
            return iframe[0].contentWindow.jQuery ? iframe[0].contentWindow.jQuery(s) : [];
        }
        function h(e,a,n) { api.arrow(e,a,n).result(e.length?'':('something not found: ' + ('string' === typeof e ? e : e.selector)));}
        return {
            'open start page': [
                'reset', function() {
                    if (window.location.href === 'about:blank') return api.nop();
                    window.location.href = 'about:blank';
                    api.onload();
                },
                'open start page', function() {
                    window.location.href = ((globals.baseUrl || window.parent.location.href.split('#')[0]) + '#root='  + job.cartFillerInstallationUrl.replace(/\/[^\/]+\/$/, '/testsuite/'));
                    api.onload(function() {
                        api.setTimeout(function(){
                            window.postMessage(
                                'cartFillerMessage:' + 
                                JSON.stringify({
                                    cmd: 'bootstrap', 
                                    lib: window.location.href.split(/[#?]/)[0].replace(/\/[^\/]+\/[^\/]*$/, '/lib/'),
                                    debug: true,
                                    tests: true,
                                    src: window.location.href.split(/[#?]/)[0].replace(/[^\/]+$/, ''),
                                    forceBootstrap: true
                                }),
                                '*'
                            );
                            api.waitFor(function() {
                                var iframe = j('[name="cartFillerChooseJobFrame"]:visible');
                                if (iframe.length) {
                                    api.drill(
                                        function(){
                                            return iframe[0].contentWindow;
                                        },
                                        function(window){
                                            var e = window.jQuery ? window.jQuery('#testslist') : [];
                                            if (e.length && e.find('tr').length > 5) {
                                                api.arrow(e.find('tr.test-row').slice(0,2), true, true).result();
                                            }
                                        }
                                    );
                                }
                            }, function(r){
                                api.result(r?'':'something went wrong');
                            });
                        },1000);
                    });
                }
            ],
            'say': [
                'say', function(e,sleep15000) {
                    if (task.highlight === "chooseJobFrame") {
                        api.highlight(j('[name="cartFillerChooseJobFrame"]:visible'));
                    }
                    if (task.highlight === "workerFrame") {
                        api.highlight(j('[name="cartFillerWorkerFrame"]:visible'));
                    }
                    if (! task.clearArrow) {
                        api.arrow(e,true,true);
                    }
                    api.say(task.message);
                    api.result();
                }
            ],
            'click expand': [
                'find test', function(e) {
                    h([jc('#testslist tr.test-row')[task.testIndex]]);
                }, 'find expand button', function(e) {
                    h(jc(e).find('button:contains("Expand")'));
                }, api.click()
            ],
            'find task': [
                'find task row', function(e, repeat10) {
                    h(jc('#testslist tr.task-row:contains("' + task.taskName + '")'));
                }, 'find link', function(e) {
                    h(jc(e).find('a').first());
                }
            ],
            'click': [
                api.click(function(e){api.arrow(e).result();}),
                'if necessary - pause and repeat', function(e) {
                    api.arrow(e);
                    if (! task.clicks) return api.nop();
                    task.clicks --;
                    api.setTimeout(function() {
                        api.repeatTask().nop();
                    }, task.interval);
                }
            ],
            'find task in worker': [
                'find task row', function(e, repeat10) {
                    h(jw('#jobDetails div:contains("' + task.taskName + '") strong').first(), false, true);
                }
            ],
            'find step button': [
                'find step button', function(e) {
                    h(jw('#buttonPanel a[title="Step"]'));
                }, 
            ],
            'toggle ChooseJob frame': [
                'find button', function(e) {
                    h(e = jw('#chooseJobButton'));
                    e[0].click();
                }
            ],
            'load test': [
                'find test', function(e) {
                    h([jc('#testslist tr.test-row')[task.testIndex]]);
                }, 'find expand button', function(e) {
                    h(jc(e).find('button:contains("Load")'));
                }, api.click()
            ]








        };
    });
})(window, document);