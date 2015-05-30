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
define('bootstrap', ['app', 'controller', 'cfMessageService'], function(){
    return angular.bootstrap(document, ['cartFillerApp']);
});
define('controller', ['app', 'scroll'], function(app){
    'use strict';
    app
    .controller('indexController', ['$scope', 'cfMessage', '$timeout', 'cfDebug', 'cfScroll', function ($scope, cfMessage, $timeout, cfDebug, cfScroll){
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
        $scope.running = false;
        $scope.workerInProgress = false;
        $scope.currentTask = 0;
        $scope.currentStep = 0;
        $timeout(function(){$scope.chooseJob();}, 0);
        $scope.debugEnabled = parseInt(cfDebug.debugEnabled);
        $scope.workerSrc = false;
        $scope.finishReached = false;
        cfMessage.register(function(cmd, details){
            if (cmd === 'jobDetails'){
                cfMessage.send('makeSmaller');
                $scope.chooseJobState = false;
                $scope.jobDetails = details.details;
                $scope.jobTitleMap = angular.isUndefined(details.titleMap) ? [] : details.titleMap;
                $scope.jobTaskProgress = [];
                $scope.jobTaskStepProgress = [];

                angular.forEach(details.details, function(){
                    $scope.jobTaskProgress.push({complete: false, step: 0, stepsInProgress: {}, stepResults: {}});
                });
                var workerSrc = '';
                if (('string' === typeof details.workerSrc) && (details.workerSrc.length > 0)) {
                    workerSrc = details.workerSrc;
                }
                if (('string' === typeof details.overrideWorkerSrc) && (details.overrideWorkerSrc.length > 0)){
                    workerSrc = details.overrideWorkerSrc;
                }
                $scope.workerSrc = '';
                if (workerSrc){
                    $scope.loadWorker(workerSrc);
                } else {
                    alert('Worker script not specified in job description');
                }
            } else if (cmd === 'workerRegistered'){
                $scope.jobTaskDescriptions = details.jobTaskDescriptions;
                $scope.workerSrc = details.src;
            } else if (cmd === 'workerStepResult'){
                $scope.jobTaskProgress[details.index].stepsInProgress[details.step] = false;
                $scope.jobTaskProgress[details.index].stepResults[details.step] = {status: details.status, message: details.message};
                $scope.jobTaskProgress[details.index].complete = $scope.updateTaskCompleteMark(details.index);
                var proceed;
                if ('ok' === details.status){
                    $scope.incrementCurrentStep();
                    proceed = true;
                } else if ('skip' === details.status){
                    $scope.incrementCurrentStep(true);
                    proceed = true;
                } else {
                    proceed = false;
                }
                if ($scope.running){
                    if (proceed){
                        $timeout(function(){
                            $scope.doNextStep();
                        }, (($scope.running === 'slow') && (true !== details.nop)) ? 2000 : 0);
                    } else {
                        $scope.running = false;
                    }
                }
                $scope.workerInProgress = false;
            }
        });
        $scope.incrementCurrentStep = function(skip){
            $scope.currentStep ++;
            if (skip || $scope.jobTaskDescriptions[$scope.jobDetails[$scope.currentTask].task].length <= $scope.currentStep){
                $scope.currentStep = 0;
                $scope.currentTask ++;
                if ($scope.currentTask >= $scope.jobDetails.length){
                    $scope.finishReached = true;
                    setTimeout(function(){
                        cfScroll(jQuery('#finishReached')[0]);
                    },0);
                }
            }
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
        $scope.selectTaskInput = function(index, $event){
            $event.target.select();
            $event.stopPropagation();
            ////$scope.selectTask(index);
        };
        $scope.clickOnStep = function(taskIndex, stepIndex, $event){
            $scope.currentTask = taskIndex;
            $scope.currentStep = stepIndex;
            $scope.invokeWorker(taskIndex, stepIndex);
            $event.stopPropagation();
            return false;
        };
        $scope.invokeWorker = function(taskIndex, stepIndex){
            $scope.jobTaskProgress[taskIndex].stepsInProgress[stepIndex] = true;
            var details = $scope.jobDetails[taskIndex];
            var taskName = details.task;
            $scope.workerInProgress = true;
            cfMessage.send('invokeWorker', {index: taskIndex, task: taskName, step: stepIndex, details: details});
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
        $scope.run = function(slow, $event){
            $scope.running = slow ? 'slow' : true;
            $scope.doNextStep();
            $event.stopPropagation();
            return false;
        };
        $scope.stop = function($event){
            $event.stopPropagation();
            $scope.running = false;
            return false;
        };
        $scope.doNextStep = function(){
            if ($scope.currentTask < $scope.jobDetails.length){
                var taskDiv = jQuery('#jobDetails > div:nth-child(' + ($scope.currentTask + 1) + ')');
                cfScroll(taskDiv[0]);
                $scope.invokeWorker($scope.currentTask, $scope.currentStep);
            } else {
                $scope.running = false;
            }
        };
        $scope.resetWorker = function(){
            cfMessage.send('resetWorker');
            $scope.workerInProgress = false;
        };
        $scope.clickOnNextStep = function($event){
            $scope.doNextStep(); 
            $event.stopPropagation();
            return false;
        };
        $scope.loadWorker = function(url){
            if (undefined === url) {
                url = $scope.workerSrc;
            }
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


        };
        $scope.reloadWorker = function($event){
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
    }]);
});
(function(undefined) {
    var injector;
    window.addEventListener('message', function(event){
        var test = /^cartFillerMessage:(.*)$/.exec(event.data);
        if (test){
            var message = JSON.parse(test[1]);
            if (message.cmd === 'bootstrap') {
                require.config({
                    paths: {
                        'angular': message.lib + '/angular/angular.min',
                        'angular-route': message.lib + '/angular-route/angular-route.min',
                        'jquery': message.lib + '/jquery/dist/jquery.min',
                        'bootstraptw': message.lib + '/bootstrap/dist/js/bootstrap.min',
                    },
                    shim: {
                        'angular' : {exports: 'angular', deps: ['jquery', 'bootstraptw']},
                        'angular-route': ['angular'],
                        'bootstraptw': ['jquery'],
                    },
                    deps: ['bootstrap'],
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
                                details.cmd = cmd; event.source.postMessage('cartFillerMessage:' + JSON.stringify(details), '*');
                            },
                            receive: function(cmd, details) {
                                angular.forEach(postMessageListeners, function(listener){
                                    listener(cmd, details);
                                });
                            },
                            register: function(cb){
                                postMessageListeners.push(cb);
                            }
                        };
                    });
                });
                require(['bootstrap'], function(app){
                    injector = app;
                });
            } else {
                if ('object' === typeof injector){
                    injector.invoke(['cfMessage', '$rootScope', function(cfMessage, $rootScope){
                        $rootScope.$apply(function(){
                            cfMessage.receive(message.cmd, message);
                        });
                    }]);
                }
            }
        }
    }, false);

    window.parent.postMessage('cartFillerMessage:{"cmd":"register"}', '*');
})();

define('scroll', ['app', 'scroll'], function(app){
    app.service('cfScroll', function(){
        return function(element){
            var rect = element.getBoundingClientRect();
            var bottom = window.innerHeight;
            var delta = rect.bottom - bottom;
            window.scrollBy(0, delta);
        };
    });
});