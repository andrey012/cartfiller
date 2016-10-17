define('controller', ['app', 'scroll', 'audioService'], function(app){
    'use strict';
    app
    .controller('indexController', ['$scope', 'cfMessage', '$timeout', 'cfDebug', 'cfScroll', 'cfAudioService', function ($scope, cfMessage, $timeout, cfDebug, cfScroll, cfAudioService){
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
        var isTaskAHeading = function(index) {
            return undefined === $scope.jobDetails[index].task && undefined !== $scope.jobDetails[index].heading;
        };
        var skipHeadings = function() {
            while ($scope.jobDetails[$scope.currentTask] && isTaskAHeading($scope.currentTask)) {
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
        $scope.chooseJob = function(initial){
            $scope.chooseJobState = !$scope.chooseJobState;
            cfMessage.send($scope.chooseJobState ? 'chooseJob' : 'chooseJobCancel', {hideHashDetails: ! initial});
        };
        $scope.jobDetails = [];
        $scope.jobTaskProgress = [];
        $scope.jobTaskDescriptions = {};
        $scope.workerLib = {};
        $scope.jobTaskDiscoveredParameters = {};
        $scope.indexTitles = {};
        $scope.running = false;
        $scope.workerInProgress = false;
        $scope.currentTask = 0;
        $scope.currentStep = 0;
        $timeout(function(){$scope.chooseJob(true);}, 0);
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
        $scope.jobName = '';
        $scope.jobTitle = '';
        $scope.stepDependencies = {};
        $scope.currentMainFrameWindow = 0;
        $scope.currentUrls = [false];
        var autorunSpeed;
        var mouseDownTime;
        var suspendEditorMode;
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
            cfScroll(jQuery('#stepButton_' + $scope.currentTask + '_' + $scope.currentStep)[0], useTop, force);
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
        var updateTopWindowHash = function() {
            if ($scope.debugEnabled && $scope.jobName) {
            	cfMessage.send('updateHashUrl', {params: {job: $scope.jobName, task: $scope.currentTask + 1, step: $scope.currentStep + 1}});
            }
        };
        cfMessage.register(function(cmd, details){
            if (cmd === 'switchToWindow') {
                $scope.currentMainFrameWindow = details.currentMainFrameWindow;
                $scope.updateCurrentUrl();
            } else if (cmd === 'toggleEditorModeResponse') {
                suspendEditorMode = ! details.enabled;
                $('#suspendEditorMode').prop('checked', suspendEditorMode);
            } else if (cmd === 'jobDetails'){
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
                        $scope.jobName = 'undefined' === details.jobName ? '' : details.jobName;
                        $scope.jobTitle = 'undefined' === details.jobTitle ? '' : details.jobTitle;
                        updateTopWindowHash();
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
                            $scope.loadWorker();
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
            } else if (cmd === 'globalsUpdate'){
                $scope.workerGlobals = details.globals;
                digestGlobals();
            } else if (cmd === 'workerRegistered'){
                $scope.$apply(function(){
                    $scope.workersLoaded = $scope.workersCounter; // now we push all data from dispatcher at once
                    $scope.jobTaskDescriptions = details.jobTaskDescriptions;
                    // remove pause points for those worker steps, that do not exist
                    for (var i in $scope.pausePoints) {
                        if (undefined === $scope.jobDetails[i] || undefined === $scope.jobDetails[i].task || undefined ===  $scope.jobTaskDescriptions[$scope.jobDetails[i].task]) {
                            delete $scope.pausePoints[i];
                        }
                    }
                    $scope.workerLib = details.workerLib;
                    $scope.jobTaskDiscoveredParameters = details.discoveredParameters;
                    $scope.workerTaskSources = details.workerTaskSources;
                    $scope.stepDependencies = details.stepDependencies;
                    $scope.updateIndexTitles();
                });
                if ($scope.clickedWhileWorkerWasInProgress) {
                    run($scope.clickedWhileWorkerWasInProgress);
                }
            } else if (cmd === 'workerStepResult'){
                $scope.jobTaskProgress[details.index].stepsInProgress[details.step] = false;
                setStepStatus(details.index, details.step, details.status, details.message, details.response);
                $scope.jobTaskProgress[details.index].complete = details.nextTaskFlow === 'skipTask' || $scope.updateTaskCompleteMark(details.index);
                var proceed;
                var pause = false;
                var stopTestsuite = false;
                if ('ok' === details.status){
                    pause = $scope.incrementCurrentStep(false, details.nextTaskFlow);
                    proceed = true;
                } else if ('skip' === details.status){
                    pause = $scope.incrementCurrentStep(true, details.nextTaskFlow);
                    proceed = true;
                } else {
                    if ($('#alertOnErrors').is(':checked') && $scope.running){
                        alert('error');
                        stopTestsuite = true;
                    }
                    if ($scope.noTaskSteps($scope.jobDetails[$scope.currentTask])) {
                        $('#taskDiv_' + $scope.currentTask + ' textarea').focus().select();
                    }
                    proceed = false;
                }
                if ($scope.runUntilTask !== false && $scope.runUntilStep !== false && ($scope.runUntilTask < $scope.currentTask || ($scope.runUntilStep <= $scope.currentStep && $scope.runUntilTask === $scope.currentTask))) {
                    $scope.runUntilTask = $scope.runUntilStep = false;
                    proceed = false;
                }
                if (pause) {
                    proceed = false;
                    scrollCurrentTaskIntoView();
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
                        }, (($scope.running === 'slow') && (true !== details.nop)) ? (('undefined' !== typeof details.sleep) ? details.sleep : 1000) : 0);
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
                        completed: ! proceed,
                        stopTestsuite: stopTestsuite
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
                $scope.currentUrls[details.currentMainFrameWindow] = details.url;
                $scope.updateCurrentUrl();
            } else if (cmd === 'mousePointer') {
                (function(){
                    var scope = angular.element(document.getElementById('searchResults')).scope();
                    scope.searchVisible = true;
                    scope.stack = details.stack;
                    scope.window = details.w;
                    scope.$digest();
                })();
            } else if (cmd === 'cssSelectorEvaluateResult') {
                $('#searchButton').text('Search (' + details.count + ')').removeClass('btn-success btn-danger').addClass(details.count === 1 ? 'btn-success': 'btn-danger');
            }
        });
        var setStepStatus = function(task, step, status, message, response) {
            $scope.jobTaskProgress[task].stepResults[step] = {status: status, message: message, response: response};
        };
        $scope.incrementCurrentStep = function(skip, nextTaskFlow){
            var pause = false, i, j;
            if ('string' === typeof nextTaskFlow && 0 === nextTaskFlow.indexOf('skipStep,')) {
                var steps = (1 + parseInt(nextTaskFlow.replace('skipStep,', '')));
                for (i = 0; i < steps && $scope.currentStep < $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length; i ++ ) {
                    ////
                    $scope.currentStep ++;
                    setStepStatus($scope.currentTask, $scope.currentStep, 'skipped', '');
                    if ($scope.pausePoints[$scope.currentTask] && $scope.pausePoints[$scope.currentTask][$scope.currentStep]) {
                        pause = true;
                    }
                }
            } else if (0 === nextTaskFlow.indexOf('repeatStep')) {
                var n = parseInt(nextTaskFlow.split(',')[1]);
                $scope.currentStep = $scope.currentStep + 1 - n;
            } else {
                $scope.currentStep ++;
            }
            var oldCurrentTask = $scope.currentTask;
            if (nextTaskFlow === 'repeatJob') {
                $scope.currentTask = 0; 
                $scope.currentStep = 0;
                skipHeadings();
            } else if (nextTaskFlow === 'skipJob') {
                for (i = $scope.currentTask; i < $scope.jobDetails.length; i ++) {
                    if (! isTaskAHeading(i)) {
                        for (j = i === $scope.currentTask ? $scope.currentStep : 0; j < $scope.jobTaskDescriptions[$scope.jobDetails[i].task].length; j ++) {
                            setStepStatus(i, j, 'skipped', '');
                        }
                    }
                    $scope.jobTaskProgress[i].complete = true;
                    digestTask(i);
                }
                $scope.currentTask = $scope.jobDetails.length;
                $scope.currentStep = 0;
            } else if (skip || nextTaskFlow === 'skipTask' || nextTaskFlow === 'repeatTask' || $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length <= $scope.currentStep){
                while ($scope.currentStep < $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length) {
                    if ($scope.pausePoints[$scope.currentTask] && $scope.pausePoints[$scope.currentTask][$scope.currentStep]) {
                        pause = true;
                    }
                    ////
                    setStepStatus($scope.currentTask, $scope.currentStep, 'skipped', '');
                    $scope.currentStep ++;
                }
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
            }
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
            digestTask($scope.currentTask);
            updateTopWindowHash();
            if ($scope.pausePoints[$scope.currentTask] && $scope.pausePoints[$scope.currentTask][$scope.currentStep]) {
                pause = true;
            }
            return pause;
        };
        $scope.getNextStepToDo = function(index){
            var steps = $scope.jobTaskDescriptions[$scope.jobDetails[index].task];
            if (undefined === steps) {
                return 0;
            }
            for (var i = 0; i < steps.length; i++){
                var result = $scope.jobTaskProgress[index].stepResults[i];
                if (angular.isUndefined(result) || ('ok' !== result.status && 'skipped' !== result.status)){
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
            prompt('This is readonly but you can copy task name below. Source of this task is ' + $scope.workerTaskSources[name], name);
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
            cfMessage.send('invokeWorker', {
                index: taskIndex, 
                task: taskName, 
                step: stepIndex, 
                details: details, 
                debug: debug, 
                repeatCounter: $scope.repeatedTaskCounter[taskIndex] || 0,
                running: $scope.running
            });
            digestButtonPanel();
            digestTask($scope.currentTask);
        };
        $scope.getStepClass = function(index, step){
            var theClass = '';
            var markDependent = true;
            if ((index === $scope.currentTask) && (step === $scope.currentStep)) {
                markDependent = false;
            } else {
                theClass += 'btn-xs ';
            }
            if ($scope.jobTaskProgress[index].stepsInProgress[step] === true) {
                theClass += 'btn-default ';
                markDependent = false;
            } 
            var result = $scope.jobTaskProgress[index].stepResults[step];
            if (!angular.isUndefined(result)) {
                if ('ok' === result.status || 'skipped' === result.status){
                    theClass += 'btn-success ';
                } else if ('error' === result.status || 'skip' === result.status) {
                    theClass += 'btn-danger ';
                    markDependent = false;
                }
            } else {
                theClass += 'btn-warning ';
            }
            if (markDependent && $scope.stepDependencies[$scope.jobDetails[index].task][step]) {
                theClass += 'dependent-step ';
            }
            return theClass;
        };
        $scope.runNoWatch = function(slow, $event, fromAutorun){
            if ($event) {
                $event.stopPropagation();
            }
            if ($scope.workerInProgress || ($scope.workersLoaded < $scope.workersCounter)) {
                $scope.clickedWhileWorkerWasInProgress = slow ? 'slow' : 'fast';
                return false;
            }
            $scope.doingOneStep = false;
            if (! fromAutorun) {
                $scope.runUntilTask = $scope.runUntilStep = false;
            }
            if ($scope.currentTask >= $scope.jobDetails.length) {
                $scope.currentTask = $scope.currentStep = 0;
                skipHeadings();
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
        $scope.loadWorker = function(){
            var urls = 'string' === typeof $scope.workerSrc ? [$scope.workerSrc] : $scope.workerSrc;
            cfMessage.send('requestWorkers', {urls: urls});
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
                scope.cssSelector = scope.getCssSelector();
                cfMessage.send('evaluateCssSelector', {selector: scope.cssSelector, currentMainFrameWindow: scope.window});
                $('#selectorSearchQueryInput')[0].focus();
                setTimeout(function() {
                    $('#selectorSearchQueryInput')[0].select();
                }, 0);
            };
            scope.getCssSelector = function(){
                var r = ('(\'' + scope.stack.map(function(el){
                    var r = '' +
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
                        }).join(''));
                    if (r.trim().length) {
                        r += ':visible';
                    }
                    r +=
                        (el.selectIndex ? ('\').filter(function(i,el,x,c){ c = 0; for (x = el.previousSibling; x; x = x.previousSibling) c += x.nodeName === el.nodeName ? 1 : 0; return c === ' + (el.index - 1) + ';}).find(\'') : '');
                    return r +
                        (el.selectText ? ('\').filter(function(i,el){ return api.compareCleanText(' + JSON.stringify(el.text.trim()) + ', el.textContent);}).find(\'') : '')
                    ;
                })
                         .filter(function(v) { return v.trim().length; })
                         .join(' ') + '\')').replace(/.find\(\'\s*\'\)/g, '');
                return r;
            };
            scope.toggleSearch = function() {
                scope.searchVisible = ! scope.searchVisible;
            };
            scope.textareaKeyUp = function($event){
                if ($event.keyCode === 27) {
                    scope.toggleSearch();
                } else {
                    scope.cssSelector = $($event.target).val();
                    cfMessage.send('evaluateCssSelector', {selector: scope.cssSelector});
                }
            };
            scope.highlight = function(button) {
                var payload = [];
                for (var i = 0 ; i <= button.getAttribute('data-index'); i ++) {
                    var node = scope.stack[i];
                    payload.push([node.element, node.index - 1]);
                }
                cfMessage.send('highlightElementForQueryBuilder', {path: payload, currentMainFrameWindow: scope.window});
            };
        },1000);
        $scope.shortName = function(name) {
            return name.split('.').pop();
        };
        setTimeout(function initLibBrowserScope() {
            var scope = angular.element(document.getElementById('libBrowser')).scope();
            if (! scope) {
                setTimeout(initLibBrowserScope,1000);
                return;
            }
            scope.filter = '';
            scope.expanded = '';
            scope.onSearch = function(){
                scope.filter = $('#libBrowserSearch').val().toLowerCase();
                if (event.keyCode === 27) {
                    $scope.browseLibNoWatch();
                }
            };
            scope.expand = function(name, $event) {
                scope.expanded = scope.expanded === name ? '' : name;
                if ($event && $event.target) {
                    var div = $($event.target).closest('div.availableTask');
                    setTimeout(function() {
                        var input = div.find('input, textarea').first();
                        input.focus();
                        input[0].select();
                    }, 0);
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
            scope.expand = function(name, $event) {
                scope.expanded = scope.expanded === name ? '' : name;
                if ($event && $event.target) {
                    var div = $($event.target).closest('div.availableTask');
                    setTimeout(function() {
                        var input = div.find('input, textarea').first();
                        input.focus();
                        input[0].select();
                    }, 0);
                }
            };
        },1000);
        $scope.togglePause = function(element, event, doubleclick) {
            var s = element.getAttribute('id').split('_');
            var taskIndex = parseInt(s[1]);
            var stepIndex = parseInt(s[2]);
            if (undefined === $scope.pausePoints[taskIndex]) {
                $scope.pausePoints[taskIndex] = {};
            }
            $scope.pausePoints[taskIndex][stepIndex] = doubleclick ? 1 : $scope.pausePoints[taskIndex][stepIndex] ? 0 : 1;
            digestTask(taskIndex);
            event.stopPropagation();
            if (doubleclick) {
                $scope.runNoWatch();
            }
            return false;
        };
        $scope.noTaskSteps = function(task) {
            if (undefined === $scope.jobTaskDescriptions[task]) {
                return true;
            }
            return ! $scope.jobTaskDescriptions[task].length;
        };
        $scope.browseLibNoWatch = function() {
            if ($('#jobDetails').is(':visible')) {
                $('#jobDetails').hide();
                $('#buttonPanel').hide();
                $('#libBrowser').show().data('scroll', $(window).scrollTop());
                cfMessage.send('toggleSize', {size: 'big'});
                $('#libBrowserSearch').focus();
                $('#libBrowserSearch')[0].select();
            } else {
                $('#jobDetails').show();
                $('#buttonPanel').show();
                $('#libBrowser').hide();
                cfMessage.send('toggleSize', {size: 'small'});
                setTimeout(function() {
                    window.scrollTo(0, $('#libBrowser').data('scroll'));
                }, 200);
            }
            return false;
        };
        $scope.suggestTaskNameNoWatch = function() {
            if ($('#jobDetails').is(':visible')) {
                $('#jobDetails').hide();
                $('#buttonPanel').hide();
                $('#availableTasksOfWorker').show().data('scroll', $(window).scrollTop());
                cfMessage.send('toggleSize', {size: 'big'});
                $('#availableTasksOfWorkerSearch').focus();
                $('#availableTasksOfWorkerSearch')[0].select();
            } else {
                $('#jobDetails').show();
                $('#buttonPanel').show();
                $('#availableTasksOfWorker').hide();
                cfMessage.send('toggleSize', {size: 'small'});
                setTimeout(function() {
                    window.scrollTo(0, $('#availableTasksOfWorker').data('scroll'));
                }, 200);
            }
            return false;
        };
        $scope.taskExplorerParameterEnteredNoWatch = function(input, event){
            var task = $(input).closest('table');
            var result = {};
            var taskName = task.attr('data-name');
            result[taskName] = {};
            if (! $(input).is('.result')) {
                task.find('input').each(function(i,el){
                    el = $(el);
                    var name = el.attr('name');
                    var value = el.val();
                    if (value.length && name) {
                        result[taskName][name] = value;
                    }
                });
                task.find('textarea.result').val($scope.getSuggestTaskJsonForTask('', result));
            }
            if (event.keyCode === 27) {
                if ($('#availableTasksOfWorker').is(':visible')) {
                    $scope.suggestTaskNameNoWatch();
                }
            }
        };
        $scope.libBrowserKeyUpNoWatch = function(input, event) {
            if (event.keyCode === 27) {
                if ($('#libBrowser').is(':visible')) {
                    $scope.browseLibNoWatch();
                }
            }
        };
        $scope.getSuggestTaskJsonForTask = function (name, result) {
            if ('undefined' === typeof result) {
                result = {};
                result[name] = {};
            }
            return '\n        ' + JSON.stringify(result) + ',';
        };
        $scope.getSuggestForLibBrowser = function(name, full) {
            var displayName = full ? name : $scope.shortName(name);
            if ($scope.workerLib[name] === 'step builder' ||
                $scope.workerLib[name] === 'steps')
            {
                return 'lib(\'' + displayName + '\')';
            } else if ($scope.workerLib[name] === 'helper') {
                return 'lib.' + displayName + '()';
            } else {
                return displayName;
            }
        };
        setTimeout(function initGlobalsScope() {
            var scope = angular.element(document.getElementById('globalsDiv')).scope();
            if (! scope) {
                return setTimeout(initGlobalsScope, 1000);
            }
            scope.updateGlobal = function(name) {
                var newValue = prompt('Enter new value for [' + name + ']', $scope.workerGlobals[name]);
                if (null !== newValue) {
                    $scope.workerGlobals[name] = newValue;
                    cfMessage.send('updateGlobal', {name: name, value: newValue});
                }
            };
        }, 1000);
        $scope.suspendEditorModeNoWatch = function(event) {
            event.stopPropagation();
            var enable = suspendEditorMode;
            cfMessage.send('toggleEditorMode', {enable: enable});
            return false;
        };
        $scope.recordAudioNoWatch = function(event) {
            var button = $('#recordAudio');
            var recording = cfAudioService.toggle(button[0], $scope.jobTitle, $scope.currentTask, $scope.currentStep);
            if (recording) {
                event.stopPropagation();
                button.removeClass('btn-info').addClass('btn-danger');
                return false;
            } else {
                button.removeClass('btn-danger').addClass('btn-info');
                return true;
            }
        };
        $(document).on('click focus keyup', '.copy-to-clipboard', function(event) {
            event.target.select();
            document.execCommand('copy');
            event.stopPropagation();
        });
        $scope.updateCurrentUrl = function() {
            $('#currentUrl').text($scope.currentUrls[$scope.currentMainFrameWindow]).attr('href', $scope.currentUrls[$scope.currentMainFrameWindow]);
        };
    }]);
});
