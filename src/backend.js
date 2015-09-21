var argv = require('yargs')
    .help('help')
    .usage('Usage: $0 [options] <cartFiller url> [test file(s) or path(s)]\n<testsuite url> is the URL where cartFiller is installed inside your project, it should end with .../dist/ or .../src/ if you are going to debug cartFiller. Note, that if --serve-http is used then port will be automatically added to this url.')
    .demand(1, 'Please specify testsuite URL')
    .describe('suite', 'testsuite name to run, default = root testsuite (all tests)')
    .alias('s', 'suite')
    .describe('browser', 'name of browser to use, eg chrome or firefox, default = default OS browser')
    .alias('b', 'browser')
    .describe('editor', 'launch interactive editor mode (test(s) will not be auto run)')
    .alias('e', 'editor')
    .describe('root', 'root URL to discover cartfiller.json. Note, that if --serve-http is used then port will be automatically added to this url.')
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
    .alias('w', 'wait')
    .describe('wait', 'seconds to wait before tests will be launched, used for browser to settle and stabilize, etc')
    .alias('v', 'video')
    .describe('record video using ffmpeg into this file (works only with phantomjs')
    .describe('serve-http', 'start another local static http server, which will serve files from this directory')
    .describe('serve-http-port', 'default http port to bind static http server to')
    .argv;
var express = require('express');
var open = require('open');
var app = express();
var serveHttpApp = express();
var http = require('http');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ extended: true }));
var isPhantomJs = ('string' === typeof argv.browser) && (-1 !== argv.browser.indexOf('phantomjs'));

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

var ffmpegProcess;

app.get('/', function (req, res) {
  res.send('<!DOCTYPE html><html><head></head><body><pre>Hello, this is cartFiller backend, you should not ever interact with it directly, here are current stats: ' + JSON.stringify(stats, null, 4) + '</pre></body></html>');
});

app.post('/progress/' + sessionKey, function (req, res) {
    pulseTime = (new Date()).getTime();
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.body.result !== 'ok') {
        failures.push(req.body);
    }
    console.log((req.body.result + '       ').substr(0,8) + (new Date()) + '  ' + req.body.test + ', task ' + (parseInt(req.body.task) + 1) + ': ' + req.body.taskName + ', step ' + (parseInt(req.body.step) + 1) + ': result = ' + req.body.result);
    res.end();
});

var tearDownFn = function(code) {
    var cmds;
    var waterfall = [];
    if (isPhantomJs) {
        waterfall.push(function() {
            console.log('killing child process');
            browserProcess.on('close', function() {
                waterfall.shift();
                waterfall[0]();
            });
            browserProcess.kill();
        });
    }
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
    if (ffmpegProcess) {
        waterfall.push(function() {
            console.log('killing ffmpeg process');
            ffmpegProcess.on('close', function() {
                waterfall.shift();
                waterfall[0]();
            });
            ffmpegProcess.kill();
        });
    }
    waterfall.push(function(){
        process.exit(code);
    });
    waterfall[0]();
};


setInterval(function() {
    if (pulseTime < ((new Date()).getTime() - timeout)) {
        console.log('exitting with code 1 because there was no activity over recent ' + (timeout / 1000 ) + ' seconds');
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
var serveHttpPort = argv['serve-http-port'] ? argv['serve-http-port'] : 3001;
var serveHttpServer;
var browserProcess = false;
var childApp = false;

var startup = [];

startup.push(function() {
    server = http.createServer(app);
    server
        .listen(port, '127.0.0.1', function(err){
            if (! err) {
                console.log('Launched successfully on port ' + port);
                startup.shift();
                startup[0]();
            }
        })
        .on('error', function() {
            console.log('No luck with port ' + port + ' going to try ' + (port + 1));
            port ++;
            if (port >= 65535) {
                console.log('no more chances, exitting');
            } else {
                startup[0]();
            }
        });
});

if (argv['serve-http']) {
    serveHttpApp.use(express.static(argv['serve-http']));
    startup.push(function() {
        serveHttpServer = http.createServer(serveHttpApp);
        serveHttpServer
            .listen(serveHttpPort, '127.0.0.1', function(err){
                if (! err) {
                    console.log('ServeHttp launched successfully on port ' + serveHttpPort);
                    startup.shift();
                    startup[0]();
                }
            })
            .on('error', function() {
                console.log('No luck with port ' + serveHttpPort + ' going to try ' + (serveHttpPort + 1));
                serveHttpPort ++;
                if (serveHttpPort >= 65535) {
                    console.log('no more chances, exitting');
                } else {
                    startup[0]();
                }
            });
    });
}


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
    setTimeout(function() {
        startup.shift();
        startup[0]();
    }, 4000); //// TBD make this more predictable
}

var injectPortIntoUrl = function(url, port) {
    var pc = url.split('/');
    pc[2] = pc[2].replace(/\:\d+$/, '') + ':' + port;
    return pc.join('/');
};

var ffmpegWarmup = true;
var ffmpegWarmedUp = function() {
    if (ffmpegWarmup) {
        ffmpegWarmup = false;
        startup.shift();
        startup[0]();
    }
};

if (0 && argv.video) {
    startup.push(function() {
        ffmpegProcess = childProcess.spawn('ffmpeg', ['-c:v', 'png', '-f', 'image2pipe', '-r', '25', '-t', '10', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', argv.video]);

        ffmpegProcess.stdout.on('data', function(data) { console.log('ffmpeg stdout: ' + data); ffmpegWarmedUp(); });
        ffmpegProcess.stderr.on('data', function(data) { console.log('ffmpeg stderr: ' + data); ffmpegWarmedUp(); });
    });
}

startup.push(function() {
    var url = argv._[0];
    if (argv['serve-http']) {
        url = injectPortIntoUrl(url, serveHttpPort);
    }
    var backendUrl = 'http://127.0.0.1:' + port;
    var editor = argv.editor;
    var root = argv.root;
    var wait = argv.wait;
    var args = [];
    args.push('backend=' + encodeURIComponent(backendUrl));
    args.push('key=' + encodeURIComponent(sessionKey));
    if (editor) {
        args.push('editor=1');
    }
    if (root) {
        if (argv['serve-http']) {
            root = injectPortIntoUrl(root, serveHttpPort);
        }
        args.push('root=' + encodeURIComponent(root));
    }
    if (wait) {
        args.push('wait=' + wait);
    }
    url = -1 === url.indexOf('?') ? (url + '?' + (new Date()).getTime()) : (url.replace('?', '?' + (new Date()).getTime() + '&'));
    url = url + (-1 === url.indexOf('#') ? '#' : '&') + args.join('&');
    if (isPhantomJs) {
        var childArgs;
        if (argv.video) {
            var cmd = argv.browser + ' --web-security=false ' + __dirname + '/phantomjs.js --video \'' + url + '\' | ffmpeg -c:v png -f image2pipe -r 25 -t 10 -i - -c:v libx264 -pix_fmt yuv420p -movflags +faststart -y ' + argv.video;
            console.log('Launching ' + cmd);
            browserProcess = childProcess.exec(cmd);
            browserProcess.stdout.on('data', function(data) { console.log('PhantomJs stdout: ' + data); });
            browserProcess.stderr.on('data', function(data) { console.log('PhantomJs stderr: ' + data); });
        } else {
            childArgs = ['--web-security=false', __dirname + '/phantomjs.js'];
            if (ffmpegProcess) {
                childArgs.push('--video');
            }
            childArgs.push(url);
            console.log('Launching ' + (argv.browser) + ' ' + childArgs.join(' '));
            browserProcess = childProcess.spawn(argv.browser, childArgs);
            if (ffmpegProcess) {
                console.log('piping');
                browserProcess.stdout.pipe(ffmpegProcess.stdin);
            }
            browserProcess.stdout.on('close', function() {
                console.log('close');
            });
            browserProcess.stdout.on('drain', function() {
                console.log('drain');
            });
            browserProcess.stdout.on('error', function() {
                console.log('error');
            });
            browserProcess.stdout.on('finish', function() {
                console.log('finish');
            });
            browserProcess.stdout.on('pipe', function() {
                console.log('pipe');
            });
            browserProcess.stdout.on('unpipe', function() {
                console.log('unpipe');
            });
            browserProcess.stdout.on('data', function(data) { 
                console.log('PhantomJs stdout: ' + data); 
            });
            browserProcess.stderr.on('data', function(data) { console.log('PhantomJs stderr: ' + data); });
        }
    } else {
        console.log('Launching ' + (argv.browser ? argv.browser : 'default browser') + ' with URL: ' + url);
        browserProcess = open(url, argv.browser);
    }
});

startup[0]();


