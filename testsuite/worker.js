/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib){
        var baseUrl = job.cartFillerInstallationUrl.replace(/\/[^\/]+\/?$/, '') + '/samples/sample-shop.html?noBookmarklets';
        var githubPattern = /^https?\:\/\/andrey012.github.io\/cartfiller\//;
        if (githubPattern.test(job.cartFillerInstallationUrl)) {
            baseUrl = githubPattern.exec(job.cartFillerInstallationUrl)[0] + 'samples/sample-shop.html?noBookmarklets';
        }
        globals.greeting = 'World';
        return {
            sayHello: [
                'open homepage', function() {
                    window.location.href = baseUrl;
                    api.onload();
                },
                'say hello', function() {
                    api.highlight(window.$('#navbar')).say('Hello ' + globals.greeting).result();
                }
            ],
            useSharedGoToHome: [
                lib('goToHomeSteps')
            ],
            useSharedSearch: [
                lib('searchStepFactory', 321),
            ],
            dummyStepsStorageOfTestsuite: [
                // shared static steps can be defined by assiging property of lib:
                lib.staticSteps1 = [
                    'static testsuite step 1 1', function() {
                        api.return('static testsuite step 1 1').result();
                    }
                ],
                // nested steps are ok: static shared steps can include other shared steps
                lib.staticNestedSteps1 = [
                    // defined here:
                    lib.staticSteps2 = [
                        'static step 2', function() {
                            api.return('static step 2').result();
                        }
                    ],
                    // or defined elsewhere
                    lib('staticSteps1'),
                    'check result', function(r) {
                        api.result(api.compare('static testsuite step 1 1', r));
                    },
                    lib('testsuite.worker.staticSteps1'),
                    'check result', function(r) {
                        api.result(api.compare('static testsuite step 1 1', r));
                    },
                    lib('samples.worker.staticSteps1'),
                    'check result', function(r) {
                        api.result(api.compare('static samples step 1 1', r));
                    },
                ],
                // dynamic steps (steps builder) - is a function that returns array of steps
                // it should be defined like this. Once defined - its results will be injected in
                // this place
                lib('dynamicStep1')(function(param) { return [
                    'dynamic testsuite step', function() {
                        api.return('dynamic testsuite step ' + param).result();
                    }
                ]}),
                // dynamic steps can also be nested
                lib('dynamicNestedSteps')(function(param) { return [
                    lib('dynamicStep1', 'd'),
                    'check result', function(r) {
                        api.result(api.compare('dynamic testsuite step d', r));
                    },
                    lib('testsuite.worker.dynamicStep1', 'e'),
                    'check result', function(r) {
                        api.result(api.compare('dynamic testsuite step e', r));
                    },
                    lib('samples.worker.dynamicStep1', 'f'),
                    'check result', function(r) {
                        api.result(api.compare('dynamic samples step f', r));
                    },
                    'dynamic nested testsuite step', function() {
                        api.return('dynamic nested testsuite step ' + param).result();
                    }
                ]}),
                // helpers can also be defined right among steps - they will just be
                // ignored
                lib.theHelper = function() {
                    return 'helperOfTestsuite';
                }
            ],
            testStaticSteps: [
                lib('staticSteps1'),
                'check result', function(r) {
                    api.result(api.compare('static testsuite step 1 1', r));
                },
                lib('testsuite.worker.staticSteps1'),
                'check result', function(r) {
                    api.result(api.compare('static testsuite step 1 1', r));
                },
                lib('samples.worker.staticSteps1'),
                'check result', function(r) {
                    api.result(api.compare('static samples step 1 1', r));
                },
                lib('staticNestedSteps1'),
                'check result', function(r) {
                    api.result(api.compare('static samples step 1 1', r));
                },
                lib('staticSteps2'),
                'check result', function(r) {
                    api.result(api.compare('static step 2', r));
                }
            ],
            testDynamicSteps: [
                lib('dynamicStep1', 'a'),
                'check result', function(r) {
                    api.result(api.compare('dynamic testsuite step a', r));
                },
                lib('testsuite.worker.dynamicStep1', 'b'),
                'check result', function(r) {
                    api.result(api.compare('dynamic testsuite step b', r));
                },
                lib('samples.worker.dynamicStep1', 'c'),
                'check result', function(r) {
                    api.result(api.compare('dynamic samples step c', r));
                },
                lib('dynamicNestedSteps', 'x'),
                'check result', function(r) {
                    api.result(api.compare('dynamic nested testsuite step x', r));
                }
            ],
            testHelpers: [
                'check result', function() {
                    api.result(api.compare(lib.theHelper(), 'helperOfTestsuite'));
                },
                'check result', function() {
                    api.result(api.compare(lib.samples.worker.theHelper(), 'helperOfSamples'));
                },
                'check result', function() {
                    api.result(api.compare(lib.testsuite.worker.theHelper(), 'helperOfTestsuite'));
                },
            ],
            'show modal dialog': [
                '', function() {
                    api.modal('<textarea id="modalTextareaToModify"></textarea><br/><button id="modalButtonToClick">ok</button>', function(modal) {
                        var ta = modal.getElementsByTagName('textarea')[0];
                        ta.value = 'here is some data';
                        modal.getElementsByTagName('button')[0].onclick = function(){
                            api.result(api.compare('new data', window.document.getElementById('modalTextareaToModify').value));
                        };
                    });
                    api.setTimeout(function(){
                        window.document.getElementById('modalTextareaToModify').value = 'new data';
                        api.setTimeout(function(){
                            window.document.getElementById('modalButtonToClick').click();
                        }, 1000);
                    }, 1000);
                }
            ],
            repeatTask1: [
                'initialize globals', function(){
                    globals.passes = 10000000;
                    api.result();
                }
            ],
            repeatTask2: [
                'step1', function(){
                    globals.passes += 100000; api.result();
                },
                'step2', function(){
                    globals.passes += 10000; api.result();
                }
            ],
            repeatTask3: [
                'step1', function(){
                    globals.passes += 1000; api.result();
                },
                'step2', function(){
                    globals.passes += 100; api.result();
                }
            ],
            repeatTask4: [
                'step1', function(){
                    globals.passes += 10; 
                    if (globals.passes === 10111110) return api.repeatTask(3).nop();
                    if (globals.passes === 10222220) return api.repeatTask(2).nop();
                    if (globals.passes === 10223330) return api.repeatTask(1).nop();
                    if (globals.passes === 10223340) return api.repeatTask().nop();
                    if (globals.passes === 10223350) return api.result();
                    api.result(String(globals.passes));
                },
                'step2', function(){
                    globals.passes += 1; 
                    api.result(api.compare(10223351, globals.passes));
                }
            ],
            skipTask1: [
                'init', function(){
                    globals.passes = 0; api.result();
                }
            ],
            skipTask2: [
                '', function(){
                    globals.passes += 1000000000; api.skipTask().result();
                },
                '', function(){
                    globals.passes += 100000000; api.result();
                }
            ],
            skipTask3: [
                '', function(){
                    globals.passes += 10000000; api.skipTask(2).result();
                }, 
                '', function(){
                    globals.passes += 1000000; api.result();
                }
            ], 
            skipTask4: [
                '', function(){
                    globals.passes += 100000; api.result();
                }, 
                '', function(){
                    globals.passes += 10000; api.result();
                }
            ],
            skipTask5: [
                '', function(){
                    globals.passes += 1000; api.result();
                }
            ],
            skipTask6: [
                '', function(){
                    api.result(api.compare(1010001000, globals.passes));
                }
            ],
            magicParamRepeatTask1: [
                'step1', function() {
                    globals.passes = 0; api.result();
                }, 'step2', function(repeat20) {
                    globals.passes ++;
                    api.result(globals.passes > 10 ? '' : 'error');
                }
            ]
        };
    });
})(window, document);