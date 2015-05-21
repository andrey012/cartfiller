var app = angular.module('cartFillerApp', ['ngRoute', 'ngResource'])
.controller('indexController', function ($scope, $rootScope, $http, cfMessage){
    $scope.steps = [{name:1}, {name:2}];
    $scope.chooseJobState = false;
    $scope.toggleSize = function(){
        cfMessage.send('toggleSize');
    };
    $scope.chooseJob = function(){
        $scope.chooseJobState = !$scope.chooseJobState;
        cfMessage.send($scope.chooseJobState ? 'chooseJob' : 'chooseJobCancel');
    }
    $scope.jobDetails = [];
    $scope.jobTaskProgress = [];
    cfMessage.register(function(cmd, details){
        if (cmd == 'jobDetails'){
            cfMessage.send('makeSmaller');
            $scope.chooseJobState = false;
            $scope.jobDetails = details.details;
            $scope.jobTitleMap = angular.isUndefined(details.titleMap) ? [] : details.titleMap;
            angular.forEach(details.details, function(){$scope.jobTaskProgress.push({complete: false})});
        }
    });
    $scope.selectTask = function(index){
        for (var i = 0; i < index; i ++){
            $scope.jobTaskProgress[i].complete = true;
        }
    }
    $scope.toggleTaskProgress = function(index){
        $scope.jobTaskProgress[index].complete = !$scope.jobTaskProgress[index].complete;
        return false;
    }
});