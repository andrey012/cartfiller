define('testSuiteController', ['app', 'scroll'], function(app){
    'use strict';
    app
    .controller('testSuiteController', ['$scope', 'cfMessage', '$timeout', 'cfDebug', '$location', function ($scope, cfMessage, $timeout, cfDebug, $location){
        $location;
        cfDebug;
        $timeout;

        if (! cfMessage.testSuite) {
            return;
        }
        var parseJson = function(s){
            s = s.replace(/\,[ \t\n\r]*\]/g, ']').replace(/\,[ \t\n\r]*\}/g, '}').replace(/\t/g, '\\t').replace(/\r/g, '');
            var m;
            while (m = /(\{\s*\"[^"\n]*)\n/.exec(s)) {
                s = s.replace(m[0], m[1] + '\\n');
            }
            return JSON.parse(s);
        };
        var testToCheck = false;
        $scope.params = {};
        $scope.expandedTest = false;
        var parseParams = function() {
            var pc = window.location.href.split('?');
            pc.shift();
            angular.forEach(pc.join('?').split('#')[0].split('&'), function(v) {
                var pc = v.split('=');
                var name = pc.shift();
                $scope.params[decodeURIComponent(name)] = decodeURIComponent(pc.join('='));
            });
            if ($scope.params.editor) {
                $.cartFillerPlugin({'$preventPageReload': true});
            }
        };
        parseParams();
        console.log($scope.params);
        $scope.discovery = {
            state: 0,
            currentRootPath: $scope.params.root ? $scope.params.root : window.location.href.split('?')[0].replace(/\/[^\/]*/, '/'),
            visitedRootPaths: [],
            rootCartfillerJson: {},
            scripts: {
                flat: [],
                tweaks: [],
                currentDownloadingIndex: false,
                contents: [],
                rawContents: [],
                enabled: [],
                success: [],
                urls: [],
                hrefs: [],
                errors: {}
            }
        };
        $scope.runningAll = false;
        $scope.runAll = function () {
            $scope.runningAll = true;
            if ($scope.discovery.scripts.contents.length) {
                $scope.runTest(0);
            }
        };
        $scope.stopRunningAll = function() {
            $scope.runningAll = false;
        };
        var processConditionals = function(details, globals) {
            var result = [];
            var i, j, match;
            for (i = 0; i < details.length; i ++) {
                if ('undefined' === typeof details[i].task) {
                    if ('undefined' !== typeof details[i].if) {
                        if ('object' === typeof details[i].if) {
                            match = true;
                            for (j in details[i].if) {
                                if (String(details[i].if[j]) !== String(globals[j])) {
                                    match = false;
                                }
                            }
                        } else if ('string' === typeof details[i].if) {
                            match = 'undefined' !== typeof globals[details[i].if];
                        }
                        var src = [];
                        if (match && 'undefined' !== typeof details[i].then) {
                            src = processConditionals(details[i].then, globals);
                        } else if (! match && 'undefined' !== typeof details[i].else) {
                            src = processConditionals(details[i].else, globals);
                        }
                        for (j = 0 ; j < src.length; j++) {
                            result.push(src[j]);
                        }
                    }
                } else {
                    result.push(details[i]);
                }
            }
            return result;
        };
        var flattenCartfillerJson = function(json, r) {
            var i;
            var pc;
            var rr;
            r = r || [];
            var tweaks;
            for (i in json) {
                rr = r.filter(function(){return 1;});
                rr.push(i);
                if ('object' === typeof json[i]) {
                    pc = flattenCartfillerJson(json[i], rr);
                } else {
                    tweaks = {};
                    $scope.discovery.scripts.urls.push(rr.join('/'));
                    rr = rr.map(function(name){
                        var s = name.split('?');
                        s[1]=s.filter(function(el,i){return i>0;}).join('?');
                        if (s[1] && s[1].length) {
                            s[1].split('&').filter(function(tweak) {
                                var s = tweak.split('=');
                                if (undefined === s[1]) {
                                    tweaks[s[0]] = true;
                                } else {
                                    tweaks[s[0]] = decodeURIComponent(s[1]);
                                }
                            });
                        }
                        return s[0];
                    });
                    $scope.discovery.scripts.flat.push(rr);
                    $scope.discovery.scripts.tweaks.push(tweaks);
                    $scope.discovery.scripts.enabled.push(json[i]);
                }
            }
        };
        var discoverNextRootURL = function(){
            $.ajax({
                url: $scope.discovery.currentRootFile = $scope.discovery.currentRootPath.replace(/\/$/, '') + '/cartfiller.json?' + (new Date()).getTime(), 
                complete: function(xhr) {
                    if ($scope.discovery.state === 0) {
                        $scope.errorURL = false;
                        if (xhr.status === 200) {
                            try {
                                $scope.discovery.rootCartfillerJson = parseJson(xhr.responseText);
                                $scope.discovery.workerSrc = normalizeWorkerURLs($scope.discovery.rootCartfillerJson.worker, $scope.discovery.currentRootPath);
                                $scope.discovery.state = 1;
                                $scope.discovery.scripts.flat = [];
                                $scope.discovery.scripts.tweaks = [];
                                $scope.discovery.scripts.contents = [];
                                $scope.discovery.scripts.rawContents = [];
                                $scope.discovery.scripts.success = [];
                                $scope.discovery.scripts.enabled = [];
                                $scope.discovery.scripts.urls = [];
                                $scope.discovery.scripts.hrefs = {};
                                $scope.discovery.scripts.errors = {};
                                testToCheck = false;
                                flattenCartfillerJson($scope.discovery.rootCartfillerJson.tests);
                                $scope.discovery.scripts.currentDownloadingIndex = false;
                            } catch (e) {
                                $scope.discovery.state = -1;
                                $scope.errorURL = $scope.currentRootFile;
                                $scope.discovery.error = 'Invalid JSON file: ' + String(e);
                            }
                        } else {
                            var pc = $scope.discovery.currentRootPath.split('/');
                            pc.pop();
                            $scope.discovery.visitedRootPaths
                                .push($scope.discovery.currentRootFile);
                            if (pc.length < 3) {
                                $scope.discovery.state = -1;
                                $scope.discovery.error = 'cartfiller.json was not found, visited: ' + $scope.discovery.visitedRootPaths.join(', ');
                                $scope.discovery.currentRootFile = false;
                                $scope.discovery.currentRootPath = $scope.params.root ? $scope.params.root : window.location.href.split('?')[0].replace(/\/[^\/]*/, '/');
                            } else {
                                $scope.discovery.currentRootPath = pc.join('/');
                            }
                        }
                        $scope.$digest();
                        if ($scope.discovery.state >= 0) {
                            $scope.discover();
                        }
                    }
                }
            });
        };
        var processDownloadedTest = function(response, index) {
            var contents = parseJson(response);
            $scope.discovery.scripts.rawContents[index] = response;
            contents.details = processConditionals(contents.details, $scope.discovery.scripts.tweaks[index]);
            $scope.discovery.scripts.contents[index] = contents;
        };
        var normalizeWorkerURLs = function(urls, root) {
            if ('string' === typeof urls) {
                urls = [urls];
            }
            return urls.map(function(url) {
                var pre = root.replace(/\/$/, '') + '/';
                while (/^\.\.\//.test(url)) {
                    pre = pre.replace(/\/[^\/]+\/$/, '/');
                    url = url.replace(/^\.\.\//, '');
                }
                return pre + url;
            });
        };
        var downloadNextScriptFile = function() {
            if ($scope.discovery.scripts.currentDownloadingIndex === false) {
                $scope.discovery.scripts.currentDownloadingIndex = 0;
            } else {
                $scope.discovery.scripts.currentDownloadingIndex++;
            }
            if ($scope.discovery.scripts.currentDownloadingIndex >= $scope.discovery.scripts.flat.length) {
                // we are done
                $scope.discovery.state = 2;
                $scope.$digest();
                if ($scope.params.backend && ! $scope.params.editor) {
                    setTimeout(function(){
                        $scope.runAll();
                    });
                }
                if ($scope.params.goto) {
                    setTimeout(function() {
                        var index = $scope.getTestIndexByUrl($scope.params.goto);
                        if (undefined === index) {
                            alert('test not found: ' + $scope.params.goto);
                        } else {
                            $scope.runTest(index, 'fast', parseInt($scope.params.task) - 1, parseInt($scope.params.step) - 1);
                        }
                    });
                }
            } else {
                // let's download next file
                $.ajax({
                    url: $scope.discovery.currentDownloadedTestURL = $scope.discovery.scripts.hrefs[$scope.discovery.scripts.currentDownloadingIndex] =  $scope.discovery.currentRootPath.replace(/\/$/, '') + '/' + $scope.discovery.scripts.flat[$scope.discovery.scripts.currentDownloadingIndex].join('/').replace(/\.json$/, '') + '.json?' + (new Date()).getTime(),
                    complete: function(xhr) {
                        $scope.errorURL = false;
                        if (xhr.status === 200) {
                            try {
                                processDownloadedTest(xhr.responseText, $scope.discovery.scripts.currentDownloadingIndex);
                                downloadNextScriptFile();
                            } catch (e) {
                                $scope.discovery.state = -1;
                                $scope.discovery.error = 'Unable to parse test script: ' + String(e);
                                $scope.discovery.errorURL = $scope.discovery.currentDownloadedTestURL;
                            }
                        } else {
                            $scope.discovery.state = -1;
                            $scope.discovery.error = 'Error downloading test script:';
                            $scope.discovery.errorURL = $scope.discovery.currentDownloadedTestURL;
                        }
                        $scope.$digest();
                    }
                });
            }
        };
        $scope.getTestIndexByUrl = function(url) {
            var i;
            for (i = 0; i < $scope.discovery.scripts.urls.length; i++){
                if ($scope.discovery.scripts.urls[i] === url) {
                    return i;
                }
            }
        };
        $scope.discover = function() {
            switch ($scope.discovery.state) {
                case -1:
                    $scope.discovery.state = 0;
                    $scope.discover();
                    break;
                case 0:
                    discoverNextRootURL();
                    break;
                case 1: // download all test scripts and make sure that they are ok
                    downloadNextScriptFile($scope.discovery.rootCartfillerJson, $scope.discovery.currentScriptPath);
                    break;
                case -1:
                    break;

            }
        };
        $scope.discover();
        if ($scope.params.editor) {
            setTimeout(function refreshCurrentTest(){
                // check whether currently loaded test have changed and we need to replace it
                if (testToCheck !== false) {
                    $.ajax({
                        url: $scope.discovery.scripts.hrefs[testToCheck] + '?' + (new Date()).getTime(),
                        complete: function(xhr) {
                            if (xhr.status === 200) {
                                var oldContents = $scope.discovery.scripts.rawContents[testToCheck];
                                if (oldContents !== xhr.responseText) {
                                    try {
                                        processDownloadedTest(xhr.responseText, testToCheck);
                                        $scope.submitTestUpdate(testToCheck);
                                        $scope.$digest();
                                    } catch (e){}
                                }
                            }
                            setTimeout(refreshCurrentTest, 1000);
                        }
                    });
                } else {
                    setTimeout(refreshCurrentTest, 1000);
                }
            }, 1000);
        }
        $scope.submitTestUpdate = function(index) {
            var test = $scope.discovery.scripts.contents[index];
            $.cartFillerPlugin({'$cartFillerTestUpdate': test});
        };
        $scope.runTest = function(index, how, untilTask, untilStep, $event) {
            if ($event) {
                $event.stopPropagation();
            }
            $scope.discovery.scripts.errors[index] = {};
            testToCheck = index;
            var test = $scope.discovery.scripts.contents[index];
            test.workerSrc = $scope.discovery.workerSrc;
            test.autorun = how === 'load' ? 0 : 1;
            test.autorunSpeed = how === 'slow' ? 'slow' : 'fast';
            test.rootCartfillerPath = $scope.discovery.currentRootPath;
            test.globals = $scope.discovery.scripts.tweaks[index];
            test.trackWorker = $scope.params.editor;
            if (undefined !== untilTask) {
                test.autorunUntilTask = untilTask;
                test.autorunUntilStep = undefined !== untilStep ? untilStep : 0;
            } else {
                delete test.autorunUntilTask;
                delete test.autorunUntilStep;
            }
            $.cartFillerPlugin(
                test,
                false,
                function(data) {
                    if ($scope.params.backend && false !== data.currentTaskIndex && false !== data.currentTaskStepIndex) {
                        // report progress to backend
                        $.ajax({
                            url: $scope.params.backend.replace(/\/+$/, '') + '/progress/' + $scope.params.key,
                            method: 'POST',
                            data: {
                                test: $scope.discovery.scripts.urls[index],
                                task: data.currentTaskIndex,
                                taskName: $scope.discovery.scripts.contents[index].details[data.currentTaskIndex].task,
                                step: data.currentTaskStepIndex,
                                result: data.result[data.currentTaskIndex].stepResults[data.currentTaskStepIndex].status
                            }
                        });
                    }
                    if (data.completed && undefined === untilTask) {
                        $scope.discovery.scripts.success[index] = 0 === data.result.filter(function(r){return ! r.complete;}).length ? 1 : -1;
                        if ($scope.runningAll) {
                            while (index < $scope.discovery.scripts.enabled.length && ! $scope.discovery.scripts.enabled[index + 1]) {
                                $scope.discovery.scripts.success[index + 1] = -2;
                                index ++;
                            }
                        }
                        if ($scope.runningAll && index + 1 < $scope.discovery.scripts.contents.length) {
                            $scope.runTest(index + 1);
                        } else if ($scope.runningAll) {
                            $scope.runningAll = false;
                            $.cartFillerPlugin.showChooseJobFrame();
                            if ($scope.params.backend && ! $scope.params.editor) {
                                $.ajax({
                                    url: $scope.params.backend.replace(/\/+$/, '') + '/finish/' + $scope.params.key + '?' + (new Date()).getTime(),
                                    complete: function() {
                                        delete $scope.params.backend;
                                        delete $scope.params.key;
                                    }
                                });
                            }
                        }
                        $scope.$digest();
                    } else if (! data.running) {
                        $scope.runningAll = false;
                        $scope.$digest();
                    }
                    if (false !== data.currentTaskIndex &&
                        false !== data.currentTaskStepIndex &&
                        undefined !== data &&
                       undefined !== data.result &&
                       undefined !== data.result[data.currentTaskIndex] &&
                       undefined !== data.result[data.currentTaskIndex].stepResults && 
                       undefined !== data.result[data.currentTaskIndex].stepResults[data.currentTaskStepIndex]) {
                        var message = data.result[data.currentTaskIndex].stepResults[data.currentTaskStepIndex].message;
                        if (undefined !== message && message !== '' && message !== false) {
                            if (undefined === $scope.discovery.scripts.errors[index]) {
                                $scope.discovery.scripts.errors[index] = {};
                            }
                            if (undefined === $scope.discovery.scripts.errors[index][data.currentTaskIndex]) {
                                $scope.discovery.scripts.errors[index][data.currentTaskIndex] = {};
                            }
                            $scope.discovery.scripts.errors[index][data.currentTaskIndex][data.currentTaskStepIndex] = message;
                        }
                    }
                }
            );
            return false;
        };
        $scope.expandTest = function(index) {
            $scope.expandedTest = index === $scope.expandedTest ? false : index;
        };
        $scope.getTaskErrors = function(testIndex, taskIndex) {
            if (undefined === $scope.discovery.scripts.errors[testIndex]) {
                return {};
            }
            if (undefined === $scope.discovery.scripts.errors[testIndex][taskIndex]) {
                return {};
            }
            return $scope.discovery.scripts.errors[testIndex][taskIndex];
        };
        $scope.getTaskErrorsExist = function(testIndex, taskIndex) {
            var errors = $scope.getTaskErrors(testIndex, taskIndex);
            for (var i in errors) {
                if (errors.hasOwnProperty(i)) {
                    return true;
                }
            }
            return false;
        };
        $scope.getTaskUrl = function(testIndex, taskIndex, stepIndex) {
            return window.location.href.split('?')[0] + '?goto=' + encodeURIComponent(encodeURIComponent($scope.discovery.scripts.urls[testIndex])) + '&task=' + (taskIndex + 1) + '&step=' + (stepIndex + 1);
        };
    }]);
});