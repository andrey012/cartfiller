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
});