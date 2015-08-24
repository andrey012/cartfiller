/*
 *  cartFiller - v0.0.1
 *  Tool for automating cart filling process when doing big purchases
 *  https://andrey012.github.com/cartFiller
 *
 *  Made by Andrey Grinenko
 *  Under MIT License
 */
define('app', ['angular', 'angular-route'], function(){
    return angular.module('cartFillerApp', ['ngRoute']);
});
define('bootstrap', ['app', 'controller', 'cfMessageService', 'testSuiteController'], function(){
    return angular.bootstrap(document, ['cartFillerApp']);
});
define('controller', ['app', 'scroll'], function(app){
    'use strict';
    app
    .controller('indexController', ['$scope', 'cfMessage', '$timeout', 'cfDebug', 'cfScroll', function ($scope, cfMessage, $timeout, cfDebug, cfScroll){
        if (cfMessage.testSuite) {
            return;
        }
        var digestButtonPanel = function(){
            angular.element(document.getElementById('buttonPanel')).scope().$digest();
        };
        var digestGlobals = function() {
            angular.element(document.getElementById('globalsDiv')).scope().$digest();
        };
        var digestTask = function(taskIndex){
            var div = document.getElementById('taskDiv_' + taskIndex);
            if (div) {
                angular.element(div).scope().$digest();
            }
        };
        var digestFinishReached = function(){
            angular.element(document.getElementById('finishReached')).scope().$digest();
        };
        var skipHeadings = function() {
            while ($scope.jobDetails[$scope.currentTask] && undefined === $scope.jobDetails[$scope.currentTask].task && undefined !== $scope.jobDetails[$scope.currentTask].heading) {
                $scope.jobTaskProgress[$scope.currentTask].complete = true;
                $scope.currentTask ++;
            }
        };
        $scope.chooseJobState = false;
        $scope.toggleSize = function(){
            cfMessage.send('toggleSize');
        };
        $scope.chooseJob = function(){
            $scope.chooseJobState = !$scope.chooseJobState;
            cfMessage.send($scope.chooseJobState ? 'chooseJob' : 'chooseJobCancel');
        };
        $scope.trackWorker = false;
        $scope.trackWorkerId = 0;
        $scope.jobDetails = [];
        $scope.jobTaskProgress = [];
        $scope.jobTaskDescriptions = {};
        $scope.indexTitles = {};
        $scope.running = false;
        $scope.workerInProgress = false;
        $scope.currentTask = 0;
        $scope.currentStep = 0;
        $timeout(function(){$scope.chooseJob();}, 0);
        $scope.debugEnabled = parseInt(cfDebug.debugEnabled);
        $scope.workersCounter = 1;
        $scope.workersLoaded = 0;
        $scope.workerGlobals = {};
        $scope.workerSrc = false;
        $scope.finishReached = false;
        $scope.runUntilTask = $scope.runUntilStep = false;
        $scope.pausePoints = {};
        $scope.repeatedTaskCounter = [];
        $scope.doingOneStep = true;
        var autorunSpeed;
        var mouseDownTime;
        var isLongClick = function($event){
            var now = $event.timeStamp ? $event.timeStamp : (new Date()).getTime();
            return (now - mouseDownTime) > 1000;
        };
        var run = function(slow) {
            $scope.running = slow ? 'slow' : true;
            digestButtonPanel();
            $scope.doNextStep();
            cfMessage.send('focusMainFrameWindow');
        };
        var scrollCurrentTaskIntoView = function(useTop) {
            cfScroll(jQuery('#jobDetails > div:nth-child(' + ($scope.currentTask + 1) + ')')[0], useTop);
        };
        var autorun = function() {
            if ($scope.workersLoaded >= $scope.workersCounter) {
                $scope.runNoWatch(autorunSpeed === 'slow' ? true : false, null, true);
            } else {
                // wait some more time
                setTimeout(autorun, 1000);
            }
        };
        cfMessage.register(function(cmd, details){
            if (cmd === 'jobDetails'){
                $scope.$apply(function(){
                    if (undefined !== details.$cartFillerTestUpdate && undefined === details.details) {
                        // this is just test update
                        $scope.jobDetails = details.$cartFillerTestUpdate.details;
                        (function() {
                            for (var i in $scope.jobDetails[$scope.currentTask]) {
                                if ($scope.jobDetails[$scope.currentTask].hasOwnProperty(i)) {
                                    cfMessage.send('updateProperty', {index: $scope.currentTask, name: i, value: $scope.jobDetails[$scope.currentTask][i]});
                                }
                            }
                        })();
                    } else {
                        cfMessage.send('makeSmaller');
                        $scope.trackWorker = details.trackWorker;
                        $scope.chooseJobState = false;
                        $scope.jobDetails = details.details;
                        $scope.jobTitleMap = angular.isUndefined(details.titleMap) ? [] : details.titleMap;
                        $scope.jobTaskProgress = [];
                        $scope.jobTaskStepProgress = [];
                        $scope.repeatedTaskCounter = [];
                        $scope.pausePoints = {};
                        $scope.currentTask = 0;
                        $scope.currentStep = 0;
                        scrollCurrentTaskIntoView(true);
                        var workerSrc = '';
                        if (('string' === typeof details.workerSrc) && (details.workerSrc.length > 0)) {
                            $scope.workersCounter = 1;
                            workerSrc = details.workerSrc;
                        } else if (('object' === typeof details.workerSrc) && (details.workerSrc.length)) {
                            $scope.workersCounter = details.workerSrc.length;
                            workerSrc = details.workerSrc;
                        }
                        if (('string' === typeof details.overrideWorkerSrc) && (details.overrideWorkerSrc.length > 0)){
                            $scope.workersCounter = 1;
                            workerSrc = details.overrideWorkerSrc;
                        }
                        if (('object' === typeof details.overrideWorkerSrc) && (details.overrideWorkerSrc.length)){
                            $scope.workersCounter = details.workerSrc.length;
                            workerSrc = details.overrideWorkerSrc;
                        }
                        $scope.workersLoaded = 0;
                        $scope.workerSrc = workerSrc;
                        if (workerSrc){
                            $scope.loadWorker(workerSrc);
                        } else {
                            alert('Worker script not specified in job description');
                        }
                        if (details.autorun) {
                            setTimeout(autorun, details.autorun);
                            autorunSpeed = details.autorunSpeed;
                            if (undefined !== details.autorunUntilTask &&
                               undefined !== details.autorunUntilStep) {
                                $scope.runUntilTask = details.autorunUntilTask;
                                $scope.runUntilStep = details.autorunUntilStep;
                            } else {
                                $scope.runUntilTask = $scope.runUntilStep = false;
                            }
                        }
                        $scope.finishReached = false;
                        $scope.workerGlobals = details.globals;
                    }
                    while ($scope.jobTaskProgress.length < $scope.jobDetails.length) {
                        $scope.jobTaskProgress.push({complete: false, step: 0, stepsInProgress: {}, stepResults: {}});
                    }
                    skipHeadings();
                });
            } else if (cmd === 'workerRegistered'){
                $scope.$apply(function(){
                    $scope.workersLoaded ++;
                    $scope.jobTaskDescriptions = details.jobTaskDescriptions;
                    $scope.updateIndexTitles();
                });
            } else if (cmd === 'workerStepResult'){
                $scope.jobTaskProgress[details.index].stepsInProgress[details.step] = false;
                $scope.jobTaskProgress[details.index].stepResults[details.step] = {status: details.status, message: details.message, response: details.response};
                $scope.jobTaskProgress[details.index].complete = details.nextTaskFlow === 'skipTask' || $scope.updateTaskCompleteMark(details.index);
                var proceed;
                if ('ok' === details.status){
                    $scope.incrementCurrentStep(false, details.nextTaskFlow);
                    proceed = true;
                } else if ('skip' === details.status){
                    $scope.incrementCurrentStep(true, details.nextTaskFlow);
                    proceed = true;
                } else {
                    proceed = false;
                }
                if ($scope.runUntilTask !== false && $scope.runUntilStep !== false && ($scope.runUntilTask < $scope.currentTask || ($scope.runUntilStep <= $scope.currentStep && $scope.runUntilTask === $scope.currentTask))) {
                    $scope.runUntilTask = $scope.runUntilStep = false;
                    proceed = false;
                }
                if ($scope.pausePoints[$scope.currentTask] && $scope.pausePoints[$scope.currentTask][$scope.currentStep]) {
                    proceed = false;
                }
                var wasRunning = $scope.running;
                if ($scope.running || ($scope.doingOneStep && true === details.nop)){
                    if (proceed){
                        setTimeout(function(){
                            $scope.doNextStep();
                        }, (($scope.running === 'slow') && (true !== details.nop)) ? 2000 : 0);
                    } else {
                        $scope.running = $scope.doingOneStep = false;
                    }
                }
                cfMessage.send(
                    'sendStatus', 
                    {
                        result: $scope.jobTaskProgress, 
                        tasks: $scope.jobDetails,
                        currentTaskIndex: details.index, 
                        currentTaskStepIndex: details.step,
                        running: wasRunning,
                        completed: ! proceed
                    });
                $scope.workerInProgress = false;
                if (!proceed){
                    digestTask($scope.currentTask);
                }
                digestButtonPanel();
                if ('object' === typeof details.globals) {
                    for (var i in details.globals) {
                        if (details.globals.hasOwnProperty(i)){
                            $scope.workerGlobals = details.globals;
                            digestGlobals();
                            break;
                        }
                    }
                }
            } else if (cmd === 'chooseJobShown') {
                $scope.chooseJobState = true;
                digestButtonPanel();
            } else if (cmd === 'chooseJobHidden') {
                $scope.chooseJobState = false;
                digestButtonPanel();
            } else if (cmd === 'currentUrl') {
                $('#currentUrl').text(details.url).attr('href', details.url);
            } else if (cmd === 'mousePointer') {
                (function(){
                    var scope = angular.element(document.getElementById('searchResults')).scope();
                    scope.searchVisible = true;
                    scope.stack = details.stack;
                    scope.$digest();
                })();
            } else if (cmd === 'cssSelectorEvaluateResult') {
                $('#searchButton').text('Search (' + details.count + ')');
            }
        });
        $scope.incrementCurrentStep = function(skip, nextTaskFlow){
            $scope.currentStep ++;
            var oldCurrentTask = $scope.currentTask;
            if (skip || nextTaskFlow === 'skipTask' || nextTaskFlow === 'repeatTask' || $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length <= $scope.currentStep){
                $scope.currentStep = 0;
                if (nextTaskFlow === 'repeatTask') {
                    if (undefined === $scope.repeatedTaskCounter[$scope.currentTask]) {
                        $scope.repeatedTaskCounter[$scope.currentTask] = 0;
                    }
                    $scope.repeatedTaskCounter[$scope.currentTask] ++;
                } else {
                    $scope.currentTask ++;
                    $scope.repeatedTaskCounter[$scope.currentTask] = 0;
                }
                skipHeadings();
                if ($scope.currentTask >= $scope.jobDetails.length){
                    $scope.finishReached = true;
                    setTimeout(function(){
                        cfMessage.send(
                            'sendStatus', 
                            {
                                result: $scope.jobTaskProgress, 
                                tasks: $scope.jobDetails,
                                currentTaskIndex: false, 
                                currentTaskStepIndex: false,
                                running: $scope.running,
                                completed: true
                            });
                    },0);
                    digestFinishReached();
                    setTimeout(function(){
                        cfScroll(jQuery('#finishReached')[0]);
                    },0);
                }
                digestTask(oldCurrentTask);
            }
            digestTask($scope.currentTask);
        };
        $scope.getNextStepToDo = function(index){
            var steps = $scope.jobTaskDescriptions[$scope.jobDetails[index].task];
            for (var i = 0; i < steps.length; i++){
                var result = $scope.jobTaskProgress[index].stepResults[i];
                if (angular.isUndefined(result) || ('ok' !== result.status)){
                    return i;
                }
            }
            return false;
        };
        $scope.updateTaskCompleteMark = function(index){
            return (false === $scope.getNextStepToDo(index));
        };
        $scope.selectTask = function(index){
            for (var i = 0; i < index; i ++){
                $scope.jobTaskProgress[i].complete = true;
            }
        };
        $scope.toggleTaskProgress = function(index){
            $scope.jobTaskProgress[index].complete = !$scope.jobTaskProgress[index].complete;
            return false;
        };
        $scope.getPropertyValue = function(value) {
            if ('object' === typeof value) {
                value = JSON.stringify(value, null, 1);
            }
            value = String(value);
            if (value.length > 100) {
                value = value.substr(0, 100) + '...';
            }
            return value;
        };
        $scope.doubleClickTaskInput = function(index, name, value) {
            var val = prompt('Enter new value for [' + name + ']', 'object' === typeof value ? JSON.stringify(value) : value);
            if (null !== val) {
                $scope.jobDetails[index][name] = 'object' === typeof value ? JSON.parse(val) : val;
                cfMessage.send('updateProperty', {index: index, name: name, value: val});
            }
        };
        $scope.doubleClickTaskName = function(name) {
            prompt('This is readonly but you can copy task name here:', name);
        };
        $scope.clickOnStepNoWatch = function(element, $event){
            $scope.doingOneStep = false;
            var s = element.getAttribute('id').split('_');
            var taskIndex = parseInt(s[1]);
            var stepIndex = parseInt(s[2]);
            $scope.runUntilTask = $scope.runUntilStep = false;
            $scope.currentTask = taskIndex;
            $scope.currentStep = stepIndex;
            var debug = isLongClick($event);
            $scope.invokeWorker(taskIndex, stepIndex, debug);
            $event.stopPropagation();
            cfMessage.send('focusMainFrameWindow');
            return false;
        };
        $scope.invokeWorker = function(taskIndex, stepIndex, debug){
            $scope.jobTaskProgress[taskIndex].stepsInProgress[stepIndex] = true;
            var details = $scope.jobDetails[taskIndex];
            var taskName = details.task;
            $scope.workerInProgress = true;
            cfMessage.send('invokeWorker', {index: taskIndex, task: taskName, step: stepIndex, details: details, debug: debug, repeatCounter: $scope.repeatedTaskCounter[taskIndex] || 0});
            digestButtonPanel();
            digestTask($scope.currentTask);
        };
        $scope.getStepClass = function(index, step){
            var size = ((index === $scope.currentTask) && (step === $scope.currentStep)) ?
                '' :
                'btn-xs ';
            if ($scope.jobTaskProgress[index].stepsInProgress[step] === true) {
                return size + 'btn-default';
            } 
            var result = $scope.jobTaskProgress[index].stepResults[step];
            if (!angular.isUndefined(result)) {
                if ('ok' === result.status){
                    return size + 'btn-success';
                } else if ('error' === result.status) {
                    return size + 'btn-danger';
                }
            }
            return size + 'btn-warning';
        };
        $scope.runNoWatch = function(slow, $event, fromAutorun){
            $scope.doingOneStep = false;
            if (! fromAutorun) {
                $scope.runUntilTask = $scope.runUntilStep = false;
            }
            run(slow);
            if ($event) {
                $event.stopPropagation();
            }
            return false;
        };
        $scope.stopNoWatch = function($event){
            $scope.runUntilTask = $scope.runUntilStep = $scope.doingOneStep = false;
            $event.stopPropagation();
            $scope.running = false;
            digestButtonPanel();
            cfMessage.send('focusMainFrameWindow');
            return false;
        };
        $scope.doNextStep = function(){
            if ($scope.currentTask < $scope.jobDetails.length){
                scrollCurrentTaskIntoView();
                $scope.invokeWorker($scope.currentTask, $scope.currentStep);
            } else {
                $scope.running = false;
                digestButtonPanel();
            }
        };
        $scope.resetWorkerNoWatch = function($event){
            cfMessage.send('resetWorker');
            $scope.workerInProgress = false;
            $scope.running = false;
            digestButtonPanel();
            if ($event) {
                $event.stopPropagation();
            }
            return false;
        };
        $scope.clickOnNextStepNoWatch = function($event){
            if (! $scope.workerInProgress) {
                $scope.runUntilTask = $scope.runUntilStep = false;
                $scope.doingOneStep = true;
                $scope.doNextStep();
            }
            $event.stopPropagation();
            cfMessage.send('focusMainFrameWindow');
            digestButtonPanel();
            return false;
        };
        var trackWorkerContents = {};
        var trackWorkerLoaded = {};
        var trackWorkersAllLoaded = function() {
            var i; 
            for (i in trackWorkerLoaded) {
                if (trackWorkerLoaded.hasOwnProperty[i] && ! trackWorkerLoaded[i]) {
                    return false;
                }
            }
            return true;
        };
        var trackWorker = function(trackWorkerId) {
            if ($scope.trackWorkerId !== trackWorkerId) {
                return;
            }
            angular.forEach(trackWorkerContents, function(contents, url) {
                var originalUrl = url;
                trackWorkerLoaded[url] = false;
                if (/\?/.test(url)){
                    url += '&';
                } else {
                    url += '?';
                }
                url += (new Date()).getTime();
                var xhr = new XMLHttpRequest();
                xhr.onload = function(){
                    if ($scope.trackWorkerId !== trackWorkerId) {
                        return;
                    }
                    if (xhr.response !== trackWorkerContents[originalUrl]) {
                        cfMessage.send('loadWorker', {code: xhr.response, src: url});
                        trackWorkerContents[originalUrl] = xhr.response;
                    }
                    if (trackWorkersAllLoaded()) {
                        setTimeout(function() { trackWorker(trackWorkerId); }, 1000);
                    }
                };
                xhr.onerror = function(){
                    setTimeout(function() { trackWorker(trackWorkerId); }, 1000);
                };
                xhr.open('GET', url, true);
                xhr.send();
            });
        };
        $scope.loadWorker = function(url){
            $scope.trackWorkerId ++;
            if (undefined === url) {
                url = $scope.workerSrc;
            }
            var urls;
            if ('string' === typeof url) {
                urls = [url];
            } else {
                urls = url;
            }
            trackWorkerContents = {};
            trackWorkerLoaded = {};
            angular.forEach(urls, function(url) {
                (function(url){
                    trackWorkerLoaded[url] = false;
                    var originalUrl = url;
                    if (/\?/.test(url)){
                        url += '&';
                    } else {
                        url += '?';
                    }
                    url += (new Date()).getTime();
                    var xhr = new XMLHttpRequest();
                    xhr.onload = function(){
                        trackWorkerContents[originalUrl] = xhr.response;
                        cfMessage.send('loadWorker', {code: xhr.response, src: url});
                        if ($scope.trackWorker && trackWorkersAllLoaded()) {
                            setTimeout(function() { trackWorker($scope.trackWorkerId); }, 1000);
                        }
                    };
                    xhr.open('GET', url, true);
                    xhr.send();
                })(url);
            });
        };
        $scope.reloadWorker = function($event){
            $scope.workersLoaded = 0;
            $scope.loadWorker();
            $event.stopPropagation();
        };
        $scope.returnResult = function(){
            cfMessage.send('sendResult', {result: $scope.jobTaskProgress, tasks: $scope.jobDetails});
        };
        $scope.clickOnReturnResult = function($event){
            $scope.chooseJobState = true;
            $scope.returnResult();
            $event.stopPropagation();
        };
        $scope.updateIndexTitles = function(){
            $scope.indexTitles = {};
            var space = String.fromCharCode(0xa0);
            angular.forEach($scope.jobTaskDescriptions, function(details, task){
                var len = String(details.length+1).length;
                $scope.indexTitles[task] = [];
                for (var i = 0; i < details.length; i++){
                    var r = String(i+1);
                    while (r.length < len) {
                        r += space;
                    }
                    $scope.indexTitles[task].push(r);
                }
            });
        };
        $scope.mouseDown = function($event) {
            mouseDownTime = $event.timeStamp || (new Date()).getTime();
        };
        $scope.getWorkerGlobalValue = function(name) {
            var v = $scope.workerGlobals[name];
            return 'object' === typeof v ? JSON.stringify(v) : v;
        };
        $scope.refreshPageNoWatch = function($event) {
            cfMessage.send('refreshPage');
            $event.stopPropagation();
            return false;
        };
        $scope.performSearchNoWatch = function() {
            cfMessage.send('startReportingMousePointer');
        };
        setTimeout(function initSearchScope() {
            var scope = angular.element(document.getElementById('searchResults')).scope();
            if (! scope) {
                setTimeout(initSearchScope,1000);
                return;
            }
            scope.toggle = function(what, where, index){
                if (undefined === index) {
                    where[what] = ! where[what];
                } else {
                    if (undefined === where[what]) {
                        where[what] = {};
                    }
                    where[what][index] = ! where[what][index];
                }
            };
            scope.getCssSelector = function(stack){
                var r = ('(\'' + stack.map(function(el){
                    return '' +
                        (el.selectNodeName ? el.element : '') +
                        (el.selectId ? ('#' + el.id) : '') +
                        (el.classes.filter(function(c,i) {
                            return undefined !== el.selectClass && el.selectClass[i];
                        }).map(function(v){
                            return '.' + v;
                        }).join('')) +
                        (el.attrs.filter(function(a,i) {
                            return undefined !== el.selectAttribute && el.selectAttribute[i];
                        }).map(function(a){
                            return '[' + a.n + '="' + a.v + '"' + ']';
                        }).join('')) +
                        (el.selectIndex ? (':nth-of-type(' + el.index + ')') : '') +
                        (el.selectText ? ('\').filter(function(i,el){return el.textContent.trim() === ' + JSON.stringify(el.text) + ';}).find(\'') : '')
                    ;
                }).join(' ') + '\')').replace(/.find\(\'\s*\'\)$/g, '').replace(/\s+/g, ' ').replace(/\'\s+/g, '\'').replace(/\s+\'/g, '\'');
                cfMessage.send('evaluateCssSelector', {selector: r});
                return r;
            };
            scope.toggleSearch = function() {
                scope.searchVisible = ! scope.searchVisible;
            };
        },1000);
        $scope.togglePause = function(element, event) {
            var s = element.getAttribute('id').split('_');
            var taskIndex = parseInt(s[1]);
            var stepIndex = parseInt(s[2]);
            if (undefined === $scope.pausePoints[taskIndex]) {
                $scope.pausePoints[taskIndex] = {};
            }
            $scope.pausePoints[taskIndex][stepIndex] = $scope.pausePoints[taskIndex][stepIndex] ? 0 : 1;
            digestTask(taskIndex);
            event.stopPropagation();
            return false;
        };
    }]);
});
(function(undefined) {
    var injector;
    var config = {};
    config.gruntBuildTimeStamp='1459891814163';
    window.addEventListener('message', function(event){
        var test = /^cartFillerMessage:(.*)$/.exec(event.data);
        var isDist = true;
        if (test){
            var message = JSON.parse(test[1]);
            if (message.cmd === 'bootstrap') {
                var paths = {
                    'angular': message.lib + '/angular/angular.min',
                    'angular-route': message.lib + '/angular-route/angular-route.min',
                    'jquery': message.lib + '/jquery/dist/jquery.min',
                    'bootstraptw': message.lib + '/bootstrap/dist/js/bootstrap.min',
                };
                var shim = {
                    'angular' : {exports: 'angular', deps: ['jquery', 'bootstraptw']},
                    'angular-route': ['angular'],
                    'bootstraptw': ['jquery']
                };
                var deps = ['bootstrap'];
                if (message.tests || message.testSuite) {
                    paths['jquery-cartFiller'] = message.src + 'jquery-cartFiller';
                    shim['jquery-cartFiller'] = ['jquery'];
                    deps.push('jquery-cartFiller');
                }
                require.config({
                    paths: paths,
                    shim: shim,
                    deps: deps,
                    waitSeconds: 30
                });
                define('cfMessageService', ['app'], function(app){
                    app.service('cfDebug', function(){
                        return {
                            debugEnabled: message.debug
                        };
                    }),
                    app.service('cfMessage', function(){
                        var postMessageListeners = [];
                        return {
                            send: function(cmd, details) {
                                if (undefined === details) {
                                    details = {};
                                }
                                details.cmd = cmd;
                                event.source.postMessage('cartFillerMessage:' + JSON.stringify(details), '*');
                            },
                            receive: function(cmd, details) {
                                angular.forEach(postMessageListeners, function(listener){
                                    listener(cmd, details);
                                });
                            },
                            register: function(cb){
                                postMessageListeners.push(cb);
                            },
                            testSuite: message.testSuite
                        };
                    });
                });
                if (message.tests) {
                    require(['jquery-cartFiller'], function(){
                        var a = $('<a/>');
                        $('body').append(a);
                        a.hide();
                        var settings = {
                            type: 'framed',
                            minified: false,
                            chooseJob: window.location.href + (
    config.gruntBuildTimeStamp ? ((window.location.href.indexOf('?') === -1 ? '?' : '&') + 
    config.gruntBuildTimeStamp) : ''),
                            debug: true,
                            baseUrl: window.location.href.split('?')[0].replace(/\/[^\/]*$/, ''),
                            inject: 'script',
                            traceStartup: false,
                            logLength: false,
                            useSource: ! isDist
                        };
                        a.cartFillerPlugin(settings);
                        a[0].click();
                    });
                } else {
                    require(['bootstrap'], function(app){
                        injector = app;
                    });
                    require(['jquery'], function() {
                        jQuery(message.testSuite ? '#testSuiteManager' : '#workerContainer').show();
                    });
                }
            } else {
                if ('object' === typeof injector){
                    injector.invoke(['cfMessage', function(cfMessage){
                        cfMessage.receive(message.cmd, message);
                    }]);
                }
            }
        }
    }, false);

    if (window.parent && window.parent !== window) {
        window.parent.postMessage('cartFillerMessage:{"cmd":"register"}', '*');
    } else {
        window.postMessage(
            'cartFillerMessage:' + 
            JSON.stringify({
                cmd: 'bootstrap', 
                lib: window.location.href.split('?')[0].replace(/\/[^\/]+\/[^\/]*$/, '/lib/'),
                debug: true,
                tests: true,
                src: window.location.href.split('?')[0].replace(/[^\/]+$/, '')
            }),
            '*'
        );
    }
})();

define('scroll', ['app', 'scroll'], function(app){
    app.service('cfScroll', function(){
        return function(element, useTop){
            var rect = element.getBoundingClientRect();
            var bottom = window.innerHeight;
            var delta = (useTop ? rect.top : rect.bottom) - bottom;
            window.scrollBy(0, delta);
        };
    });
});

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
            while (m = /([\{,]\s*\"(\\\"|[^"\n])*)\n/.exec(s)) {
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
            contents.details = processHeadings(processConditionals(contents.details, $scope.discovery.scripts.tweaks[index]));
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
                            $scope.runTest(index, $scope.params.slow ? 'slow' : 'fast', parseInt($scope.params.task) - 1, parseInt($scope.params.step) - 1);
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
            if (untilTask === -1 || untilTask === '-1') {
                untilTask = untilStep = undefined;
            }
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
            return window.location.href.split('?')[0] + '?goto=' + encodeURIComponent(encodeURIComponent($scope.discovery.scripts.urls[testIndex])) + '&task=' + (taskIndex + 1) + '&step=' + (stepIndex + 1);
        };
    }]);
});
/* jshint ignore:start */
define('jquery-cartFiller', ['jquery'], function() {
/* jshint ignore:end */
/**
 * The jQuery core object
 * @external jQuery
 * @see {@link http://api.jquery.com/jQuery/}
 */

/**
 * The jQuery plugin namespace.
 * @external "jQuery.fn"
 * @name "jQuery.fn"
 * @memberof external jQuery
 * @see {@link http://learn.jquery.com/plugins/|jQuery Plugins}
 */

/** @namespace CartFillerPlugin */

;(function ( $, window, document, undefined ) {

    'use strict';
    /**
     * @constant {string}
     * @default
     */
    var pluginName = 'cartFillerPlugin';

    /**
     * Set to true if plugin receives hello message from
     * {@link CartFiller.Dispatcher}, which means, that page, where this
     * plugin is included is launched as ChooseJob frame from CartFiller
     * @var {boolean} CartFillerPlugin~runningInsideCartFiller
     * @access private
     */
    var runningInsideCartFiller = false;
    
    /**
     * This array is populated with bookmarklet elements, so, that if
     * we receive hello message from {@link CartFiller.Dispatcher}, 
     * we can hide bookmarklets
     * @var {HtmlElement[]} CartFillerPlugin~knownBookmarkletElements
     * @access private
     */
    var knownBookmarkletElements = [];

    /**
     * @class CartFillerPlugin~Settings
     */
    var defaults = {
        /**
         * Choose Job URL
         * @member {string} CartFillerPlugin~Settings#chooseJob
         */
        chooseJob: '',
        /**
         * Base URL to cartFiller files
         * @member {string} CartFillerPlugin~Settings#baseUrl
         */
        baseUrl: '',
        /**
         * Injection method. Either 'script', 'eval' or 'iframe'
         * @member {string} CartFillerPlugin~Settings#inject
         * @default 'eval'
         */
        inject: 'script',
        /**
         * Whether to use minified version or not
         * @member {boolean} CartFillerPlugin~Settings#minified
         * @default true
         */
        minified: true,
        /**
         * Type of UI - either 'framed' or 'popup'
         * @member {string} CartFillerPlugin~Settings#type
         * @default 'framed'
         */
        type: 'framed',
        /**
         * Turn on debug features
         * @member {boolean} CartFillerPlugin~Settings#debug
         * @default false
         */
        debug: false,
        /**
         * Override URL of worker script
         * @member {string} CartFillerPlugin~Settings#worker
         * @default 'Ok'
         */
        worker: '',
        /**
         * Injects an alert for each step into the bookmarklet to troubleshoot
         * @member {boolean} CartFillerPlugin~Settings#traceStartup
         * @default false
         */
        traceStartup: false,
        /**
         * If set to true, then lengths of bookmarklets will be logged to console
         * @member {boolean} CartFillerPlugin~Settings#logLength
         * @default false
         */
        logLength: false,
        /**
         * If set to true, then source files will be loaded instead of 
         * concatenated/minified single file. Used for development
         * @member {boolean} CartFillerPlugin~Settings#useSource
         * @default false
         */
        useSource: false
    };

    /**
     * @class CartFillerPlugin~Plugin
     * @access private
     */
    function Plugin ( element, options ) {
        this.element = element;
        this.settings = $.extend( {}, defaults, options );
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }
    

    $.extend(Plugin.prototype, {
        /**
         * Adds href attribute to an element
         * @function ParseTablePlugin~Plugin#init
         * @access private
         */
        init: function () {
            if (runningInsideCartFiller){
                $(this.element).hide();
            } else {
                var href;
                if (this.settings.inject === 'script'){
                    href = this.scriptBookmarklet();
                } else if (this.settings.inject === 'eval'){
                    href = this.evalBookmarklet();
                } else if (this.settings.inject === 'iframe'){
                    href = this.iframeBookmarklet();
                } else {
                    alert('invalid inject value, correct values are "script", "eval" and "iframe"');
                }
                if (this.settings.logLength) {
                    console.log('generated bookmarklet: ' + href.length);
                }
                $(this.element).attr('href', href);
                knownBookmarkletElements.push(this.element);
            }
        },
        getTypeId: function(){
            if (this.settings.type === 'framed'){
                return 0;
            } else if (this.settings.type === 'popup'){
                return 1;
            } else {
                alert('type not set or invalid, should be either "framed" or "popup"');
                return 0;
            }
        },
        getInjectUrl: function(){
            var script;
            if (this.settings.minified){
                script = 'inject.min.js';
            } else {
                script = 'inject.js';
            }
            return (this.settings.useSource ? '/boot/' : '/') + script;
        },
        getIframeUrl: function(){
            return (this.settings.useSource ? '/boot/' : '/') + 'i.htm';
        },
        trace: function(msg){
            if (this.settings.traceStartup){
                return 'alert(\'' + msg + '\');';
            } else {
                return '';
            }
        },
        scriptBookmarklet: function(){
            return this.javaScriptUrl() + 'try{' +
                this.trace('start') + 
                '(function(d,c,a,t,o,b,e,u,v,j,k,x,y,w,z,s){' + 
                    this.trace('in function') +
                    's=d.createElement(\'script\');' + 
                    this.trace('script element created') +
                    's[a](c+t,o);' +
                    this.trace('type set') +
                    's[a](c+b,e);' + 
                    this.trace('base-url set') +
                    's[a](u,e+v+\'?\'+(new Date()).getTime());' + 
                    this.trace('src set') +
                    's[a](c+j,k);' +
                    this.trace('choose-job set') +
                    'if(x)s[a](c+x,y);' + 
                    this.trace('debug set') +
                    'if(w)s[a](c+w,z);' + 
                    this.trace('worker set') +
                    's.onerror=function(){alert(\'error\');};' +
                    this.trace('onerror set') +
                    'd.getElementsByTagName(\'head\')[0].appendChild(s);' +
                    this.trace('script element added') +
                '})(' +
                    'document,' +
                    '\'data-\',' +
                    '\'setAttribute\',' +
                    '\'type\',' + this.getTypeId() + ',' +
                    '\'base-url\',\'' + this.settings.baseUrl + '\',' +
                    '\'src\',\'' + this.getInjectUrl() + '\',' +
                    '\'choose-job\',\'' + this.settings.chooseJob + '\',' +
                    '\'debug\',' + (this.settings.debug ? 1: 0) + ',' +
                    '\'worker\',\'' + (this.settings.worker) + '\'' +
                ');' +
            '}catch(e){alert(e);}';
        },
        evalBookmarklet: function(){
            return this.javaScriptUrl() + 'try{' +
                this.trace('start') +
                '(function(f,x,t,u,v,j,d){' +
                    this.trace('in function') +
                    'x.open(' +
                        '\'GET\',' +
                        'u+v+\'?\'+(new Date()).getTime(),' +
                        'true' +
                    ');' +
                    this.trace('x opened') +
                    'x.onload=function(){' +
                        'try{' +
                            this.trace('x onload called') +
                            'f=1;' +
                            'eval(' +
                                '\'(function(){\'+' +
                                'x.response+' +
                                '\'}).call({cartFillerEval:[u,t,j,d]});\'' +
                            ');' +
                            this.trace('eval complete') +
                        '}catch(e){alert(e);}' +
                    '};' +
                    this.trace('x onload set') +
                    'setTimeout(function(){if(!f)alert(\'error\');},5000);' +
                    this.trace('onerror set') +
                    'x.send();' +
                    this.trace('x sent') +
                '})(' +
                    '0,' +
                    'new XMLHttpRequest(),' + 
                    this.getTypeId() + ',' +
                    '\'' + this.settings.baseUrl + '\',' +
                    '\'' + this.getInjectUrl() + '\',' +
                    '\'' + this.settings.chooseJob + '\',' +
                    (this.settings.debug ? 1 : 0) +
                ');' +
            '}catch(e){alert(e);}';
        },
        iframeBookmarklet: function(){
            return this.javaScriptUrl() + 'try{' +
                this.trace('start') +
                '(function(f,d,p,t,u,v,m,j,y,x,i){' +
                    this.trace('in') +
                    'window.addEventListener(' +
                        '\'message\',' +
                        'function(e){' +
                            'f=1;' +
                            'try{' +
                                this.trace('event') +
                                'if(p.test(x=e.data)){' +
                                    this.trace('event+') +
                                    'eval(' +
                                        '\'(function(){\'+' +
                                        'x+' +
                                        '\'}).call({cartFillerEval:[u,t,j,y]});\'' +
                                   ');' +
                                    this.trace('eval done') +
                                '}' +
                            '}catch(e){alert(e);}' +
                        '}' +
                        ',true' +
                    ');' +
                    this.trace('lstnr+') +
                    'i=d.createElement(\'iframe\');' +
                    this.trace('iframe') +
                    'd.getElementsByTagName(\'body\')[0].appendChild(i);' +
                    this.trace('iframe+') +
                    'i.contentWindow.location.href=u+v+(m?\'?min&\':\'?\')+(new Date()).getTime();' +
                    this.trace('iframe++') +
                    'setTimeout(function(){if(!f)alert(\'error\');},5000);' +
                    this.trace('timeout set') +
                '})(' +
                    '0,' +
                    'document,' +
                    '/^\'cartFillerEval\'/,' + 
                    this.getTypeId() + ',' +
                    '\'' + this.settings.baseUrl +'\',' +
                    '\'' + this.getIframeUrl() + '\',' + 
                    (this.settings.minified ? 1:0) + ',' +
                    '\'' + this.settings.chooseJob + '\',' +
                    (this.settings.debug ? 1 : 0) +
                ');' +
            '}catch(e){alert(e);}';
        },
        javaScriptUrl: function(){
            var a = 'java';
            var b = 'script';
            return a + b + ':';
        }
    });

    /**
     * Plugin function. Should be used on link elemens
     * <a id="bookmarklet">
     *     Bookmarklet - drag this link to your bookmarks
     * </a>
     * <script>
     *     $("#bookmarklet").cartFillerPlugin({
     *         minified: true,
     *         inject: 'script',
     *         type: 'framed'
     *     });
     * </script>
     * @function external:"jQuery.fn".cartFillerPlugin
     * @global
     * @name "jQuery.fn.cartFillerPlugin"
     * @param {CartFillerPlugin~Settings} options
     * @returns {external:jQuery}
     * @access public
     */
    $.fn[ pluginName ] = function ( options ) {
        return this.each(function() {
            if ( !$.data( this, 'plugin_' + pluginName ) ) {
                    $.data( this, 'plugin_' + pluginName, new Plugin( this, options ) );
            }
        });
    };
    /**
     * Holds result callback registered by user through {@link external:"jQuery".cartFillerPlugin}
     * @var {CartFillerPlugin.resultCallback} CartFillerPlugin~resultCallback
     * @access private
     */
    var resultCallback;
    /**
     * Host intermediate status update callback registered by user through 
     * {@link external:"jQuery".cartFillerPlugin}
     * @var {CartFillerPlugin.statusCallback} CartFillerPlugin~statusCallback
     * @access private
     */
    var statusCallback;
    /**
     * Holds result callback message name, can be configured via jobDetails, 
     * with only reason - not to conflict with other messages. Defaults to 
     * 'cartFillerResultMessage'
     * @var {String} CartFillerPlugin~resultMessageName
     * @access private
     */
    var resultMessageName;
    /**
     * Holds status callback message name, can be configured via jobDetails, 
     * with only reason - not to conflict with other messages. Defaults to 
     * 'cartFillerStatusMessage'
     * @var {String} CartFillerPlugin~statusMessageName
     * @access private
     */
    var statusMessageName;
    /**
     * Message to be used as "hello" message from {@link CartFiller.Dispatcher}
     * to plugin
     * @var {String} CartFillerPlugin~helloMessageName
     * @access private
     */
    var helloMessageName = 'helloFromCartFiller';
    /**
     * Callback, that will receive job result details from cartFiller
     * @callback CartFillerPlugin.resultCallback
     * @param {Object} message message.result contains result, while
     * message.tasks contains job details as provided by Choose Job frame.
     * See {@link CartFiller.Dispatcher#onMessage_sendResult}
     */
    /**
     * Callback, that will receive intermediate job status update from cartFiller
     * @callback CartFillerPlugin.statusCallback
     * @param {Object} message message.result contains result, while
     * message.tasks contains job details as provided by Choose Job frame, 
     * message.currentTaskIndex and message.currentTaskStepIndex identify
     * task and step which triggered status update, and message.
     * See {@link CartFiller.Dispatcher#onMessage_sendResult}
     */
    var messageEventListener = function(event){
        if ((new RegExp('^' + helloMessageName + ':{')).test(event.data)){
            $('.cart-filler-submit').show();
            $('.cart-filler-helper').hide();
            $(knownBookmarkletElements).hide();
            runningInsideCartFiller = true;
        } else {
            var data = new RegExp('^' + resultMessageName + ':(.*)$').exec(event.data);
            if (data) {
                if (resultCallback){
                    resultCallback(JSON.parse(data[1]));
                }
            }
            data = new RegExp('^' + statusMessageName + ':(.*)$').exec(event.data);
            if (data) {
                if (statusCallback){
                    statusCallback(JSON.parse(data[1]));
                }
            }
        }
    };
    /** 
     * Used to configure job by chooseJob frame, contains set of pre-defined
     * properties as well as arbitrary properties set by chooseJob which will be 
     * delivered to worker.
     * @class CartFillerPlugin~JobDetails
     */
    /**
     * @member {string} CartFillerPlugin~JobDetails#cmd Reserved property used for transport,
     * should not be used
     */
    /** 
     * @member {Object[]} CartFillerPlugin~JobDetails#details Array of tasks, each task is 
     * object with mandatory task property which specifies the task alias, and any 
     * set of other properties which will be transferred to worker. 
     */
    /** 
     * @member {integer} CartFillerPlugin~JobDetails#timeout Time (ms) to wait 
     * for result of each step. If api.result() or api.nop() is not called 
     * within specified timeout - then api.result() will be called by 
     * cartfiller itself, with error message saying that timeout occured. 
     * 0 or undefined means no timeout will be ever triggered
     */
    /**
     *  @member {Object} CartFillerPlugin~JobDetails#titleMap Map of human readable titles 
     * of tasks. Property name = task alias, value = title. 
     */
    /**
     * @member {integer} CartFillerPlugin~JobDetails#autorun Time (ms) after which 
     * worker will run automatically. If set to null, undefined or 0 -- no autorun will
     * be done
     */
    /**
     * @member {string} CartFillerPlugin~JobDetails#autorunSpeed Autorun speed, can be
     * 'fast' or 'slow'. Undefined (default) equals to 'fast'
     */
    /**
     * @member {integer} CartFillerPlugin~JobDetails#autorunUntilTask Task index to run until,
     * used together with autorunUntilStep
     */
    /**
     * @member {integer} CartFillerPlugin~JobDetails#autorunUntilStep Step index to run until,
     * used together with autorunUntilTask
     */
    /**
     * @member {string} CartFillerPlugin~JobDetails#workerSrc URL of worker to 
     * be used instead of one given by bookmarklet
     */
    /**
     * @member {Object} CartFillerPlugin~JobDetails#globals optional global values which will be
     * copied into the worker globals object during task load
     */
    /**
     * @member {Object} CartFillerPlugin~JobDetails#trackWorker optional parameter, when set to true
     * then cartFiller will ping workers each second and when workers are changed - they will be updated
     */
    /**
     * Global plugin function - sends job details to cartFiller and
     * registers optional callback, that will receive results.
     * @function external:"jQuery".cartFillerPlugin
     * @global
     * @name "jQuery.cartFillerPlugin"
     * @param {CartFillerPlugin~JobDetails} jobDetails Job details data
     * @param {CartFillerPlugin.resultCallback} resultCallback
     * callback, which will receive results. It can be called several times
     * @param {CartFillerPlugin.statusCallback} resultCallback
     * callback, which will receive status updates after each step of each task will
     * be completed.
     * @access public
     */
    $.cartFillerPlugin = function( jobDetails, newResultCallback, newStatusCallback) {
        if (undefined !== jobDetails.details) {
            if (newResultCallback && 
                ((undefined === jobDetails.resultMessage) || (String(jobDetails.resultMessage).length < 1))
                ){
                jobDetails.resultMessage = 'cartFillerResultMessage';
            }
            if (newStatusCallback &&
                ((undefined === jobDetails.statusMessage) || (String(jobDetails.statusMessage).length < 1)) 
                ){
                jobDetails.statusMessage = 'cartFillerStatusMessage';
            }
            resultMessageName = jobDetails.resultMessage;
            statusMessageName = jobDetails.statusMessage;
            resultCallback = newResultCallback;
            statusCallback = newStatusCallback;
        }

        jobDetails.cmd = 'jobDetails';

        window.parent.postMessage(
            'cartFillerMessage:' + 
            JSON.stringify(jobDetails),
            '*'
        );
    };
    /**
     * Global plugin function - shows chooseJob frame from within
     * chooseJob frame
     * @function external:"jQuery".cartFillerPlugin.showChooseJobFrame
     * @global
     * @name "jQuery.cartFillerPlugin.showChooseJobFrame"
     * @access public
     */
    $.cartFillerPlugin.showChooseJobFrame = function() {
        window.parent.postMessage(
            'cartFillerMessage:' + JSON.stringify({cmd: 'chooseJob'}),
            '*'
        );
    };
    /**
     * Global plugin function - hides chooseJob frame from within
     * chooseJob frame
     * @function external:"jQuery".cartFillerPlugin.hideChooseJobFrame
     * @global
     * @name "jQuery.cartFillerPlugin.hideChooseJobFrame"
     * @access public
     */
    $.cartFillerPlugin.hideChooseJobFrame = function() {
        window.parent.postMessage(
            'cartFillerMessage:' + JSON.stringify({cmd: 'chooseJobCancel'}),
            '*'
        );
    };

    window.addEventListener('message', messageEventListener,false);
    if (window.parent !== window){
        window.parent.postMessage('cartFillerMessage:{"cmd":"helloFromPlugin","message":"' + helloMessageName + '"}', '*');
    }
    $(document).ready(function(){
        if (!runningInsideCartFiller){
            $('.cart-filler-submit').hide();
            $('.cart-filler-helper').show();
        } else {
            $('.cart-filler-submit').show();
            $('.cart-filler-helper').hide();
            $(knownBookmarkletElements).hide();
        }
    });

})( jQuery, window, document );

/* jshint ignore:start */
});
/* jshint ignore:end */