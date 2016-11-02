define('testSuiteController', ['app', 'scroll'], function(app){
    'use strict';
    app
    .config(['$compileProvider', function($compileProvider){
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|javascript|data):/);
    }])
    .controller('testSuiteController', ['$scope', 'cfMessage', 'cfDebug', function ($scope, cfMessage, cfDebug){
        var timeouts = {};
        var useJsInsteadOfJson;
        var preventAutorun = false;
        var getJsOrJsonFileType = function() { 
            return 'js' + (useJsInsteadOfJson ? '' : 'on');
        };
        var overrideParams = {};

        var cleanFunctionComment = function(s) {
            return s
                .replace(/^function\s*\(\s*\)\s*\{\s*\/\*[ \t]*[\r\n]*/, '')
                .replace(/\*\/\s*\}\s*$/, '');
        };
        var fetchFunctionComments = function(o) {
            if (o instanceof Array) {
                return o.map(fetchFunctionComments);
            } else if ('object' === typeof o) {
                var r = {};
                for (var i in o) {
                    r[i] = fetchFunctionComments(o[i]);
                }
                return r;
            } else if ('function' === typeof o) {
                return cleanFunctionComment(o.toString());
            } else {
                return o;
            }
        };
        var parseJson = function(s){
            s = s.replace(/^\s*cartfiller\s*=\s*/, '')
                .replace(/\,([ \t\n\r]*(\]|\}))/g, function(match, group1) { 
                    return group1;
                })
                .replace(/\r/g, '')
                .replace(/<\!\[CDATA\[(([^\]]|\][^\]]|\]\][^\>])*)\]\]\>/g, function(m,data) {
                    data = JSON.stringify(data);
                    return data.substr(1,data.length-2);
                });
            if (! s.trim().length) {
                throw new Error('empty file');
            }
            if (useJsInsteadOfJson) {
                return fetchFunctionComments(eval('var json = ' + s + '; json')); // jshint ignore:line
            } else {
                return JSON.parse(s);
            }
        };
        var testsToCheck;
        var currentTest;
        var testDependencies;
        var getIncludedTests = function(index, result) {
            result.push(index);
            if (testDependencies[index]) {
                for (var i in testDependencies[index]) {
                    getIncludedTests(i, result);
                }
            }
            return result;
        };
        var backendPendingRequestCounter;
        var isLaunchedFromLocalFilesystem = function() {
            return document.getElementById('testSuiteManager').getAttribute('data-local-href') ? true : false;
        };
        var getLocation = function() {
            var localHref = document.getElementById('testSuiteManager').getAttribute('data-local-href');
            return localHref ? localHref : cfMessage.hashUrl;
        };
        var updateRunSelectedTestsButton = function(noDigest) {
            timeouts.updateRunSelectedTestsButton = false;
            var buttonPanelScope = angular.element($('#testsuiteButtonPanel')[0]).scope();
            if (undefined === buttonPanelScope) {
                timeouts.updateRunSelectedTestsButton = setTimeout(updateRunSelectedTestsButton, 100);
                return;
            }
            var selectedTestCountScope = angular.element($('#selectedTestCount')[0]).scope();
            if (undefined === selectedTestCountScope) {
                timeouts.updateRunSelectedTestsButton = setTimeout(updateRunSelectedTestsButton, 100);
                return;
            }
            buttonPanelScope.someTestsAreSelected = false;
            selectedTestCountScope.selectedTestCount = 0;
            for (var i in $scope.selectedTests) {
                if ($scope.selectedTests[i]) {
                    buttonPanelScope.someTestsAreSelected = true;
                    selectedTestCountScope.selectedTestCount ++;
                }
            }
            if (! noDigest) {
                buttonPanelScope.$digest();
            }
            selectedTestCountScope.$digest();
        };
        var currentJobId;
        var parseParams = function() {
            angular.forEach(getLocation().replace(/^#*\/*/, '').split('&'), function(v) {
                var pc = v.split('=');
                var name = decodeURIComponent(pc.shift());
                var value = pc.join('=');
                var m;
                if (name === 'editor') {
                    $scope.params.editor = (value === '0' || value === '') ? false : true;
                } else if (0 === name.indexOf('globals[')) {
                    m = /^globals\[([^\]]+)\]$/.exec(name);
                    $scope.params.globals = $scope.params.globals || {};
                    $scope.params.globals[m[1]] = decodeURIComponent(value);
                } else if (0 === name.indexOf('locals[')) {
                    m = /^locals\[([^\]]+)\]$/.exec(name);
                    $scope.params.locals = $scope.params.locals || {};
                    $scope.params.locals[m[1]] = decodeURIComponent(value);
                } else if (name === 'selectedTests') {
                    value.split('.').filter(function(v) {
                       $scope.selectedTests[v] = true;
                    }); 
                } else {
                    $scope.params[name] = decodeURIComponent(value);
                }
            });
            for (var i in overrideParams) {
                $scope.params[i] = overrideParams[i];
            }
            updateRunSelectedTestsButton(true);
            if ($scope.params.editor) {
                $.cartFillerPlugin({'$preventPageReload': true});
            }
        };
        var getNextTestToRunAll = function(index) {
            index = index ? index : 0;
            while (index < $scope.discovery.scripts.enabled.length && ! $scope.discovery.scripts.enabled[index]) {
                $scope.discovery.scripts.success[index] = -2;
                index ++;
            }
            return index;
        };
        $scope.runAll = function (index) {
            $scope.runningAll = true;
            $scope.runningSelected = false;
            index = getNextTestToRunAll(index);
            if ($scope.discovery.scripts.contents.length) {
                $scope.runTest(index);
            }
        };
        var getNextTestToRunSelected = function(index) {
            index = index ? index : 0;
            while (index < $scope.discovery.scripts.enabled.length && ! $scope.selectedTests[index]) {
                $scope.discovery.scripts.success[index] = -2;
                index ++;
            }
            return index;
        };
        $scope.runSelected = function (index) {
            $scope.runningAll = true;
            $scope.runningSelected = true;
            index = getNextTestToRunSelected(index);
            if ($scope.discovery.scripts.contents.length) {
                $scope.runTest(index);
            }
        };
        $scope.preventAutorun = function() {
            preventAutorun = true;
        };
        $scope.stopRunningAll = function() {
            $scope.runningAll = false;
        };
        var deepMapGlobalReferences = function(param, map) {
            if ((param instanceof Array) && (1 === param.length) && (! (param[0] instanceof Array))) {
                // this is reference
                if (undefined === map[param[0]]) {
                    // no mapping, leave unchanged
                    return param;
                } else {
                    return map[param[0]];
                }
            } else if (param instanceof Array) {
                return param.map(function(v) { return deepMapGlobalReferences(v, map); });
            } else {
                return param;
            }
        };
        var convertNewStyleTaskDetailsIntoOldStyleTaskDetails = function(detail) {
            for (var taskName in detail) {
                if (detail.hasOwnProperty(taskName)) {
                    detail[taskName].task = taskName;
                    return detail[taskName];
                }
            }
            throw new Error('invalid object having no properties found in test details');
        };
        var processIncludesRecursive = function(details, myIndex, tweaks, map) {
            var result = [];
            details.filter(function(detail) {
                var i;
                if (detail.include) {
                    var thisMap = angular.copy(map);
                    for (i in detail) {
                        if (i !== 'include') {
                            if (detail[i] instanceof Array) {
                                if (undefined !== map[detail[i][0]]) {
                                    thisMap[i] = map[detail[i][0]];
                                } else {
                                    thisMap[i] = detail[i];
                                }
                            } else {
                                thisMap[i] = detail[i];
                            }
                        }
                    }
                    var includedTestIndex = getTestIndexByName(detail.include, $scope.discovery.scripts.urls[myIndex]);
                    if (! testDependencies[myIndex]) {
                        testDependencies[myIndex] = {};
                    }
                    testDependencies[myIndex][includedTestIndex] = true;
                    var saved = $scope.discovery.currentProcessedTestURL;
                    $scope.discovery.currentProcessedTestURL = $scope.discovery.currentProcessedTestURL = $scope.discovery.scripts.hrefs[includedTestIndex];
                    var tasksToInclude = processIncludes(parseJson($scope.discovery.scripts.rawContents[includedTestIndex]).details, includedTestIndex, tweaks, thisMap);
                    $scope.discovery.currentProcessedTestURL = saved;
                    
                    tasksToInclude.filter(function(task) {  
                        task = angular.copy(task);
                        for (var i in task) {
                            if (task[i] instanceof Array) { // reference to global
                                task[i] = deepMapGlobalReferences(task[i], thisMap);
                            }
                        }
                        result.push(task);
                    });
                } else {
                    if (undefined === detail.task) {
                        if (undefined !== detail.if) {
                            if (undefined !== detail.then) {
                                detail.then = processIncludesRecursive(detail.then, myIndex, tweaks, map);
                            }
                            if (undefined !== detail.else) {
                                detail.else = processIncludesRecursive(detail.else, myIndex, tweaks, map);
                            }
                        } else if ('object' === typeof detail) {
                            detail = convertNewStyleTaskDetailsIntoOldStyleTaskDetails(detail);
                        }
                    }
                    result.push(detail);
                }
            });
            return result;
        };
        var processIncludes = function(details, myIndex, tweaks, map) {
            if (undefined === map) {
                map = {};
            }
            var result = processIncludesRecursive(details, myIndex, tweaks, map);
            return processConditionals(result, tweaks, map);
        };
        var getTestIndexByName = function(name, ref) {
            var currentDir = ref.split('?')[0].split('#')[0].replace(/\/?[^\/]*$/, '/');
            if (currentDir === '/') {
                currentDir = '';
            }
            var pretendents = $scope.discovery.scripts.urls.map(function(url, index) {
                if ('/' === name.substr(0, 1)) {
                    return (('/' + url.replace(/^\//, ''))  === name) ? index : false;
                } else {
                    return (url === currentDir + name) ? index : false;
                }
            }).filter(function(v){return v !== false;});
            if (pretendents.length) {
                return pretendents[0];
            }
            throw new Error('unable to find included test: [' + name + '] inside [' + currentDir + '/]');
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
                    if (result[i].level < 4) {
                        result[i].heading = headingLevelCounters.slice(0, result[i].level).filter(function(v){return v;}).join('.') + '. ' + result[i].heading.replace(/^(\d+\.)+\s*/, '');
                    } else {
                        result[i].heading = result[i].heading.replace(/^(\d+\.)+\s*/, '').replace(/^\s+/, function(m) {
                            return m.replace(/./g, '\xa0');
                        });
                    }
                }
            }
            return result;
        };
        var processConditionals = function(details, globals, map) {
            var resolveValue = function(j) {
                if (undefined === map[j]) {
                    return globals[j];
                } else if (map[j] instanceof Array) {
                    return globals[map[j][0]];
                } else {
                    return map[j];
                }
            };
            var result = [];
            var i, j, match, value;
            for (i = 0; i < details.length; i ++) {
                if ('string' === typeof details[i]) {
                    details[i] = {'heading': details[i]};
                } 
                if ('undefined' === typeof details[i].task) {
                    if ('undefined' !== typeof details[i].heading) {
                        if ('undefined' === typeof details[i].level) {
                            if (details[i].heading.indexOf('# ') === 0){
                                details[i].level = 1;
                            } else if (details[i].heading.indexOf('## ') === 0){
                                details[i].level = 2;
                            } else if (details[i].heading.indexOf('### ') === 0){
                                details[i].level = 3;
                            } else {
                                details[i].level = 4;
                            }
                        }
                        details[i].heading = details[i].heading.replace(/^#+\s*/, '');
                        result.push(details[i]);
                    } else if ('undefined' !== typeof details[i].if) {
                        if ('object' === typeof details[i].if) {
                            match = true;
                            for (j in details[i].if) {
                                value = resolveValue(j);
                                if (String(details[i].if[j]) !== String(value)) {
                                    match = false;
                                }
                            }
                        } else if ('string' === typeof details[i].if) {
                            value = resolveValue(details[i].if);
                            match = 'undefined' !== typeof value && null !== value;
                        }
                        var src = [];
                        if (match && 'undefined' !== typeof details[i].then) {
                            src = processConditionals(details[i].then, globals, map);
                        } else if (! match && 'undefined' !== typeof details[i].else) {
                            src = processConditionals(details[i].else, globals, map);
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
            useJsInsteadOfJson = ! useJsInsteadOfJson;
            $scope.discovery.currentRootFile = $scope.discovery.currentRootPath.replace(/\/$/, '') + '/cartfiller.' + getJsOrJsonFileType() + '?' + (new Date()).getTime();
            $.cartFillerPlugin.ajax({
                url: $scope.discovery.currentRootFile, 
                complete: function(xhr) {
                    var i;
                    if ($scope.discovery.state === 0) {
                        $scope.errorURL = false;
                        if (xhr.status === 200) {
                            try {
                                $scope.discovery.rootCartfillerJson = parseJson(xhr.responseText);
                                if ('object' === typeof $scope.discovery.rootCartfillerJson.globals) {
                                    for (i in $scope.discovery.rootCartfillerJson.globals) {
                                        if ($scope.params.globals && undefined !== $scope.params.globals[i]) {
                                            $scope.discovery.rootCartfillerJson.globals[i] = $scope.params.globals[i];
                                        }
                                    }
                                    for (i in $scope.params.globals) {
                                        $scope.discovery.rootCartfillerJson.globals[i] = $scope.params.globals[i];
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
                            if (! useJsInsteadOfJson) {
                                pc.pop();
                            }
                            $scope.discovery.visitedRootPaths
                                .push($scope.discovery.currentRootFile);
                            if (pc.length < 3) {
                                $scope.discovery.state = -1;
                                $scope.discovery.error = 'neither cartfiller.js nor cartfiller.json was not found, visited: ';
                                $scope.discovery.currentRootFile = false;
                                $scope.discovery.currentRootPath = $scope.initialRootPath;
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
            var saved = $scope.discovery.currentProcessedTestURL;
            $scope.discovery.currentProcessedTestURL = $scope.discovery.scripts.hrefs[index];
            var contents = parseJson($scope.discovery.scripts.rawContents[index]);
            contents.details = processHeadings(processIncludes(contents.details, index, $scope.discovery.scripts.tweaks[index]));
            $scope.discovery.scripts.contents[index] = contents;
            $scope.discovery.currentProcessedTestURL = saved;
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
        var processScriptFilesAfterDownload = function() {
            var i;
            if ($('#testsearch.rendered').is(':visible')) {
                $('#testsearch.rendered')[0].focus();
            }
            testDependencies = {};
            for (i = 0; i < $scope.discovery.scripts.flat.length; i ++) {
                processDownloadedTest(i);
            }
            $scope.discovery.state = 2;
            $scope.$digest();
            if ($scope.params.backend && ! $scope.params.editor) {
                timeouts.processScriptFilesAfterDownloadOne = setTimeout(function(){
                    timeouts.processScriptFilesAfterDownloadOne = false;
                    if ('undefined' !== typeof $scope.params.job && 
                           'undefined' !== typeof $scope.params.task && 
                           'undefined' !== typeof $scope.params.step
                    ) {

                        for (i = 0; i < $scope.discovery.scripts.urls.length; i ++) {
                            if ($scope.discovery.scripts.urls[i] === $scope.params.job) {
                                $scope.selectedTests[i] = true;
                            }
                        }
                        $scope.runSelected();
                    } else {
                        $scope.runAll();
                    }
                }, $scope.params.wait ? ($scope.params.wait * 1000) : 0);
            } else if ($scope.params.goto && ! $scope.alreadyWentTo && ! preventAutorun) {
                $scope.alreadyWentTo = true;
                timeouts.processScriptFilesAfterDownloadTwo = setTimeout(function() {
                    timeouts.processScriptFilesAfterDownloadTwo = false;
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
                       ! $scope.alreadyWentTo && ! preventAutorun) 
            {
                $scope.alreadyWentTo = true;
                for (i = 0; i < $scope.discovery.scripts.urls.length; i ++) {
                    if ($scope.discovery.scripts.urls[i] === $scope.params.job) {
                        $scope.runTest(i, $scope.params.slow ? 'slow' : 'fast', parseInt($scope.params.task) - 1, parseInt($scope.params.step) - 1);
                        return;
                    }
                }
                alert('Job ' + $scope.params.job + ' not found');
            }
        };
        var getIndexInDownloadsInProgress = function(url, allowEmpty) {
            var indexInDownloads = -1;
            $scope.downloadsInProgress.filter(function(v,k){
                if (v.url === url) {
                    indexInDownloads = k;
                }
            });
            if (! allowEmpty && -1 === indexInDownloads) {
                throw new Error('download error');
            }
            return indexInDownloads;
        };
        var setErrorForScriptUrl = function(url, message) {
            $scope.downloadsInProgress[getIndexInDownloadsInProgress(url)].error = message;
        };
        var launchScriptDownload = function(index) {
            var suffix; 
            var url;
            for (suffix = 0; -1 !== getIndexInDownloadsInProgress(url = $scope.discovery.scripts.hrefs[index] =  $scope.discovery.currentRootPath.replace(/\/$/, '') + '/' + $scope.discovery.scripts.flat[index].join('/').replace(/\.js(on)?$/, '') + '.' + getJsOrJsonFileType() + '?' + (new Date()).getTime() + suffix, true) ; suffix ++ ){}
            (function(index, url) {
                $scope.downloadsInProgress.push({url: url});
                $.cartFillerPlugin.ajax({
                    url: url,
                    complete: function(xhr) {
                        $scope.errorURL = false;
                        $scope.downloadsInProgress[getIndexInDownloadsInProgress(url)].completed = true;
                        if (xhr.status === 200) {
                            try {
                                rememberDownloadedTest(xhr.responseText, index);
                            } catch (e) {
                                setErrorForScriptUrl(url, 'Unable to parse test script: ' + String(e));
                            }
                            try {
                                downloadNextScriptFile();
                            } catch (e) {
                                setErrorForScriptUrl(url, 'Unable to parse test script: ' + String(e));
                            }
                        } else {
                            setErrorForScriptUrl(url, 'Error downloading test script');
                        }
                        var indexInDownloads = getIndexInDownloadsInProgress(url);
                        if (! $scope.downloadsInProgress[indexInDownloads].error) {
                            $scope.downloadsInProgress.splice(indexInDownloads, 1);
                            if ($scope.discovery.scripts.currentDownloadingIndex >= $scope.discovery.scripts.flat.length &&
                               $scope.downloadsInProgress.length === 0
                           ) {
                                // we are done
                                try {
                                    processScriptFilesAfterDownload();
                                } catch (e) {
                                    $scope.discovery.state = -1;
                                    $scope.discovery.error = 'Unable to parse test script: ' + $scope.discovery.currentProcessedTestURL + ': ' + String(e);
                                }
                            } 
                        }
                        $scope.$digest();
                    }
                });
            })(index, url);
        };
        var downloadNextScriptFile = function() {
            if ($scope.discovery.scripts.currentDownloadingIndex === false) {
                $scope.discovery.scripts.currentDownloadingIndex = 0;
                $scope.downloadsInProgress = [];
            }
            // let's download next file
            while ($scope.discovery.scripts.currentDownloadingIndex < $scope.discovery.scripts.flat.length && 
                  $scope.downloadsInProgress.filter(function(v){return !v.error && !v.completed;}).length < $scope.maxSimultaneousDownloads
            ) {
                launchScriptDownload($scope.discovery.scripts.currentDownloadingIndex);
                $scope.discovery.scripts.currentDownloadingIndex ++;
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
        $scope.discover = function(reset) {
            if (reset) {
                useJsInsteadOfJson = false;
                $scope.discovery.visitedRootPaths = [];
                $scope.initialRootPath = $scope.params.root ? $scope.params.root : window.location.href.split(/[#?]/)[0].replace(/\/[^\/]*$/, '');
                $scope.discovery.currentRootPath = $scope.initialRootPath;
                if (/^\./.test($scope.discovery.currentRootPath)) {
                    var pc = (window.location.href.split(/[#?]/)[0].replace(/\/[^/]*$/, '/') + $scope.discovery.currentRootPath) . split('//');
                    var protocol = pc.shift();
                    var url = pc.join('//');
                    while (/\/\.?\//.test(url)) {
                        url = url.replace(/\/\.?\//, '/');
                    }
                    while (/\/[^/]*\/\.\.\//.test(url)) {
                        url = url.replace(/\/[^/]*\/\.\.\//, '/');
                    }
                    $scope.discovery.currentRootPath = protocol + '//' + url;
                }
            }
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
        $scope.submitTestUpdate = function(index) {
            var test = $scope.discovery.scripts.contents[index];
            $.cartFillerPlugin({'$cartFillerTestUpdate': test, trackWorker: $scope.params.editor});
        };
        var getVideoFrame = function () {
            if (cfDebug.callPhantom) {
                return cfDebug.callPhantom({getVideoFrame: true});
            } else {
                return '-1';
            }
        };
        $scope.runTest = function(index, how, untilTask, untilStep, $event, isBackendReady) {
            // for case of video record - we need backend to get prepared
            if ($scope.params.backend && ! isBackendReady) {
                // wait for backend to get ready
                backendPendingRequestCounter ++;
                $.ajax({
                    url: $scope.params.backend.replace(/\/+$/, '') + '/ready/' + $scope.params.key,
                    method: 'POST',
                    data: {
                        test: cfDebug.makeFilesystemSafeTestName($scope.discovery.scripts.urls[index]),
                    },
                    complete: function() {
                        backendPendingRequestCounter --;
                        $scope.runTest(index, how, untilTask, untilStep, $event, true);
                    }
                });
                return;
            }
            if (untilTask === -1 || untilTask === '-1') {
                untilTask = untilStep = undefined;
            }
            if ($event) {
                $event.stopPropagation();
            }
            $scope.discovery.scripts.errors[index] = {};
            testsToCheck = getIncludedTests(index, []).map(function(v) { return {test: v, force: false }; });
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
            test.globals._cartFillerInstallationUrl = test.cartFillerInstallationUrl;
            test.globals._rootCartfillerPath = test.rootCartfillerPath;
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
            for (i in $scope.params.locals) {
                test.globals[i] = $scope.params.locals[i];
            }
            test.trackWorker = $scope.params.editor;
            test.jobName = $scope.discovery.scripts.urls[index];
            test.jobTitle = $scope.discovery.scripts.contents[index].title ? $scope.discovery.scripts.contents[index].title : $scope.discovery.scripts.urls[index];
            test.jobId = currentJobId = (new Date()).getTime + '' + Math.floor(Math.random() * 1000000);
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
                    if (data.jobId !== currentJobId) {
                        return;
                    }
                    if (data.switchTestSuite) {
                        overrideParams = data.switchTestSuite;
                        $scope.initialize();
                        $scope.$digest();
                        return;
                    }
                    if ($scope.params.backend && false !== data.currentTaskIndex && false !== data.currentTaskStepIndex) {
                        var videoFrame = getVideoFrame();
                        var json = {
                            test: $scope.discovery.scripts.urls[index],
                            task: data.currentTaskIndex,
                            taskName: $scope.discovery.scripts.contents[index].details[data.currentTaskIndex].task,
                            step: data.currentTaskStepIndex,
                            result: data.result[data.currentTaskIndex].stepResults[data.currentTaskStepIndex].status,
                            videoFrame: videoFrame + 2,
                            nextTask: data.nextTaskIndex,
                            nextStep: data.nextTaskStepIndex,
                            nextVideoFrame: videoFrame + 1,
                            nextSleep: data.nextTaskSleep,
                            globals: data.globals
                        };
                        if (json.result !== 'ok') {
                            json.message = data.result[data.currentTaskIndex].stepResults[data.currentTaskStepIndex].message;
                        }
                        // report progress to backend
                        backendPendingRequestCounter ++;
                        $.ajax({
                            url: $scope.params.backend.replace(/\/+$/, '') + '/progress/' + $scope.params.key,
                            method: 'POST',
                            data: json,
                            complete: function() {
                                backendPendingRequestCounter --;
                            }
                        });
                    }
                    if (data.stopTestsuite) {
                        $scope.runningAll = false;
                    }
                    if (data.completed && undefined === untilTask) {
                        var nextIndex;
                        $scope.discovery.scripts.success[index] = 0 === data.result.filter(function(r){return ! r.complete;}).length ? 1 : -1;
                        if ($scope.runningAll) {
                            if ($scope.runningSelected) {
                                nextIndex = getNextTestToRunSelected(index + 1);
                            } else {
                                nextIndex = getNextTestToRunAll(index + 1);
                            }
                        }
                        if ($scope.runningAll && nextIndex < $scope.discovery.scripts.contents.length) {
                            $scope.runTest(nextIndex);
                        } else if ($scope.runningAll) {
                            $scope.runningAll = false;
                            $.cartFillerPlugin.showChooseJobFrame();
                            if ($scope.params.backend && ! $scope.params.editor) {
                                timeouts.reportFinishToBackend = setTimeout(function reportFinishToBackend(){
                                    timeouts.reportFinishToBackend = false;
                                    if (backendPendingRequestCounter) {
                                        timeouts.reportFinishToBackend = setTimeout(reportFinishToBackend, 100);
                                    } else {
                                        $.ajax({
                                            url: $scope.params.backend.replace(/\/+$/, '') + '/finish/' + $scope.params.key + '?' + (new Date()).getTime(),
                                            complete: function() {
                                                delete $scope.params.backend;
                                                delete $scope.params.key;
                                                try {
                                                    if (window.parent && window.parent.callPhantom && ('function' === typeof window.parent.callPhantom)) {
                                                        console.log('calling Phantom to finish');
                                                        // we expect Phantom to be launched with --web-security=false
                                                        // so we don't care about parent access
                                                        window.parent.callPhantom({finish: true});
                                                    }
                                                } catch (e) {}
                                            }
                                        });
                                    }
                                }, 100);
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
                            $scope.$digest();
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
        $scope.getTaskUrl = function(testIndex, taskIndex, stepIndex, how) {
            var params = {};
            for (var i in $scope.params) {
                if (i === 'globals') {
                    for (var j in $scope.params[i]) {
                        params['globals[' + j + ']'] = $scope.params[i][j];
                    }
                } else {
                    params[i] = $scope.params[i];
                }
            }
            params.job = $scope.discovery.scripts.urls[testIndex];
            params.task = (taskIndex + 1);
            params.step = (stepIndex + 1);
            var pc = [];
            for (i in params) {
                if ('string' === typeof i && i.length) {
                    pc.push(encodeURIComponent(i)+'='+encodeURIComponent(params[i]));
                }
            }
            if (how === 'slow') {
                pc.push('slow=1');
            }
            return window.location.href.split(/[#?]/)[0].replace(/\/src(\/(index.html)?)?$/, '/dist/') + 
                '#' + pc.join('&');
        };
        $scope.searchForTestNoWatch = function() {
            $scope.filterTestsByText = $('#testsearch').val();
            $scope.expandedTest = false;
            angular.element($('#testslist')[0]).scope().$digest();
        };
        $scope.searchForTaskNoWatch = function() {
            var val = $('#tasksearch').val();
            var go = function() {
                timeouts.go = false;
                $scope.filterTasksByText = $('#tasksearch').val();
                $scope.expandedTest = false;
                angular.element($('#testslist')[0]).scope().$digest();
            };
            if (val.length === 1) {
                timeouts.go = setTimeout(go, 2000);
            } else if (val.length === 2) {
                timeouts.go = setTimeout(go, 1000);
            } else {
                go();
            }
        };
        $scope.clearTestFilterNoWatch = function() {
            $scope.filterTestsByText = '';
            $('#testsearch').val('');
            angular.element($('#testslist')[0]).scope().$digest();
        };
        $scope.clearTaskFilterNoWatch = function() {
            $scope.filterTasksByText = '';
            $('#tasksearch').val('');
            angular.element($('#testslist')[0]).scope().$digest();
        };
        var taskMatchesFilter = function(task, taskFilter) {
            return ((
                (task.task && -1 !== task.task.toLowerCase().indexOf(taskFilter)) ||
                ((! task.task) && task.heading && -1 !== task.heading.toLowerCase().indexOf(taskFilter))
                ) ? true : false);
        };
        var testMatchesFilter = function(index, filter) {
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
        $scope.isTestFilteredIn = function(index) { 
            if ((! $scope.filterTestsByText.length) && (! $scope.filterTasksByText.length)) {
                return true;
            }
            var filter = $scope.filterTestsByText.toLowerCase();
            var taskFilter = $scope.filterTasksByText.toLowerCase();
            if (taskFilter.length) {
                if (filter.length && ! testMatchesFilter(index, filter)) {
                    return false;
                }
                if ($scope.discovery.scripts.contents[index] && $scope.discovery.scripts.contents[index].details) {
                    for (var taskIndex = $scope.discovery.scripts.contents[index].details.length - 1 ; taskIndex >= 0; taskIndex --) {
                        if (taskMatchesFilter($scope.discovery.scripts.contents[index].details[taskIndex], taskFilter)) {
                            return true;
                        }
                    }
                    return false;
                }
            } else {
                return ((! filter.length) || testMatchesFilter(index, filter));
            }
        };
        $scope.isTaskFilteredIn = function(testIndex, taskIndex) {
            var taskFilter = $scope.filterTasksByText.toLowerCase();
            if (taskFilter.length) {
                if ($scope.discovery.scripts.contents[testIndex] && $scope.discovery.scripts.contents[testIndex].details) {
                    if ($scope.discovery.scripts.contents[testIndex].details[taskIndex] &&
                        taskMatchesFilter($scope.discovery.scripts.contents[testIndex].details[taskIndex], taskFilter)) {
                        return true;
                    }
                }
            }
        };
        function focusOnSearchField() {
            timeouts.focusOnSearchField = false;
            if ($('#testsearch.rendered').is(':visible')) {
                $('#testsearch.rendered')[0].focus();
            } else {
                timeouts.focusOnSearchField = setTimeout(focusOnSearchField, 100);
            }
        }
        $scope.toggleConfigure = function() {
            $scope.showConfigure = ! $scope.showConfigure;
        };
        $scope.updateParams = function() {
            var selectedTests = [];
            var i;
            for (i in $scope.selectedTests) {
                if ($scope.selectedTests[i]) {
                    selectedTests.push(i);
                }
            }
            var params = {
                editor: $scope.params.editor ? 1 : '',
                root: $scope.params.root,
                selectedTests: selectedTests.join('.')
            };
            if ('object' === typeof $scope.params.globals) {
                for (i in $scope.params.globals) {
                    params['globals[' + i + ']'] = $scope.params.globals[i];
                }
            }
            $.cartFillerPlugin.postMessageToDispatcher('updateHashUrl', {params: params});
        };
        
        var srcUrl;
        $scope.clickSelectedTestsToRun = function(event, clickedOnTd) {
            var $this = $(event.target);
            if (clickedOnTd) {
                $this = $this.closest('td').find('input[type="checkbox"]');
            }
            var index = $this.attr('data-index');
            var value;
            if (clickedOnTd) {
                value = $scope.selectedTests[index] = ! $scope.selectedTests[index];
                $this.prop('checked', $scope.selectedTests[index]);
            } else {
                value = $scope.selectedTests[index] = $this.prop('checked');
            }
            if (event.shiftKey) {
                if (undefined !== $scope.previouslyClickedSelectTestCheckbox) {
                    for (var i = Math.min($scope.previouslyClickedSelectTestCheckbox, index); i <= Math.max($scope.previouslyClickedSelectTestCheckbox, index); i ++ ){
                        $('input[name="select-test-to-run-' + i + '"]').prop('checked', value);
                        $scope.selectedTests[i] = value;
                    }
                }
            } else {
                $scope.previouslyClickedSelectTestCheckbox = index;
            }
            updateRunSelectedTestsButton(true);
            event.stopPropagation();
            $scope.updateParams();
        };
        $scope.selectAllTests = function(event, select) {
            for (var i = 0; i < $scope.discovery.scripts.contents.length; i ++) {
                $scope.selectedTests[i] = select;
                $('input[name="select-test-to-run-' + i + '"]').prop('checked', select);
            }
            updateRunSelectedTestsButton(true);
            $scope.updateParams();
            event.stopPropagation();
            return false;
        };
        $scope.initialize = function() {
            $scope.alreadyWentTo = false;
            for (var i in timeouts) {
                if (timeouts[i]) {
                    clearTimeout(timeouts[i]);
                    timeouts[i] = false;
                }
            }
            useJsInsteadOfJson = false;
            if (! cfMessage.testSuite) {
                return;
            }
            testsToCheck = [];
            currentTest = false;
            testDependencies = {};
            backendPendingRequestCounter = 0;
            $scope.params = {};
            $scope.expandedTest = false;
            $scope.showConfigure = false;
            $scope.selectedTests = {};
            $scope.maxSimultaneousDownloads = isLaunchedFromLocalFilesystem() ? 1 : 10;
            $scope.downloadsInProgress = [];
            parseParams();
            $scope.discovery = {
                state: 0,
                currentRootPath: '',
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
            $scope.filterTasksByText = '';
            $scope.runningAll = false;
            $scope.runningSelected = false;
            focusOnSearchField();
            $scope.templates = {
                cartfiller: 'base64-content-of-cartfiller.js-goes-here',
                test: 'base64-content-of-test.js-goes-here',
                worker: 'base64-content-of-worker.js-goes-here',
            };
            (function(){
                var base64Pattern = /base64-content-of-([^-]+)-goes-here/;
                var getter = function(i) {
                    $.cartFillerPlugin.ajax({
                        url: window.location.href.split('#')[0].replace(/\/[^\/]*$/, '/templates/') + base64Pattern.exec($scope.templates[i])[1],
                        complete: function(xhr) {
                            if (xhr.status === 200) {
                                $scope.templates[i] = $scope.templates[i].replace(base64Pattern, (xhr.responseText));
                                if (angular.element($('#templates')) && angular.element($('#templates')).scope()) {
                                    angular.element($('#templates')).scope().$digest();
                                }
                            }
                        }
                    });
                };
                for (var i in $scope.templates) {
                    if (base64Pattern.test($scope.templates[i])) {
                        getter(i);
                    } else {
                        $scope.templates[i] = atob($scope.templates[i]);
                    }
                }
            })();
            srcUrl = cfDebug.src.replace(/\/+$/, '');
            $scope.bookmarklets = [];
            ['framed', 'popup', 'clean'].filter(function(type) {
                ['script', 'eval', 'iframe'].filter(function(inject) {
                    var options = {
                        name: type + '-' + inject,
                        baseUrl: srcUrl,
                        chooseJob: window.location.href + '#' + getLocation().replace(/^#+/, ''),
                        debug: true,
                        inject: inject,
                        minified: false,
                        type: type,
                        useSource: cfDebug.useSource
                    };
                    options.code = $.cartFillerPlugin.getBookmarkletCode(options);
                    $scope.bookmarklets.push(options);
                });
            });
            $scope.previouslyClickedSelectTestCheckbox = undefined;
            $scope.discover(true);
            if ($scope.params.editor) {
                timeouts.refreshCurrentTest = setTimeout(function refreshCurrentTest(){
                    timeouts.refreshCurrentTest = false;
                    // check whether currently loaded test have changed and we need to replace it
                    if (testsToCheck.length) {
                        $.cartFillerPlugin.ajax({
                            url: $scope.discovery.scripts.hrefs[testsToCheck[0].test] + '?' + (new Date()).getTime(),
                            complete: function(xhr) {
                                if (xhr.status === 200) {
                                    var oldContents = $scope.discovery.scripts.rawContents[testsToCheck[0].test];
                                    if (oldContents !== xhr.responseText || testsToCheck[0].force) {
                                        try {
                                            rememberDownloadedTest(xhr.responseText, testsToCheck[0].test);
                                            if (oldContents !== xhr.responseText) {
                                                testsToCheck = testsToCheck.map(function(v) {
                                                    return {
                                                        test: v.test, 
                                                        force: true
                                                    };
                                                });
                                            }
                                            processDownloadedTest(currentTest);
                                            $scope.submitTestUpdate(currentTest);
                                            $scope.$digest();
                                        } catch (e){
                                            alert('Something went wrong when processing updated test file - looks like JSON is invalid: ' + String(e));
                                            $scope.discovery.scripts.rawContents[testsToCheck[0].test] = xhr.responseText;
                                        }
                                    }
                                }
                                testsToCheck.push({ 
                                    test: testsToCheck.shift().test,
                                    force: false
                                });
                                timeouts.refreshCurrentTest = setTimeout(refreshCurrentTest, 1000 / testsToCheck.length);
                            },
                            cartFillerTrackSomething: true
                        });
                    } else {
                        timeouts.refreshCurrentTest = setTimeout(refreshCurrentTest, 1000);
                    }
                }, 1000);
            }
        };
        $scope.initialize();
    }]);
});
