define('controller', ['app', 'scroll', 'audioService'], function(app){
    'use strict';
    app
    .controller('indexController', ['$scope', 'cfMessage', '$timeout', 'cfDebug', 'cfScroll', 'cfAudioService', function ($scope, cfMessage, $timeout, cfDebug, cfScroll, cfAudioService){
        var timeouts = {};
        var nextStepTimeoutHandle = false;
        var trackMousePointerWithDelay = false;
        var searchInProgress = false;
        var searchInProgressAppend = false;
        var trackMousePointerDirect = false;
        var triggerWithShiftNoWatchShiftState = false;
        var highlightingSearchedElement = false;
        var directMousePointerCaptureMessage = 'Click on the element you want to analyze, you can use right click to prevent action. Use shift key + small mouse move as an alternative way to capture element';
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
        var jsStringifyKeyCleanPattern = /^[a-zA-Z_$0-9]+$/;
        var jsStringifyKey = function(v) {
            if (jsStringifyKeyCleanPattern.test(v)) {
                return v;
            } else {
                return JSON.stringify(v);
            }
        };
        var jsStringify = function(v) {
            if ('object' === typeof v) {
                if (v instanceof Array) {
                    return '[' + v.map(jsStringify).join(', ') + ']';
                } else {
                    var pc = [];
                    for (var i in v) {
                        pc.push(jsStringifyKey(i) + ': ' + jsStringify(v[i]));
                    }
                    return '{' + pc.join(', ') + '}';
                }
            } else {
                return JSON.stringify(v);
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
        var mouseMoveShift = false;
        $scope.onMouseMoveNoWatch = function(event) {
            if (mouseMoveShift !== event.shiftKey) {
                mouseMoveShift = event.shiftKey;
                if (mouseMoveShift) {
                    mouseDownTime = event.timeStamp || (new Date()).getTime();
                } else {
                    event.target.click();
                }
            }
        };
        var expressionCache = {};
        var makeExpressionMatcher = function(match) {
            var groups;
            var i = 2;
            var re = new RegExp('^(Given |When |Then |But |And |)' + match.substr(1).replace(/\(|\$\{([^}]*)\}/g, function(m, g0) {
                if (m === '(') {
                    i ++;
                    return m;
                } else {
                    groups = (function(groups, i) {
                        return function(task, m) {
                            if (g0.length) {
                                task[g0] = m[i];
                                var s = m[i];
                                var first = true;
                                var mm;
                                while (mm = /^([^<]*)<([^>]+)>(.*)$/.exec(s)) {
                                    if (first && !mm[1].length && !mm[3].length) {
                                        task[g0] = [mm[2]];
                                        break;
                                    } else {
                                        if (first) {
                                            task[g0] = [mm[1], [mm[2]], mm[3]];
                                        } else {
                                            task[g0].pop();
                                            task[g0].push(mm[1]);
                                            task[g0].push([mm[2]]);
                                            task[g0].push(mm[3]);
                                        }
                                        s = mm[3];
                                    }
                                }
                                if (groups) {
                                    groups(task, m);
                                }
                            }
                        };
                    })(groups, i++);
                    return '([^\x00]*)';
                }
            }), 'i');
            return function(expression) {
                var m = re.exec(expression);
                if (m) {
                    var task = {task: match};
                    if (groups) {
                        groups(task, m);
                    }
                    return task;
                }
            };
        };
        var compileExpressionDescriptions = function() {
            for (var i in $scope.jobTaskDescriptions) {
                if (i.substr(0, 1) === '^') {
                    expressionCache[i] = makeExpressionMatcher(i);
                }
            }
        };
        var expressionMatches = function(match, expression) {
            return expressionCache[match](expression);
        };
        var recompileExpression = function(expression, taskIndex, stack) {
            var n = 0;
            while (expression.substr(0, 4) === '    ') {
                expression = expression.substr(4);
                n++;
            }
            if (expression.substr(-3) === '...') {
                expression = expression.substr(0, expression.length - 3);
                stack.splice(n, 100, expression);
                expression = stack.join('\x00');
            } else if (n > 0) {
                expression = stack.slice(0, n).join('\x00') + '\x00' + expression;
            }
            $scope.expressions[taskIndex] = expression;
            $scope.expressionsUI[taskIndex] = expressionToUI(expression);
            $scope.expressionsCode[taskIndex] = expressionToCode(expression);
            for (var i in expressionCache) {
                var task = expressionMatches(i, expression);
                if (task) {
                    return task;
                }
            }
        };
        var refreshExpressions = function() {
            var stack = [];
            $scope.expressions.filter(function(expression, taskIndex) {
                if (expression) {
                    $scope.jobDetails[taskIndex] = recompileExpression(expression, taskIndex, stack) || $scope.jobDetails[taskIndex];
                }
            });
        };
        var recompileExpressions = function(jobDetails) {
            $scope.expressions = [];
            $scope.expressionsUI = [];
            $scope.expressionsCode = [];
            var stack = [];
            return jobDetails.map(function(task, taskIndex) {
                if (task.task === '^') {
                    return recompileExpression(task[''], taskIndex, stack) || task;
                } else {
                    return task;
                }
            });
        };
        $scope.jobDetails = recompileExpressions([]);
        $scope.expressions = [];
        $scope.expressionsUI = [];
        $scope.expressionsCode = [];
        $scope.jobTaskProgress = [];
        $scope.jobTaskDescriptions = {};
        compileExpressionDescriptions();
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
        $scope.workerGlobalsOrdered = [];
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
        $scope.jobId = '';
        $scope.stepDependencies = {};
        $scope.pausesBeforeSteps = {};
        $scope.currentMainFrameWindow = 0;
        $scope.currentUrls = [false];
        $scope.dispatcherCurrentTask = 0;
        $scope.dispatcherCurrentStep = 0;
        var rememberedScrollPositionBeforeSearch = false;
        var autorunSpeed;
        var mouseDownTime;
        var suspendEditorMode;
        var repeatStepCounter = 0;
        var repeatStepCounterTask = false;
        var repeatStepCounterStep = false;
        var strcmp = function(a, b) {
            return a > b ? 1 : a < b ? -1 : 0;
        };
        var updateGlobalsOrdered = function() {
            var unique = {_random: true, _timestamp: true};
            $scope.workerGlobalsOrdered = ['_random', '_timestamp'];
            for (var i in $scope.workerGlobals) {
                if (! unique[i]) {
                    $scope.workerGlobalsOrdered.push(i);
                    unique[i] = true;
                }
            }
            $scope.workerGlobalsOrdered.sort(function(a, b) {
                if (a.substr(0, 1) === '_') {
                    if (b.substr(0, 1) === '_') {
                        return strcmp(a, b);
                    } else {
                        return 1;
                    }
                } else {
                    if (b.substr(0, 1) === '_') {
                        return -1;
                    } else {
                        return strcmp(a, b);
                    }
                }
            });
        };
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
            var elementToScrollTo = jQuery('#stepButton_' + $scope.currentTask + '_' + $scope.currentStep);
            if (! elementToScrollTo.length) {
                var templateTextarea = jQuery('#template_' + $scope.currentTask);
                if (templateTextarea.length) {
                    templateTextarea[0].focus();
                    templateTextarea[0].select();
                    elementToScrollTo = templateTextarea;
                }
            }
            cfScroll(elementToScrollTo[0], useTop, force);
        };
        var promptWithJsonWorkaround = function(message, defaultValue) {
            var result = prompt(message, defaultValue);
            if (result !== null) {
                try {
                    var jsonParsed = JSON.parse(result);
                    if (String(jsonParsed) !== String(result)) {
                        if (confirm('this looks like valid JSON, do you want me to parse this JSON? Here it is: \n\n' + JSON.stringify(jsonParsed, null, 4))) {
                            result = jsonParsed;
                        }
                    }
                } catch (e) {}
            }
            return result;
        };
        var autorun = function() {
            if ($scope.workersLoaded >= $scope.workersCounter) {
                if (! $scope.pausePoints[$scope.currentTask] || ! $scope.pausePoints[$scope.currentTask][$scope.currentStep]) {
                    $scope.runNoWatch(autorunSpeed === 'slow' ? true : false, null, true);
                }
            } else {
                // wait some more time
                setTimeout(autorun, 100);
            }
        };
        var updateTopWindowHash = function() {
            if ($scope.debugEnabled && $scope.jobName) {
            	cfMessage.send('updateHashUrl', {params: {job: $scope.jobName, task: $scope.currentTask + 1, step: $scope.currentStep + 1}});
            }
        };
        cfMessage.register(function(cmd, details){
            var i;
            if (cmd === 'switchToWindow') {
                $scope.currentMainFrameWindow = details.currentMainFrameWindow;
                $scope.updateCurrentUrl();
            } else if (cmd === 'toggleEditorModeResponse') {
                suspendEditorMode = ! details.enabled;
                $('#suspendEditorMode').prop('checked', suspendEditorMode);
            } else if (cmd === 'jobDetails'){
                if (! details.$cartFillerTestUpdate) {
                    cfMessage.send('resetAdditionalWindows');
                }
                $scope.currentMainFrameWindow = 0;
                if (nextStepTimeoutHandle) {
                    clearTimeout(nextStepTimeoutHandle);
                    nextStepTimeoutHandle = false;
                }
                $scope.$apply(function(){
                    if (undefined !== details.$cartFillerTestUpdate && undefined === details.details) {
                        // this is just test update
                        $scope.jobDetails = recompileExpressions(details.$cartFillerTestUpdate.details);
                        (function() {
                            for (var i in $scope.jobDetails[$scope.dispatcherCurrentTask]) {
                                if ($scope.jobDetails[$scope.dispatcherCurrentTask].hasOwnProperty(i)) {
                                    cfMessage.send('updateProperty', {index: $scope.dispatcherCurrentTask, name: i, value: $scope.jobDetails[$scope.dispatcherCurrentTask][i]});
                                }
                            }
                        })();
                    } else {
                        cfMessage.send('makeSmaller');
                        cfScroll();
                        $scope.chooseJobState = false;
                        $scope.jobDetails = recompileExpressions(details.details);
                        $scope.jobTitleMap = angular.isUndefined(details.titleMap) ? {} : details.titleMap;
                        $scope.jobTaskProgress = [];
                        $scope.jobTaskStepProgress = [];
                        $scope.repeatedTaskCounter = [];
                        $scope.pausePoints = {};
                        $scope.currentTask = 0;
                        $scope.currentStep = 0;
                        $scope.noResultButton = ! details.resultMessage;
                        $scope.jobName = 'undefined' === details.jobName ? '' : details.jobName;
                        $scope.jobTitle = 'undefined' === details.jobTitle ? '' : details.jobTitle;
                        $scope.jobId = details.jobId;
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
                        updateGlobalsOrdered();
                    }
                    while ($scope.jobTaskProgress.length < $scope.jobDetails.length) {
                        $scope.jobTaskProgress.push({complete: false, step: 0, stepsInProgress: {}, stepResults: {}});
                    }
                    skipHeadings();
                });
            } else if (cmd === 'globalsUpdate'){
                $scope.workerGlobals = details.globals;
                updateGlobalsOrdered();
                digestGlobals();
            } else if (cmd === 'workerRegistered'){
                $scope.$apply(function(){
                    $scope.workersLoaded = $scope.workersCounter; // now we push all data from dispatcher at once
                    $scope.jobTaskDescriptions = details.jobTaskDescriptions;
                    expressionCache = {};
                    compileExpressionDescriptions();
                    refreshExpressions();
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
                    $scope.pausesBeforeSteps = details.pausesBeforeSteps;
                    $scope.updateIndexTitles();
                });
                if ($scope.clickedWhileWorkerWasInProgress) {
                    run($scope.clickedWhileWorkerWasInProgress);
                }
            } else if (cmd === 'workerStepResult'){
                $scope.dispatcherCurrentStep = details.step;
                $scope.dispatcherCurrentTask = details.index;
                $scope.jobTaskProgress[details.index].stepsInProgress[details.step] = false;
                setStepStatus(details.index, details.step, details.status, details.message, details.response);
                var switchTestSuite;
                var pause = false;
                var stopTestsuite = false;
                var proceed;
                var wasRunning = $scope.running;
                var nextStepTimeout = 0;
                if ('object' === typeof details.nextTaskFlow && details.nextTaskFlow.switchTestSuite) {
                    switchTestSuite = details.nextTaskFlow.switchTestSuite;
                    proceed = false;
                    $scope.running = false;
                } else {
                    if (-1 !== details.nextTaskFlow.indexOf('skipTask')) {
                        var tasksToSkip = parseInt(details.nextTaskFlow.split(',')[1]);
                        for (i = details.index; i < details.index + tasksToSkip; i ++ ) {
                            $scope.jobTaskProgress[i].complete = true;
                        }
                    } else if ($scope.updateTaskCompleteMark(details.index)) {
                        $scope.jobTaskProgress[details.index].complete = true;
                    } else {
                        $scope.jobTaskProgress[details.index].complete = false;
                    }
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
                    if (proceed && $scope.clickedWhileWorkerWasInProgress) {
                        if ($scope.clickedWhileWorkerWasInProgress === 'fast' || $scope.clickedWhileWorkerWasInProgress === 'slow') {
                            $scope.running = $scope.clickedWhileWorkerWasInProgress;
                            $scope.doingOneStep = false;
                        } else if ($scope.clickedWhileWorkerWasInProgress === 'step') {
                            $scope.running = false;
                            $scope.doingOneStep = true;
                        }
                    }
                    if ($scope.jobDetails[$scope.currentTask] && $scope.jobDetails[$scope.currentTask].task && $scope.pausesBeforeSteps[$scope.jobDetails[$scope.currentTask].task] && $scope.pausesBeforeSteps[$scope.jobDetails[$scope.currentTask].task][$scope.currentStep]) {
                        details.nop = false;
                    }
                    if ($scope.running || ($scope.doingOneStep && ($scope.clickedWhileWorkerWasInProgress === 'step' || true === details.nop))){
                        if (proceed && details.nextTaskFlow !== 'stop'){
                            nextStepTimeout = (($scope.running === 'slow' || cfDebug.callPhantom) && (true !== details.nop)) ?
                                (('undefined' !== typeof details.sleep) ? details.sleep : 1000) :
                                0;
                            if (nextStepTimeoutHandle) {
                                // looks like we already have something pending from older times - cancel it
                                clearTimeout(nextStepTimeoutHandle);
                            }
                            if (cfDebug.callPhantom) {
                                cfDebug.callPhantom({preventRenderingUntilNextFrame: true});
                                nextStepTimeoutHandle = setTimeout(function() {
                                    nextStepTimeoutHandle = false;
                                    cfDebug.callPhantom({renderNextFrame: true});
                                    $scope.doNextStep();
                                }, 100); // give it some time to stabilize
                            } else {
                                nextStepTimeoutHandle = setTimeout(
                                    function(){
                                        nextStepTimeoutHandle = false;
                                        $scope.doNextStep();
                                    },
                                    nextStepTimeout
                                );
                            }
                        } else {
                            $scope.running = $scope.doingOneStep = false;
                        }
                    }
                    $scope.clickedWhileWorkerWasInProgress = false;
                }
                cfMessage.send(
                    'sendStatus',
                    {
                        result: $scope.jobTaskProgress,
                        tasks: $scope.jobDetails,
                        currentTaskIndex: details.index,
                        currentTaskStepIndex: details.step,
                        running: wasRunning,
                        completed: ! proceed,
                        stopTestsuite: stopTestsuite,
                        nextTaskIndex: $scope.currentTask,
                        nextTaskStepIndex: $scope.currentStep,
                        nextTaskSleep: nextStepTimeout,
                        globals: details.globals,
                        jobId: $scope.jobId,
                        switchTestSuite: switchTestSuite
                    });
                $scope.workerInProgress = false;
                if (!proceed){
                    digestTask($scope.currentTask);
                }
                digestButtonPanel();
                if ('object' === typeof details.globals) {
                    for (i in details.globals) {
                        if (details.globals.hasOwnProperty(i)){
                            $scope.workerGlobals = details.globals;
                            updateGlobalsOrdered();
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
                if (details.autoshootReady) {
                    $('#dashboardMessage').show().text(
                        trackMousePointerDirect ?
                        directMousePointerCaptureMessage :
                        'now make small movement of your mouse'
                    );
                } else if (details.autoshootCaptured) {
                    $('#dashboardMessage').show().text('your mouse position is captured, now you have another 5 seconds before element lookup will happen');
                } else {
                    if (! details.notFinal) {
                        (function(){
                            var scope = angular.element(document.getElementById('searchResults')).scope();
                            if (timeouts.refreshPointer) {
                                clearTimeout(timeouts.refreshPointer);
                                timeouts.refreshPointer = false;
                            }
                            timeouts.refreshPointer = setTimeout(function refreshPointer() {
                                timeouts.refreshPointer = false;
                                if (! highlightingSearchedElement) {
                                    scope.send(false);
                                }
                                timeouts.refreshPointer = setTimeout(refreshPointer, 100);
                            });
                            scope.searchVisible = true;
                            if (searchInProgressAppend) {
                                scope.stacks.push(details.stack);
                            } else {
                                scope.stacks = [details.stack];
                            }
                            scope.window = details.w;
                            scope.delay = trackMousePointerWithDelay;
                            scope.$digest();
                        })();
                        searchInProgress = false;
                        $('#dashboardMessage').hide();
                    }
                }
            } else if (cmd === 'cssSelectorEvaluateResult') {
                $('#searchButton').text('Search (' + details.count + ')').removeClass('btn-success btn-danger').addClass(details.count === 1 ? 'btn-success': 'btn-danger');
            } else if (cmd === 'phantomScroll') {
                console.log(JSON.stringify(details));
                if (details.scroll && details.scroll.rect) {
                    cfScroll(null, null, null, details.scroll.rect.top);
                }
            } else if (cmd === 'messageCloseClicked') {
                if (nextStepTimeoutHandle) {
                    clearTimeout(nextStepTimeoutHandle);
                    nextStepTimeoutHandle = false;
                    $scope.doNextStep();
                }
            }
        });
        var expressionFromUI = function(e) {
            return e.replace(/ \>\>\> /g, '\x00');
        };
        var expressionToUI = function(e) {
            return e.replace(/\x00/g, ' >>> ');
        };
        var expressionToCode = function(e) {
            return e.replace(/\x00/g, '\\x00');
        };
        var setStepStatus = function(task, step, status, message, response) {
            $scope.jobTaskProgress[task].stepResults[step] = {
                status: status,
                message: message,
                response: response,
                title: $scope.jobTaskDescriptions[$scope.jobDetails[task].task] ? $scope.jobTaskDescriptions[$scope.jobDetails[task].task][step] : undefined
            };
        };
        $scope.incrementCurrentStep = function(skip, nextTaskFlow){
            var pause = false, i, j;
            if ('string' === typeof nextTaskFlow && 0 === nextTaskFlow.indexOf('skipStep,')) {
                var steps = (1 + parseInt(nextTaskFlow.replace('skipStep,', '')));
                for (i = 0; i < steps && $scope.currentStep < $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length; i ++ ) {
                    $scope.currentStep ++;
                    setStepStatus($scope.currentTask, $scope.currentStep, 'skipped', '');
                    if ($scope.pausePoints[$scope.currentTask] && $scope.pausePoints[$scope.currentTask][$scope.currentStep]) {
                        pause = true;
                    }
                }
                if ($scope.updateTaskCompleteMark($scope.currentTask)) {
                    $scope.jobTaskProgress[$scope.currentTask].complete = true;
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
            } else if (skip || -1 !== nextTaskFlow.indexOf('skipTask') || -1 !== nextTaskFlow.indexOf('repeatTask') || $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length <= $scope.currentStep){
                while ($scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task] && $scope.currentStep < $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length) {
                    if ($scope.pausePoints[$scope.currentTask] && $scope.pausePoints[$scope.currentTask][$scope.currentStep]) {
                        pause = true;
                    }
                    setStepStatus($scope.currentTask, $scope.currentStep, 'skipped', '');
                    $scope.currentStep ++;
                }
                $scope.currentStep = 0;
                if (-1 !== nextTaskFlow.indexOf('repeatTask')) {
                    var tasksToRepeat = parseInt(nextTaskFlow.split(',')[1]);
                    for (i = $scope.currentTask; i > $scope.currentTask - tasksToRepeat; i --) {
                        if (undefined === $scope.repeatedTaskCounter[i]) {
                            $scope.repeatedTaskCounter[i] = 0;
                        }
                        $scope.repeatedTaskCounter[i] ++;
                    }
                    $scope.currentTask = Math.max(0, $scope.currentTask - tasksToRepeat + 1);
                } else if (-1 !== nextTaskFlow.indexOf('skipTask')) {
                    var tasksToSkip = parseInt(nextTaskFlow.split(',')[1]);
                    for (i = $scope.currentStep + 1; i < $scope.currentStep + tasksToSkip; i ++ ) {
                        for (j = 0; j < $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length; j ++) {
                            if ($scope.pausePoints[i] && $scope.pausePoints[i][j]) {
                                pause = true;
                            }
                            setStepStatus(i, j, 'skipped', '');
                        }
                        $scope.repeatedTaskCounter[i] = 0;
                    }
                    $scope.currentTask += tasksToSkip;
                    $scope.repeatedTaskCounter[$scope.currentTask] = 0;
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
                pause = true;
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
        $scope.toggleTaskProgress = function(index){
            $scope.jobTaskProgress[index].complete = !$scope.jobTaskProgress[index].complete;
            return false;
        };
        $scope.getPropertyValue = function(value) {
            if ('object' === typeof value) {
                value = 'json: ' + JSON.stringify(value, null, 1);
            }
            value = String(value);
            if (value.length > 100) {
                value = value.substr(0, 100) + '...';
            }
            return value;
        };
        $scope.doubleClickTaskInput = function(index, name, value) {
            var val = promptWithJsonWorkaround('Enter new value for [' + name + ']', 'object' === typeof value ? JSON.stringify(value) : value);
            if (null !== val) {
                $scope.jobDetails[index][name] = val;
                cfMessage.send('updateProperty', {index: index, name: name, value: val});
            }
        };
        $scope.doubleClickTaskName = function(name, jobTaskIndex, $event) {
            if ($scope.expressions[jobTaskIndex] && ! $event.shiftKey) {
                var value = prompt('This is Cucumber-style statement, feel free to edit it', $scope.expressionsUI[jobTaskIndex]);
                if (value) {
                    $scope.expressions[jobTaskIndex] = expressionFromUI(value);
                    $scope.expressionsUI[jobTaskIndex] = value;
                    $scope.jobDetails[jobTaskIndex] = {task: '^', '': value};
                    refreshExpressions();
                }
            } else {
                prompt('This is readonly but you can copy task name below. Source of this task is ' + $scope.workerTaskSources[name], name.replace(/\x00/g, '\\x00'));
            }
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
            var debug = isLongClick($event) || $event.shiftKey;
            $scope.invokeWorker(taskIndex, stepIndex, debug);
            cfMessage.send('focusMainFrameWindow');
            return false;
        };
        $scope.invokeWorker = function(taskIndex, stepIndex, debug){
            $scope.jobTaskProgress[taskIndex].stepsInProgress[stepIndex] = true;
            var details = $scope.jobDetails[taskIndex];
            var taskName = details.task;
            $scope.workerInProgress = true;
            if (taskIndex === repeatStepCounterTask && stepIndex === repeatStepCounterStep) {
                repeatStepCounter ++;
            } else {
                repeatStepCounter = 0;
                repeatStepCounterTask = taskIndex;
                repeatStepCounterStep = stepIndex;
            }
            cfMessage.send('invokeWorker', {
                index: taskIndex,
                task: taskName,
                step: stepIndex,
                details: details,
                debug: debug,
                repeatCounter: $scope.repeatedTaskCounter[taskIndex] || 0,
                stepRepeatCounter: repeatStepCounter,
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
        $scope.restartFromPauseNoWatch = function($event) {
            if ($event) {
                $event.stopPropagation();
            }
            if ($scope.workerInProgress || ($scope.workersLoaded < $scope.workersCounter)) {
                return false;
            }
            $scope.doingOneStep = false;
            // rewind to nearest known pause
            var restartTask = 0, restartStep = 0;
            for (var pauseTask in $scope.pausePoints) {
                pauseTask = parseInt(pauseTask);
                for (var pauseStep in $scope.pausePoints[pauseTask]) {
                    pauseStep = parseInt(pauseStep);
                    if ($scope.pausePoints[pauseTask][pauseStep]) {
                        if (pauseTask < $scope.currentTask || (pauseTask === $scope.currentTask && pauseStep < $scope.currentStep)) {
                            if (restartTask < pauseTask || (restartTask === pauseTask && restartStep < pauseStep)) {
                                restartTask = pauseTask;
                                restartStep = pauseStep;
                            }
                        }
                    }
                }
            }
            $scope.runUntilTask = $scope.runUntilStep = false;
            var oldCurrentTask = $scope.currentTask;
            $scope.currentTask = restartTask;
            $scope.currentStep = restartStep;
            digestTask(oldCurrentTask);
            scrollCurrentTaskIntoView(true, true);
            skipHeadings();
            run();
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
            if (name === '_random') {
                return '(e.g. 1388531842351124)';
            }
            if (name === '_random') {
                return String(new Date().getTime());
            }
            var v = $scope.workerGlobals[name];
            return 'object' === typeof v ? ('json: ' + JSON.stringify(v)) : v;
        };
        $scope.refreshPageNoWatch = function($event) {
            cfMessage.send('refreshPage');
            $event.stopPropagation();
            return false;
        };
        $scope.performSearchNoWatch = function($event, append) {
            if (! searchInProgress) {
                searchInProgress = true;
                searchInProgressAppend = append;
                trackMousePointerWithDelay = $event.shiftKey;
                trackMousePointerDirect = ! $event.ctrlKey;
                $('#dashboardMessage').show().text(trackMousePointerDirect ?
                    (
                        trackMousePointerWithDelay ?
                        'Prepare your application for capture, e.g. focus the input, start typing to let auto-suggest list to appear, etc. Capture will start in 5 seconds' :
                        directMousePointerCaptureMessage
                    ) :
                    (
                        trackMousePointerWithDelay ?
                        'Move your mouse to the element you want to analyze, you have 5 seconds for that, then the layover will appear, make a short mouse movement to let layover notice your mouse position' :
                        'Click on the element you want to analyze'
                    )
                );
                cfMessage.send('startReportingMousePointer', {delay: trackMousePointerWithDelay, direct: trackMousePointerDirect});
                var scope = angular.element(document.getElementById('searchResults')).scope();
                if (! scope.searchVisible) {
                    rememberedScrollPositionBeforeSearch = window.scrollY;
                }
            }
            if (timeouts.refreshPointer) {
                clearTimeout(timeouts.refreshPointer);
                timeouts.refreshPointer = false;
            }
        };
        setTimeout(function initSearchScope() {
            var scope = angular.element(document.getElementById('searchResults')).scope();
            scope.type = 'cf';
            if (! scope) {
                setTimeout(initSearchScope,1000);
                return;
            }
            scope.send = function(initial) {
                cfMessage.send('evaluateCssSelector', {selector: scope.cssSelector, currentMainFrameWindow: scope.window, taskDetails: $scope.jobDetails[$scope.currentTask], initial: initial, type: scope.type});
            };
            scope.toggle = function(what, where, index){
                if (undefined === index) {
                    where[what] = ! where[what];
                } else {
                    if (undefined === where[what]) {
                        where[what] = {};
                    }
                    where[what][index] = ! where[what][index];
                }
                scope.updateTextarea();
            };
            scope.updateTextarea = function() {
                switch (scope.type) {
                    case 'xpath':
                        scope.cssSelector = scope.getXpathSelector();
                        break;
                    case 'cypress':
                        scope.cssSelector = scope.getCypressSelector();
                        break;
                    default:
                        scope.cssSelector = scope.getCssSelector();
                }
                scope.send(true);
                $('#selectorSearchQueryInput')[0].focus();
                setTimeout(function() {
                    $('#selectorSearchQueryInput')[0].select();
                }, 0);
            };
            scope.triggerWithShiftNoWatch = function(event) {
                if (event.shiftKey) {
                    if (!triggerWithShiftNoWatchShiftState) {
                        event.target.click();
                        triggerWithShiftNoWatchShiftState = true;
                    }
                } else {
                    triggerWithShiftNoWatchShiftState = false;
                }
            };
            scope.getXpathSelector = function() {
                var knownStackIndex = 0;
                var r =
                    (
                        '"' +
                        scope.stacks.map(function(stack, stackIndex) {
                            return stack.map(function(el){
                                var r = ((knownStackIndex === stackIndex) ? '//' : '/ancestor::') +
                                    (el.selectNodeName && el.element ? el.element : '*') +
                                    (el.selectId ? ('[(@id=\\"' + el.id + '\\")]') : '') +
                                    (el.classes.filter(function(c,i) {
                                        return undefined !== el.selectClass && el.selectClass[i];
                                    }).map(function(v){
                                        return '[contains(concat(\\" \\", @class, \\" \\"), \\" ' + v + ' \\")]';
                                    }).join('')) +
                                    (el.attrs.filter(function(a,i) {
                                        return undefined !== el.selectAttribute && el.selectAttribute[i];
                                    }).map(function(a){
                                        return '[(@' + a.n + '=\\"' + a.v + '\\"' + ')]';
                                    }).join(''));
                                if (el.selectText) {
                                    r += '[(text() = \\"' + el.text.trim() + '\\")]';
                                }
                                r = r.replace(/\]\[/g, ' and ');
                                if (knownStackIndex !== stackIndex) {
                                    r += '[1]';
                                } else if (el.selectIndex) {
                                    r += '[' + el.index + ']';
                                }
                                r = r.trim().replace(/^(\/\/\*|\/ancestor\:\:\*\[1\])$/, '');
                                if (r) {
                                    knownStackIndex = stackIndex;
                                }
                                return r;
                            })
                            .filter(function(v) { return v.trim().length; })
                            .join('');
                        }).join('') +
                        '"'
                    );
                return r;

            };
            scope.addClosest = function() {
                var newStack = scope.stacks[0].map(function(el) {
                    var newEl = {};
                    for (var i in el) {
                        if (0 !== i.indexOf('select')) {
                            newEl[i] = el[i];
                        }
                    }
                    return newEl;
                });
                scope.stacks.push(newStack);
            };
            scope.toggleType = function() {
                switch (scope.type) {
                    case 'cf': scope.type = 'xpath'; break;
                    case 'xpath': scope.type = 'cypress'; break;
                    case 'cypress': scope.type = 'cf'; break;
                }
                scope.updateTextarea();
            };
            scope.getCypressSelector = function() {
                return scope.getCssSelector()
                    .replace(/\.withText\(/g, '.contains(')
                    .replace(/'\)\.nthOfType\((\d+)\)/g, function(m, g1) {
                        return ':nth-of-type(' + (parseInt(g1) + 1) + ')\')';
                    });
            };
            scope.getCssSelector = function() {
                var generateCompareCleanTextExpression = function(s) {
                    s = String(s);
                    for (var i in $scope.jobDetails[$scope.currentTask]) {
                        if (i !== 'task') {
                            if (String($scope.jobDetails[$scope.currentTask][i]) === s ||
                                $scope.jobDetails[$scope.currentTask][i] === s.trim()
                            ) {
                                return '\'${' + i + '}\'';
                            } else if (String($scope.jobDetails[$scope.currentTask][i]).toLowerCase() === s.toLowerCase()) {
                                return '\'${' + i + '}\', true';
                            }
                        }
                    }
                    return JSON.stringify(s);
                };
                var knownStackIndex = 0;
                var r =
                    (
                        '(\'' +
                        scope.stacks.map(function(stack, stackIndex) {
                            return stack.map(function(el){
                                var r = '' +
                                    (el.selectNodeName && el.element ? el.element : '') +
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
                                if (r.trim().length && ! /option$/.test(r.trim())) {
                                    r += ':visible';
                                }
                                if (el.selectIndex) {
                                    r += '\').nthOfType(' + (el.index - 1) + ').find(\'';
                                }
                                if (el.selectText) {
                                    r += '\').withText(' + generateCompareCleanTextExpression(el.text.trim()) + ').find(\'';
                                }
                                if (el.selectNodeName && el.lib) {
                                    r += '\').uselib(\'' + el.lib + '\').find(\'';
                                }
                                r = r.trim();
                                if (knownStackIndex !== stackIndex && r.length) {
                                    r = '\').closest(\'' + r + '\').find(\'';
                                }
                                if (r.length) {
                                    knownStackIndex = stackIndex;
                                }
                                return r;
                            })
                            .filter(function(v) { return v.trim().length; })
                            .join(' ');
                        })
                        .join('') +
                        '\')'
                    )
                    .replace(/.find\(\'\s*\'\)/g, '')
                    .replace(/\s+\'\)/, '\')')
                    .replace(/\(\'\s+/, '(\'')
                    .replace(/^\s*\(\'\s*\'\)\.uselib/, 'uselib');
                return r;
            };
            scope.toggleSearch = function() {
                scope.searchVisible = ! scope.searchVisible;
                if (! scope.searchVisible) {
                    searchInProgress = false;
                    window.scrollTo(0, rememberedScrollPositionBeforeSearch);
                    $('#dashboardMessage').hide();
                    if (timeouts.refreshPointer) {
                        clearTimeout(timeouts.refreshPointer);
                        timeouts.refreshPointer = false;
                    }
                }
            };
            scope.textareaKeyUp = function($event){
                if ($event.keyCode === 27) {
                    scope.toggleSearch();
                }
            };
            scope.highlight = function(button) {
                highlightingSearchedElement = true;
                if (scope.stacks[0][button.getAttribute('data-index')].lib) {
                    cfMessage.send('highlightElementForQueryBuilder', {lib: scope.stack[button.getAttribute('data-index')].lib, currentMainFrameWindow: scope.window});
                } else {
                    var payload = [];
                    for (var i = 0 ; i <= button.getAttribute('data-index'); i ++) {
                        var node = scope.stacks[0][i];
                        if (scope.stacks[0][i].element) {
                            payload.push([node.element, node.index - 1]);
                        }
                    }
                    cfMessage.send('highlightElementForQueryBuilder', {path: payload, currentMainFrameWindow: scope.window});
                }
            };
            scope.unhighlight = function() {
                highlightingSearchedElement = false;
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
                if ($scope.chooseJobState) {
                    $scope.chooseJob();
                    $scope.$digest();
                }
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
                if ($scope.chooseJobState) {
                    $scope.chooseJob();
                    $scope.$digest();
                }
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
                        if ('[' === value.substr(0, 1) && ']' === value.substr(-1, 1)) {
                            try {
                                value = JSON.parse(value);
                            } catch (e) {}
                        }
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
            return '\n        ' + jsStringify(result) + ',';
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
                if ('_' === name.substr(0, 1)) {
                    alert('you can\'t update this variable');
                    return;
                }
                var newValue = promptWithJsonWorkaround('Enter new value for [' + name + ']', 'object' === typeof $scope.workerGlobals[name] ? JSON.stringify($scope.workerGlobals[name]) : $scope.workerGlobals[name]);
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
            var recording = cfAudioService.toggle(button[0], $scope.jobName, $scope.currentTask, $scope.currentStep, function(recording) {
                if (recording) {
                    $('#dashboardMessage').show().text('RECORDING HAS STARTED');
                } else {
                    $('#dashboardMessage').hide();
                }
            });
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
