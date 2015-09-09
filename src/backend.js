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
    .describe('app', 'run child application during running testsuite')
    .alias('a', 'app')
    .describe('cwd', 'cwd for child application')
    .alias('c', 'cwd')
    .describe('port', 'find nearest port starting with this one, default = 3000')
    .alias('p', 'port')
    .describe('tear-down', 'commands to be executed on exit - for example to kill browser process, can be used several times - one for each command')
    .alias('t', 'tear-down')
    .describe('timeout', 'exit with error code 1 if no activity happens for specified time (seconds), default 60')
    .argv;
var express = require('express');
var open = require('open');
var app = express();
var http = require('http');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ extended: true }));

var stats = {
    totalTests: 0,
    totalAssertions: 0,
    successfulTests: 0,
    successfulAssertions: 0,
    failedTests: 0,
    failedAssertions: 0
};

var timeout = argv.timeout ? (argv.timeout * 1000) : 60000;
console.log('timeout set to ' + (timeout / 1000) + ' seconds');

var sessionKey = crypto.randomBytes(20).toString('hex');
var failures = [];
var pulseTime = (new Date()).getTime();

app.get('/', function (req, res) {
  res.send('<!DOCTYPE html><html><head></head><body><pre>Hello, this is cartFiller backend, you should not ever interact with it directly, here are current stats: ' + JSON.stringify(stats, null, 4) + '</pre></body></html>');
});

app.post('/progress/' + sessionKey, function (req, res) {
    pulseTime = (new Date()).getTime();
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.body.result !== 'ok') {
        failures.push(req.body);
    }
    console.log(req.body.test + ', task ' + (parseInt(req.body.task) + 1) + ': ' + req.body.taskName + ', step ' + (parseInt(req.body.step) + 1) + ': result = ' + req.body.result);
    res.end();
});

var tearDownFn = function(code) {
    var cmds;
    var waterfall = [];
    if (argv['tear-down']) {
        if (argv['tear-down'] instanceof Array) {
            cmds = argv['tear-down'];
        } else {
            cmds = [argv['tear-down']];
        }
        var tearDownStepFn = function(cmd){
            waterfall.push(function(){
                console.log('teardown: ' + cmd);
                var cp = childProcess.spawn(cmd.split(' ')[0], cmd.split(' ').slice(1), {cwd: argv.cwd, shell: true});
                cp.stdout.on('data', function(data) { console.log('teardown stdout: ' + data); });
                cp.stderr.on('data', function(data) { console.log('teardown stderr: ' + data); });
                cp.on('close', function() {
                    waterfall.shift();
                    waterfall[0]();
                });
            });
        };
        for (var i = 0; i < cmds.length; i++){
            tearDownStepFn(cmds[i]);
        }
    }
    waterfall.push(function(){
        process.exit(code);
    });
    waterfall[0]();
};


setInterval(function() {
    if (pulseTime < ((new Date()).getTime() - timeout)) {
        console.log('exitting with code 1 because there was no activity over recent 60 seconds');
        if (childApp) {
            childApp.kill();
        }
        tearDownFn(1);
    }
}, 1000);


app.get('/finish/' + sessionKey, function (req, res) {
    pulseTime = (new Date()).getTime();
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log('finish');
    if (failures.length) {
        console.log('failure: ');
        console.log(failures);
    } else {
        console.log('no failures');
    }
    var exitFn = function(){
        setTimeout(function() {
            var code = failures.length ? 1 : 0;
            console.log('exitting with return code ' + code);
            tearDownFn(code);
        }, 0);
    };
    if (childApp) {
        childApp.removeAllListeners('close');
        childApp.on('close', exitFn);
        childApp.kill();
    } else {
        exitFn();
    }
    res.end();
});

app.post('/save/' + sessionKey, function () {
});

var server;
var port = argv.port ? argv.port : 3000;
var browserProcess = false;
var childApp = false;

var launchServer = function() {
    server = http.createServer(app);
    server
        .listen(port, '127.0.0.1', function(err){
            if (! err) {
                console.log('Launched successfully on port ' + port);
                var launchBrowserFn = function() {
                    launchBrowser(argv._[0], argv.browser, 'http://localhost:' + port, argv.editor, argv.root);
                };
                if (argv.app) {
                    console.log('Launching application: ' + argv.app);
                    childApp = childProcess.spawn(argv.app.split(' ')[0], argv.app.split(' ').slice(1), {cwd: argv.cwd});
                    childApp.stdout.on('data', function(data) {
                        console.log('app stdout: ' + data);
                    });
                    childApp.stderr.on('data', function(data) {
                        console.log('app stderr: ' + data);
                    });
                    childApp.on('close', function(code) {
                        console.log('exitting, because child process exitted with code ' + code);
                        tearDownFn(code ? code : 1);
                    });
                    setTimeout(launchBrowserFn, 4000); //// TBD make this more predictable
                } else {
                    launchBrowserFn();
                }
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
    url = url + (-1 === url.indexOf('#') ? '#' : '&') + args.join('&');
    console.log('Launching ' + (argv.browser ? argv.browser : 'default browser') + ' with URL: ' + url);
    browserProcess = open(url, argv.browser);
};

launchServer();

