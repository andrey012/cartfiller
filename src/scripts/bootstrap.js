define('bootstrap', ['app', 'controller', 'cfMessageService', 'testSuiteController'], function(){
    return angular.bootstrap(document, ['cartFillerApp']);
});