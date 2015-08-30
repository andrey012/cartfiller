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
        $scope.toggleSizeNoWatch = function($event){
            $event.stopPropagation();
            cfMessage.send('toggleSize');
            return false;
        };
        $scope.scrollToCurrentStepNoWatch = function($event) {
            $event.stopPropagation();
            scrollCurrentTaskIntoView(false, true);
            return false;
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
        $scope.jobTaskDiscoveredParameters = {};
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
        $scope.clickedWhileWorkerWasInProgress = false;
        $scope.noResultButton = false;
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
        var scrollCurrentTaskIntoView = function(useTop, force) {
            cfScroll(jQuery('#jobDetails > div:nth-child(' + ($scope.currentTask + 1) + ')')[0], useTop, force);
        };
        var autorun = function() {
            if ($scope.workersLoaded >= $scope.workersCounter) {
                if (! $scope.pausePoints[$scope.currentTask] || ! $scope.pausePoints[$scope.currentTask][$scope.currentStep]) {
                    $scope.runNoWatch(autorunSpeed === 'slow' ? true : false, null, true);
                }
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
                        cfScroll();
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
                        $scope.noResultButton = ! details.resultMessage;
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
                                if (undefined === $scope.pausePoints[details.autorunUntilTask]) {
                                   $scope.pausePoints[details.autorunUntilTask] = {};
                                }
                                $scope.pausePoints[details.autorunUntilTask][details.autorunUntilStep] = 1;
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
                    $scope.jobTaskDiscoveredParameters = details.discoveredParameters;
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
                if (proceed && $scope.clickedWhileWorkerWasInProgress) {
                    if ($scope.clickedWhileWorkerWasInProgress === 'fast' || $scope.clickedWhileWorkerWasInProgress === 'slow') {
                        $scope.running = $scope.clickedWhileWorkerWasInProgress;
                        $scope.doingOneStep = false;
                    } else if ($scope.clickedWhileWorkerWasInProgress === 'step') {
                        $scope.running = false;
                        $scope.doingOneStep = true;
                    }
                }
                if ($scope.running || ($scope.doingOneStep && ($scope.clickedWhileWorkerWasInProgress === 'step' || true === details.nop))){
                    if (proceed){
                        setTimeout(function(){
                            $scope.doNextStep();
                        }, (($scope.running === 'slow') && (true !== details.nop)) ? 2000 : 0);
                    } else {
                        $scope.running = $scope.doingOneStep = false;
                    }
                }
                $scope.clickedWhileWorkerWasInProgress = false;
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
            if (nextTaskFlow !== 'repeatStep') {
                $scope.currentStep ++;
            }
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
            $event.stopPropagation();
            if ($scope.workerInProgress) {
                return false;
            }
            $scope.doingOneStep = false;
            var s = element.getAttribute('id').split('_');
            var taskIndex = parseInt(s[1]);
            var stepIndex = parseInt(s[2]);
            $scope.runUntilTask = $scope.runUntilStep = false;
            var oldCurrentTask = $scope.currentTask;
            digestTask(taskIndex);
            $scope.currentTask = taskIndex;
            $scope.currentStep = stepIndex;
            digestTask(oldCurrentTask);
            var debug = isLongClick($event);
            $scope.invokeWorker(taskIndex, stepIndex, debug);
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
            if ($event) {
                $event.stopPropagation();
            }
            if ($scope.workerInProgress) {
                $scope.clickedWhileWorkerWasInProgress = slow ? 'slow' : 'fast';
                return false;
            }
            $scope.doingOneStep = false;
            if (! fromAutorun) {
                $scope.runUntilTask = $scope.runUntilStep = false;
            }
            run(slow);
            return false;
        };
        $scope.stopNoWatch = function($event){
            $scope.runUntilTask = $scope.runUntilStep = $scope.doingOneStep = $scope.clickedWhileWorkerWasInProgress = false;
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
            $scope.workerInProgress = $scope.clickedWhileWorkerWasInProgress = false;
            $scope.running = false;
            digestButtonPanel();
            if ($event) {
                $event.stopPropagation();
            }
            return false;
        };
        $scope.clickOnNextStepNoWatch = function($event){
            $event.stopPropagation();
            cfMessage.send('focusMainFrameWindow');
            digestButtonPanel();
            if ($scope.workerInProgress) {
                $scope.clickedWhileWorkerWasInProgress = 'step';
                return false;
            }
            $scope.runUntilTask = $scope.runUntilStep = false;
            $scope.doingOneStep = true;
            $scope.doNextStep();
            return false;
        };
        var trackWorkerContents = {};
        var trackWorkerLoaded = {};
        var trackWorkersAllLoaded = function() {
            var i; 
            for (i in trackWorkerLoaded) {
                if (trackWorkerLoaded.hasOwnProperty(i) && ! trackWorkerLoaded[i]) {
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
                    trackWorkerLoaded[originalUrl] = true;
                    if (xhr.response !== trackWorkerContents[originalUrl]) {
                        cfMessage.send('loadWorker', {code: xhr.response, src: originalUrl, isFinal: true});
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
                        trackWorkerLoaded[originalUrl] = true;
                        trackWorkerContents[originalUrl] = xhr.response;
                        cfMessage.send('loadWorker', {code: xhr.response, src: originalUrl, isFinal: trackWorkersAllLoaded()});
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
                var len = String(details.length).length;
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
            scope.textareaKeyUp = function($event){
                if ($event.keyCode === 27) {
                    scope.toggleSearch();
                }
            };
        },1000);
        setTimeout(function initAvailableTasksOfWorkerScope() {
            var scope = angular.element(document.getElementById('availableTasksOfWorker')).scope();
            if (! scope) {
                setTimeout(initAvailableTasksOfWorkerScope,1000);
                return;
            }
            scope.filter = '';
            scope.expanded = '';
            scope.onSearch = function(){
                scope.filter = $('#availableTasksOfWorkerSearch').val().toLowerCase();
                if (event.keyCode === 27) {
                    $scope.suggestTaskNameNoWatch();
                }
            };
            scope.expand = function(name) {
                scope.expanded = scope.expanded === name ? '' : name;
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
        $scope.noTaskSteps = function(task) {
            if (undefined === $scope.jobTaskDescriptions[task]) {
                return true;
            }
            return ! $scope.jobTaskDescriptions[task].length;
        };
        $scope.suggestTaskNameNoWatch = function() {
            if ($('#jobDetails').is(':visible')) {
                $('#jobDetails').hide();
                $('#buttonPanel').hide();
                $('#availableTasksOfWorker').show().data('scroll', $(window).scrollTop());
                cfMessage.send('toggleSize', {size: 'big'});
            } else {
                $('#jobDetails').show();
                $('#buttonPanel').show();
                $('#availableTasksOfWorker').hide();
                window.scrollTo(0, $('#availableTasksOfWorker').data('scroll'));
                cfMessage.send('toggleSize', {size: 'small'});
            }
            return false;
        };
        $scope.taskExplorerParameterEnteredNoWatch = function(input, event){
            var task = $(input).closest('table');
            var result = {task: task.attr('data-name')};
            if (! $(input).is('.result')) {
                task.find('input').each(function(i,el){
                    el = $(el);
                    var name = el.attr('name');
                    var value = el.val();
                    if (value.length && name) {
                        result[name] = value;
                    }
                });
                task.find('textarea.result').val($scope.getSuggestTaskJsonForTask('', result));
            }
            if (event.keyCode === 27) {
                $scope.suggestTaskNameNoWatch();
            }
        };
        $scope.getSuggestTaskJsonForTask = function (name, result) {
            if ('undefined' === typeof result) {
                result = {task: name};
            }
            return '\n        ' + JSON.stringify(result) + ',';
        };
    }]);
});
