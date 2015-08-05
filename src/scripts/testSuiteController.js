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
        $scope.params = {};
        angular.forEach((window.location.href.split('?')[1] || '').split('#')[0].split('&'), function(v) {
            var pc = v.split('=');
            $scope.params[decodeURIComponent(pc[0])] = decodeURIComponent(pc[1]);
        });
        console.log($scope.params);
        $scope.discovery = {
            state: 0,
            currentRootPath: $scope.params.root ? $scope.params.root : window.location.href.split('?')[0].replace(/\/[^\/]*/, '/'),
            visitedRootPaths: [],
            rootCartfillerJson: {},
            scripts: {
                flat: [],
                currentDownloadingIndex: false,
                contents: [],
                enabled: [],
                success: []
            }
        };
        $scope.runningAll = false;
        $scope.runAll = function () {
            $scope.runningAll = true;
            if ($scope.discovery.scripts.contents.length) {
                $scope.runTest(0);
            }
        };
        $scope.stopRunningAll = function() {
            $scope.runningAll = false;
        };
        var flattenCartfillerJson = function(json, r) {
            var i;
            var pc;
            var rr;
            r = r || [];
            for (i in json) {
                rr = r.filter(function(){return 1;});
                rr.push(i);
                if ('object' === typeof json[i]) {
                    pc = flattenCartfillerJson(json[i], rr);
                } else {
                    $scope.discovery.scripts.flat.push(rr);
                    $scope.discovery.scripts.enabled.push(json[i]);
                }
            }
        };
        var discoverNextRootURL = function(){
            $.ajax({
                url: $scope.discovery.currentRootFile = $scope.discovery.currentRootPath.replace(/\/$/, '') + '/cartfiller.json', 
                complete: function(xhr) {
                    if ($scope.discovery.state === 0) {
                        $scope.errorURL = false;
                        if (xhr.status === 200) {
                            try {
                                $scope.discovery.rootCartfillerJson = JSON.parse(xhr.responseText);
                                $scope.discovery.workerSrc = normalizeWorkerURLs($scope.discovery.rootCartfillerJson.worker, $scope.discovery.currentRootPath);
                                $scope.discovery.state = 1;
                                $scope.discovery.scripts.flat = [];
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
                                .push($scope.discovery.currentRootpath);
                            if (pc.length < 3) {
                                $scope.discovery.state = -1;
                                $scope.discovery.error = 'cartfiller.json was not found, visited: ' + $scope.discovery.visitedRootPaths.join(', ');
                                $scope.discovery.currentRootFile = false;
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
            } else {
                // let's download next file
                $.ajax({
                    url: $scope.discovery.currentDownloadedTestURL = $scope.discovery.currentRootPath.replace(/\/$/, '') + '/' + $scope.discovery.scripts.flat[$scope.discovery.scripts.currentDownloadingIndex].join('/').replace(/\.json$/, '') + '.json',
                    complete: function(xhr) {
                        $scope.errorURL = false;
                        if (xhr.status === 200) {
                            try {
                                $scope.discovery.scripts.contents[$scope.discovery.scripts.currentDownloadingIndex] = JSON.parse(xhr.responseText);
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
        $scope.runTest = function(index) {
            var test = $scope.discovery.scripts.contents[index];
            test.workerSrc = $scope.discovery.workerSrc;
            test.autorun = 1;
            test.rootCartfillerPath = $scope.discovery.currentRootPath;
            $.cartFillerPlugin(
                test,
                function(data) {
                    data;
                    console.log(1);
                },
                function(data) {
                    if (data.completed) {
                        $scope.discovery.scripts.success[index] = 0 === data.result.filter(function(r){return ! r.complete;}).length ? 1 : -1;
                        if ($scope.runningAll && index + 1 < $scope.discovery.scripts.contents.length) {
                            $scope.runTest(index + 1);
                        } else {
                            $scope.runningAll = false;
                            $.cartFillerPlugin.showChooseJobFrame();
                        }
                        $scope.$digest();
                    } else if (! data.running) {
                        $scope.runningAll = false;
                        $scope.$digest();
                    }
                }
            );
        };
    }]);
});