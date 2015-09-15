define('testSuiteController', ['app', 'scroll'], function(app){
    'use strict';
    app
    .config(['$compileProvider', function($compileProvider){
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|javascript):/);
    }])
    .controller('testSuiteController', ['$scope', 'cfMessage', '$timeout', 'cfDebug', '$location', function ($scope, cfMessage, $timeout, cfDebug, $location){
        $location;
        cfDebug;
        $timeout;

        if (! cfMessage.testSuite) {
            return;
        }
        var parseJson = function(s){
            s = s.replace(/^\s*cartfiller\s*=\s*/, '').replace(/\,[ \t\n\r]*\]/g, ']').replace(/\,[ \t\n\r]*\}/g, '}').replace(/\t/g, '\\t').replace(/\r/g, '');
            var m;
            while (m = /([\{,]\s*\"(\\\"|[^"\n])*)\n/.exec(s)) {
                s = s.replace(m[0], m[1] + '\\n');
            }
            return JSON.parse(s);
        };
        var testsToCheck = [];
        var currentTest = false;
        $scope.params = {};
        $scope.expandedTest = false;
        $scope.showConfigure = false;
        var getLocation = function() {
            var localHref = document.getElementById('testSuiteManager').getAttribute('data-local-href');
            return localHref ? localHref : cfMessage.hashUrl;
        };
        var parseParams = function() {
            angular.forEach(getLocation().replace(/^#*\/*/, '').split('&'), function(v) {
                var pc = v.split('=');
                var name = decodeURIComponent(pc.shift());
                var value = pc.join('=');
                if (name === 'editor') {
                    $scope.params.editor = (value === '0' || value === '') ? false : true;
                } else if (0 === name.indexOf('globals[')) {
                    var m = /^globals\[([^\]]+)\]$/.exec(name);
                    $scope.params.globals = $scope.params.globals || {};
                    $scope.params.globals[m[1]] = decodeURIComponent(value);
                } else {
                    $scope.params[name] = decodeURIComponent(value);
                }
            });
            if ($scope.params.editor) {
                $.cartFillerPlugin({'$preventPageReload': true});
            }
        };
        parseParams();
        $scope.discovery = {
            state: 0,
            currentRootPath: $scope.params.root ? $scope.params.root : window.location.href.split(/[#?]/)[0].replace(/\/[^\/]*/, '/'),
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
        $scope.filterTestsByText = '';
        $scope.runningAll = false;
        $scope.runAll = function (index) {
            $scope.runningAll = true;
            index = index ? index : 0;
            while (index < $scope.discovery.scripts.enabled.length && ! $scope.discovery.scripts.enabled[index]) {
                $scope.discovery.scripts.success[index] = -2;
                index ++;
            }
            if ($scope.discovery.scripts.contents.length) {
                $scope.runTest(index);
            }
        };
        $scope.stopRunningAll = function() {
            $scope.runningAll = false;
        };
        var deepMapGlobalReferences = function(param, map) {
            if (param instanceof Array) {
                return param.map(function(v) { return deepMapGlobalReferences(v, map); });
            } else {
                if (undefined === map[param]) {
                    return param;
                } else {
                    return map[param];
                }
            }
        };
        var processIncludes = function(details, myIndex) {
            var result = [];
            details.filter(function(detail, i) {
                if (detail.include) {
                    var includedTestIndex = getTestIndexByName(detail.include, $scope.discovery.scripts.urls[myIndex]);
                    if (! $scope.discovery.scripts.contents[includedTestIndex]) {
                        processDownloadedTest(includedTestIndex);
                    }
                    // ok, another test is already loaded 
                    var tasksToInclude = processIncludes($scope.discovery.scripts.contents[includedTestIndex].details);
                    tasksToInclude.filter(function(task) {  
                        task = angular.copy(task);
                        for (var i in task) {
                            if (task[i] instanceof Array) { // reference to global
                                task[i] = deepMapGlobalReferences(task[i], detail);
                            }
                        }
                        result.push(task);
                    });
                } else {
                    result.push(details[i]);
                }
            });
            return result;
        };
        var getTestIndexByName = function(name, ref) {
            var currentDir = ref.replace(/\/?[^\/]*$/, '/');
            if (currentDir === '/') {
                currentDir = '';
            }
            var pretendents = $scope.discovery.scripts.urls.map(function(url, index) {
                if (url === currentDir + name) {
                    return index;
                } else {
                    return false;
                }
            }).filter(function(v){return v !== false;});
            if (pretendents.length) {
                return pretendents[0];
            }
            throw new Error('unable to find included test: [' + name + ']');
        };
        var processHeadings = function(result) {
            var headingLevelCounters = [];
            var i, j;
            for (i = 0; i < result.length; i++) {
                headingLevelCounters[result[i].level - 1] = 0;
            }
            for (i = 0; i < result.length; i++) {
                if ('undefined' === typeof result[i].task && result[i].heading) {
                    headingLevelCounters[result[i].level - 1] ++;
                    for (j = 0; j < headingLevelCounters.length; j++) {
                        if (j < result[i].level - 1) {
                            if (headingLevelCounters[j] === 0) {
                                headingLevelCounters[j] = 1;
                            }
                        } else if (j > result[i].level - 1) {
                            if (undefined !== headingLevelCounters[j]) {
                                headingLevelCounters[j] = 0;
                            }
                        }
                    }
                    result[i].heading = headingLevelCounters.slice(0, result[i].level).filter(function(v){return v;}).join('.') + '. ' + result[i].heading;
                }
            }
            return result;
        };
        var processConditionals = function(details, globals) {
            var result = [];
            var i, j, match;
            for (i = 0; i < details.length; i ++) {
                if ('string' === typeof details[i]) {
                    details[i] = {'heading': details[i]};
                } 
                if ('undefined' === typeof details[i].task) {
                    if ('undefined' !== typeof details[i].heading) {
                        if ('undefined' === typeof details[i].level) {
                            if (details[i].heading.indexOf('## ') === 0){
                                details[i].level = 2;
                            } else if (details[i].heading.indexOf('### ') === 0){
                                details[i].level = 3;
                            } else {
                                details[i].level = 1;
                            }
                        }
                        details[i].heading = details[i].heading.replace(/^#+\s*/, '');
                        result.push(details[i]);
                    } else if ('undefined' !== typeof details[i].if) {
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
                    } else if ('undefined' !== typeof details[i].include) {
                        result.push(details[i]); 
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
                                    tweaks[s[0]] = decodeURIComponent(s[1].split('"').join('%22'));
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
            $scope.discovery.currentRootFile = $scope.discovery.currentRootPath.replace(/\/$/, '') + '/cartfiller.json?' + (new Date()).getTime();
            $.cartFillerPlugin.ajax({
                url: $scope.discovery.currentRootFile, 
                complete: function(xhr) {
                    if ($scope.discovery.state === 0) {
                        $scope.errorURL = false;
                        if (xhr.status === 200) {
                            try {
                                $scope.discovery.rootCartfillerJson = parseJson(xhr.responseText);
                                if ('object' === typeof $scope.discovery.rootCartfillerJson.globals) {
                                    for (var i in $scope.discovery.rootCartfillerJson.globals) {
                                        if ($scope.params.globals && undefined !== $scope.params.globals[i]) {
                                            $scope.discovery.rootCartfillerJson.globals[i] = $scope.params.globals[i];
                                        }
                                    }
                                }
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
                                testsToCheck = [];
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
                                $scope.discovery.currentRootPath = $scope.params.root ? $scope.params.root : getLocation().split('?')[0].replace(/\/[^\/]*/, '/');
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
        var rememberDownloadedTest = function(response, index) {
            $scope.discovery.scripts.rawContents[index] = response;
        };
        var processDownloadedTest = function(index) {
            var contents = parseJson($scope.discovery.scripts.rawContents[index]);
            contents.details = processIncludes(processHeadings(processConditionals(contents.details, $scope.discovery.scripts.tweaks[index])), index);
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
            var i;
            if ($scope.discovery.scripts.currentDownloadingIndex === false) {
                $scope.discovery.scripts.currentDownloadingIndex = 0;
            } else {
                $scope.discovery.scripts.currentDownloadingIndex++;
            }
            if ($scope.discovery.scripts.currentDownloadingIndex >= $scope.discovery.scripts.flat.length) {
                // we are done
                for (i = 0; i < $scope.discovery.scripts.flat.length; i ++) {
                    processDownloadedTest(i);
                }
                $scope.discovery.state = 2;
                $scope.$digest();
                if ($scope.params.backend && ! $scope.params.editor) {
                    setTimeout(function(){
                        $scope.runAll();
                    });
                } else if ($scope.params.goto && ! $scope.alreadyWentTo) {
                    $scope.alreadyWentTo = true;
                    setTimeout(function() {
                        var index = $scope.getTestIndexByUrl($scope.params.goto);
                        if (undefined === index) {
                            alert('test not found: ' + $scope.params.goto);
                        } else {
                            $scope.runTest(index, $scope.params.slow ? 'slow' : 'fast', parseInt($scope.params.task) - 1, parseInt($scope.params.step) - 1);
                        }
                    });
                } else if ('undefined' !== typeof $scope.params.job && 
                           'undefined' !== typeof $scope.params.task && 
                           'undefined' !== typeof $scope.params.step && 
                           ! $scope.alreadyWentTo) 
                {
                    $scope.alreadyWentTo = true;
                    for (i = 0; i < $scope.discovery.scripts.urls.length; i ++) {
                        if ($scope.discovery.scripts.urls[i] === $scope.params.job) {
                            $scope.runTest(i, 'fast', parseInt($scope.params.task) - 1, parseInt($scope.params.step) - 1);
                            return;
                        }
                    }
                    alert('Job ' + $scope.params.job + ' not found');
                }
            } else {
                // let's download next file
                $.cartFillerPlugin.ajax({
                    url: $scope.discovery.currentDownloadedTestURL = $scope.discovery.scripts.hrefs[$scope.discovery.scripts.currentDownloadingIndex] =  $scope.discovery.currentRootPath.replace(/\/$/, '') + '/' + $scope.discovery.scripts.flat[$scope.discovery.scripts.currentDownloadingIndex].join('/').replace(/\.json$/, '') + '.json?' + (new Date()).getTime(),
                    complete: function(xhr) {
                        $scope.errorURL = false;
                        if (xhr.status === 200) {
                            try {
                                rememberDownloadedTest(xhr.responseText, $scope.discovery.scripts.currentDownloadingIndex);
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
                if (testsToCheck.length) {
                    $.cartFillerPlugin.ajax({
                        url: $scope.discovery.scripts.hrefs[testsToCheck[0]] + '?' + (new Date()).getTime(),
                        complete: function(xhr) {
                            if (xhr.status === 200) {
                                var oldContents = $scope.discovery.scripts.rawContents[testsToCheck[0]];
                                if (oldContents !== xhr.responseText) {
                                    try {
                                        rememberDownloadedTest(xhr.responseText, testsToCheck[0]);
                                        processDownloadedTest(testsToCheck[0]);
                                        $scope.submitTestUpdate(currentTest);
                                        $scope.$digest();
                                    } catch (e){
                                        alert('Something went wrong when processing updated test file - looks like JSON is invalid: ' + String(e));
                                        $scope.discovery.scripts.rawContents[testsToCheck[0]] = xhr.responseText;
                                    }
                                }
                            }
                            testsToCheck.push(testsToCheck.shift());
                            setTimeout(refreshCurrentTest, 1000 / testsToCheck.length);
                        },
                        cartFillerTrackSomething: true
                    });
                } else {
                    setTimeout(refreshCurrentTest, 1000);
                }
            }, 1000);
        }
        $scope.submitTestUpdate = function(index) {
            var test = $scope.discovery.scripts.contents[index];
            $.cartFillerPlugin({'$cartFillerTestUpdate': test, trackWorker: $scope.params.editor});
        };
        $scope.runTest = function(index, how, untilTask, untilStep, $event) {
            if (untilTask === -1 || untilTask === '-1') {
                untilTask = untilStep = undefined;
            }
            if ($event) {
                $event.stopPropagation();
            }
            $scope.discovery.scripts.errors[index] = {};
            testsToCheck = [index];
            currentTest = index;
            var test = $scope.discovery.scripts.contents[index];
            test.workerSrc = $scope.discovery.workerSrc;
            test.autorun = how === 'load' ? 0 : 1;
            test.autorunSpeed = how === 'slow' ? 'slow' : 'fast';
            test.rootCartfillerPath = $scope.params.cartFillerRootPath ? $scope.params.cartFillerRootPath : $scope.discovery.currentRootPath;
            test.cartFillerInstallationUrl = $scope.params.cartFillerInstallationUrl ? $scope.params.cartFillerInstallationUrl : window.location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/, '');
            if ('undefined' === typeof test.globals) {
                test.globals = {};
            }
            var i;
            if ('object' === typeof $scope.discovery.rootCartfillerJson.globals) {
                for (i in $scope.discovery.rootCartfillerJson.globals) {
                    test.globals[i] = $scope.discovery.rootCartfillerJson.globals[i];
                }
            }
            if ('object' === typeof $scope.discovery.scripts.tweaks[index]) {
                for (i in $scope.discovery.scripts.tweaks[index]) {
                    test.globals[i] = $scope.discovery.scripts.tweaks[index][i];
                }
            }
            test.trackWorker = $scope.params.editor;
            test.jobName = $scope.discovery.scripts.urls[index];
            test.jobTitle = $scope.discovery.scripts.contents[index].title ? $scope.discovery.scripts.contents[index].title : $scope.discovery.scripts.urls[index];
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
                        var json = {
                            test: $scope.discovery.scripts.urls[index],
                            task: data.currentTaskIndex,
                            taskName: $scope.discovery.scripts.contents[index].details[data.currentTaskIndex].task,
                            step: data.currentTaskStepIndex,
                            result: data.result[data.currentTaskIndex].stepResults[data.currentTaskStepIndex].status
                        };
                        if (json.result !== 'ok') {
                            json.message = data.result[data.currentTaskIndex].stepResults[data.currentTaskStepIndex].message;
                        }
                        // report progress to backend
                        $.ajax({
                            url: $scope.params.backend.replace(/\/+$/, '') + '/progress/' + $scope.params.key,
                            method: 'POST',
                            data: json
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
            var params = {};
            for (var i in $scope.params) {
                params[i] = $scope.params[i];
            }
            params.job = $scope.discovery.scripts.urls[testIndex];
            params.task = (taskIndex + 1);
            params.step = (stepIndex + 1);
            var pc = [];
            for (i in params) {
                pc.push(i+'='+encodeURIComponent(params[i]));
            }
            return window.location.href.split(/[#?]/)[0] + 
                '#' + pc.join('&');
        };
        $scope.searchForTestNoWatch = function() {
            $scope.filterTestsByText = $('#testsearch').val();
            angular.element($('#testslist')[0]).scope().$digest();
        };
        $scope.isTestFilteredIn = function(index) { 
            if (! $scope.filterTestsByText.length) {
                return true;
            }
            var filter = $scope.filterTestsByText.toLowerCase();
            if (-1 !== $scope.discovery.scripts.flat[index].join('/').toLowerCase().indexOf(filter)) {
                return true;
            }
            if ($scope.discovery.scripts.contents[index] && $scope.discovery.scripts.contents[index].title && -1 !== $scope.discovery.scripts.contents[index].title.toLowerCase().indexOf(filter)) {
                return true;
            }
            if ($scope.discovery.scripts.tweaks[index]) {
                for (var i in $scope.discovery.scripts.tweaks[index]) {
                    if (-1 !== i.toLowerCase().indexOf(filter)) {
                        return true;
                    }
                    if (-1 !== String($scope.discovery.scripts.tweaks[index][i]).toLowerCase().indexOf(filter)) {
                        return true;
                    }
                }
            }
        };
        function focusOnSearchField() {
            if ($('#testsearch').is(':visible')) {
                $('#testsearch')[0].focus();
            } else {
                setTimeout(focusOnSearchField, 100);
            }
        }
        focusOnSearchField();
        $scope.toggleConfigure = function() {
            $scope.showConfigure = ! $scope.showConfigure;
        };
        $scope.updateParams = function() {
            var params = {
                editor: $scope.params.editor ? 1 : '',
                root: $scope.params.root
            };
            if ('object' === typeof $scope.params.globals) {
                for (var i in $scope.params.globals) {
                    params['globals[' + i + ']'] = $scope.params.globals[i];
                }
            }
            $.cartFillerPlugin.postMessageToDispatcher('updateHashUrl', {params: params});
        };
        $scope.bookmarklets = [
            {
                name: 'framed',
                baseUrl: cfDebug.src,
                chooseJob: '', 
                debug: true,
                inject: 'script',
                minified: false,
                type: 'framed',
                useSource: cfDebug.useSource
            }
        ].map(function(options) {
            options.code = $.cartFillerPlugin.getBookmarkletCode(options);
            return options;
        });

    }]);
});
