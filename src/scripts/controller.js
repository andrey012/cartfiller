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

        $scope.chooseJobState = false;
        $scope.toggleSize = function(){
            cfMessage.send('toggleSize');
        };
        $scope.chooseJob = function(){
            $scope.chooseJobState = !$scope.chooseJobState;
            cfMessage.send($scope.chooseJobState ? 'chooseJob' : 'chooseJobCancel');
        };
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
        $scope.awaitingForFinish = false;
        $scope.runUntilTask = $scope.runUntilStep = false;
        var autorunSpeed;
        var mouseDownTime;
        var isLongClick = function(){
            return ((new Date()).getTime() - mouseDownTime) > 1000;
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
            if ($scope.workersLoaded === $scope.workersCounter) {
                $scope.runNoWatch(autorunSpeed === 'slow' ? true : false, null, true, true);
            } else {
                // wait some more time
                setTimeout(autorun, 1000);
            }
        };
        cfMessage.register(function(cmd, details){
            if (cmd === 'jobDetails'){
                $scope.$apply(function(){
                    cfMessage.send('makeSmaller');
                    $scope.chooseJobState = false;
                    $scope.jobDetails = details.details;
                    $scope.jobTitleMap = angular.isUndefined(details.titleMap) ? [] : details.titleMap;
                    $scope.jobTaskProgress = [];
                    $scope.jobTaskStepProgress = [];
                    $scope.currentTask = 0;
                    $scope.currentStep = 0;
                    scrollCurrentTaskIntoView(true);

                    angular.forEach(details.details, function(){
                        $scope.jobTaskProgress.push({complete: false, step: 0, stepsInProgress: {}, stepResults: {}});
                    });
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
                if ($scope.running){
                    if (proceed){
                        setTimeout(function(){
                            $scope.doNextStep();
                        }, (($scope.running === 'slow') && (true !== details.nop)) ? 2000 : 0);
                    } else {
                        $scope.running = false;
                    }
                }
                cfMessage.send(
                    'sendStatus', 
                    {
                        result: $scope.jobTaskProgress, 
                        tasks: $scope.jobDetails,
                        currentTaskIndex: details.index, 
                        currentTaskStepIndex: details.step,
                        running: $scope.running,
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
            }
        });
        $scope.incrementCurrentStep = function(skip, nextTaskFlow){
            $scope.currentStep ++;
            if (skip || nextTaskFlow === 'skipTask' || nextTaskFlow === 'repeatTask' || $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length <= $scope.currentStep){
                $scope.currentStep = 0;
                if (nextTaskFlow !== 'repeatTask') {
                    $scope.currentTask ++;
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
                digestTask($scope.currentTask - 1);
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
        $scope.clickOnStepNoWatch = function(element, $event){
            var s = element.getAttribute('id').split('_');
            var taskIndex = parseInt(s[1]);
            var stepIndex = parseInt(s[2]);
            if ($scope.awaitingForFinish) {
                $scope.runUntilTask = taskIndex;
                $scope.runUntilStep = stepIndex;
                run($scope.awaitingForFinish === 'slow');
                $scope.awaitingForFinish = false;
            } else {
                $scope.runUntilTask = $scope.runUntilStep = false;
                $scope.currentTask = taskIndex;
                $scope.currentStep = stepIndex;
                var debug = isLongClick();
                $scope.invokeWorker(taskIndex, stepIndex, debug);
            }
            $event.stopPropagation();
            cfMessage.send('focusMainFrameWindow');
            return false;
        };
        $scope.invokeWorker = function(taskIndex, stepIndex, debug){
            $scope.jobTaskProgress[taskIndex].stepsInProgress[stepIndex] = true;
            var details = $scope.jobDetails[taskIndex];
            var taskName = details.task;
            $scope.workerInProgress = true;
            cfMessage.send('invokeWorker', {index: taskIndex, task: taskName, step: stepIndex, details: details, debug: debug});
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
        $scope.runNoWatch = function(slow, $event, ignoreMouseDown, fromAutorun){
            if (! ignoreMouseDown && isLongClick()) {
                $scope.awaitingForFinish = slow ? 'slow' : true;
                digestButtonPanel();
            } else {
                $scope.awaitingForFinish = false;
                if (! fromAutorun) {
                    $scope.runUntilTask = $scope.runUntilStep = false;
                }
                run(slow);
            }
            if ($event) {
                $event.stopPropagation();
            }
            return false;
        };
        $scope.cancelRunUntil = function($event) {
            $scope.awaitingForFinish = false;
            digestButtonPanel();
            if ($event) {
                $event.stopPropagation();
            }
            return false;
        };
        $scope.stopNoWatch = function($event){
            $scope.runUntilTask = $scope.runUntilStep = false;
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
            $scope.runUntilTask = $scope.runUntilStep = false;
            $scope.doNextStep(); 
            $event.stopPropagation();
            cfMessage.send('focusMainFrameWindow');
            digestButtonPanel();
            return false;
        };
        $scope.loadWorker = function(url){
            if (undefined === url) {
                url = $scope.workerSrc;
            }
            var urls;
            if ('string' === typeof url) {
                urls = [url];
            } else {
                urls = url;
            }
            angular.forEach(urls, function(url) {
                if (/\?/.test(url)){
                    url += '&';
                } else {
                    url += '?';
                }
                url += (new Date()).getTime();
                var xhr = new XMLHttpRequest();
                xhr.onload = function(){
                    cfMessage.send('loadWorker', {code: xhr.response, src: url});

                };
                xhr.open('GET', url, true);
                xhr.send();
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
        $scope.mouseDown = function() {
            mouseDownTime = (new Date()).getTime();
        };
        $scope.getWorkerGlobalValue = function(name) {
            var v = $scope.workerGlobals[name];
            return 'object' === typeof v ? JSON.stringify(v) : v;
        };
    }]);
});