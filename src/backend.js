var argv = require('yargs')
    .help('help')
    .usage('Usage: $0 [options] <cartFiller url> [test file(s) or path(s)]\n<testsuite url> is the URL where cartFiller is installed inside your project, it should end with .../dist/ or .../src/ if you are going to debug cartFiller')
    .demand(1, 'Please specify testsuite URL')
    .describe('suite', 'testsuite name to run, default = root testsuite (all tests)')
    .alias('s', 'suite')
    .describe('browser', 'name of browser to use, eg chrome or firefox, default = default OS browser')
    .alias('b', 'browser')
    .describe('editor', 'launch interactive editor mode (test(s) will not be auto run)')
    .alias('e', 'editor')
    .describe('root', 'root URL to discover cartfiller.json')
    .alias('r', 'root')
    .argv;
var express = require('express');
var open = require('open');
var app = express();
var http = require('http');
var crypto = require('crypto');

var stats = {
    totalTests: 0,
    totalAssertions: 0,
    successfulTests: 0,
    successfulAssertions: 0,
    failedTests: 0,
    failedAssertions: 0
};

var sessionKey = crypto.randomBytes(20).toString('hex');

app.get('/', function (req, res) {
  res.send('<!DOCTYPE html><html><head></head><body><pre>Hello, this is cartFiller backend, you should not ever interact with it directly, here are current stats: ' + JSON.stringify(stats, null, 4) + '</pre></body></html>');
});

app.post('/sessionKey/progress', function () {
});

app.post('/sessionKey/save', function () {
});

var server;
var port = 3000;
var browserProcess = false;
var launchServer = function() {
    server = http.createServer(app);
    server
        .listen(port, '127.0.0.1', function(err){
            if (! err) {
                console.log('Launched successfully on port ' + port);
                launchBrowser(argv._[0], argv.browser, 'http://localhost:' + port, argv.editor, argv.root);
            }
        })
        .on('error', function() {
            console.log('No luck with port ' + port + ' going to try ' + (port + 1));
            port ++;
            if (port >= 65535) {
                console.log('no more chances, exitting');
            } else {
                launchServer();
            }
        });
};

var launchBrowser = function(url, browser, backendUrl, editor, root) {
    var args = [];
    args.push('backend=' + encodeURIComponent(backendUrl));
    args.push('key=' + encodeURIComponent(sessionKey));
    if (editor) {
        args.push('editor=1');
    }
    if (root) {
        args.push('root=' + encodeURIComponent(root));
    }
    url = url + (-1 === url.indexOf('?') ? '?' : '&') + args.join('&');
    console.log('Launching ' + (argv.browser ? argv.browser : 'default browser') + ' with URL: ' + url);
    browserProcess = open(url, argv.browser);
};

launchServer();

