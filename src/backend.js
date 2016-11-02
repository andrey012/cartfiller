'use strict';
var PHANTOM_DEFAULT_ARGS = ['--web-security=false', '--ignore-ssl-errors=true'];
var PHANTOM_COMMAND_SUBSTRING = 'phantomjs';
var yargs = require('yargs');
var argv = yargs
    .help('help')
    .wrap(yargs.terminalWidth())
    .usage('\nUsage: $0 [options] <cartFiller url> [test file(s) or path(s)]\n\n        <cartFiller url> is the URL where cartFiller is installed inside your project, it should normally end with .../dist/index.html, e.g.\n\n            nodejs src/backend.js \\\n            http://localhost/myProject/tests/cartfiller/dist/index.html\n\n        You can specify - as cartfiller url in order to run just a plain http server. E.g.\n\n            nodejs src/backend.js \\\n            --serve-http=/var/www/html --serve-http-port=8080 -\n\n        Note, that if --serve-http is used then port specified by --serve-http-port will be automatically added to the <cartFiller url>. For example if you launch\n\n            nodejs src/backend.js \\\n            --serve-http=/var/www/html --serve-http-port=8080\\\n            http://localhost/myProject/tests/cartfiller/dist/index.html\n\n        then following url will be opened in browser:\n\n            http://localhost:8080/myProject/tests/cartfiller/dist/index.html')
    .demand(1, 'Please specify testsuite URL')
    .describe('suite', 'testsuite name to run, default = root testsuite (all tests)')
    .alias('s', 'suite')
    .describe('test', 'test to run, by default runs all tests')
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
    .describe('video', 'record video using ffmpeg into this file (works only with phantomjs')
    .alias('f', 'frames')
    .describe('frames', 'save frames to subfolders of this folder for each test to build a video')
    .describe('serve-http', 'start another local static http server, which will serve files from this directory. Cartfiller binaries will be served through /cartfillerFiles/ e.g.\n        http://localhost:3213/cartfillerFiles/dist/index.html')
    .describe('serve-http-port', 'default http port to bind static http server to')
    .describe('phantomjs-auth', 'Username:password for PhantomJs http authentication')
    .describe('phantomjs-render', 'filename (.png) to render page 5 seconds after launching to troubleshoot what PhantomJs is doing')
    .describe('debug-frame-folder', 'Save captured video frames to this folder')
    .describe('phantomjs-debugger-port', '')
    .describe('proxy-to', 'start another local http server that will proxy to your web application. In this case static content specified by --serve-http will automatically be served through /cartfillerTests/ url, e.g.\n        http://localhost:3213/cartfillerTests/cartfiller.js')
    .describe('proxy-to-static-folder-name')
    .boolean('https')
    .describe('https', 'use https for both test progress and serve-http/proxy-to connections')
    .describe('browser-args', 'add additional arguments when launching browser. PhantomJS args ' + PHANTOM_DEFAULT_ARGS.join(', ') + ' are automatically used when \'' + PHANTOM_COMMAND_SUBSTRING + '\' is found in browser name, useful parameters for Chrome: \n\n--browser-args=\'--ignore-certificate-errors \n --user-data-dir=/tmp/mytests-chrome-data-dir \n--no-first-run\'\nAlso in this case browser is launched as child prcess directly, without OS specific launchers, this happens if you specify empty browser-args as well (--browser-args=). No escaping supported in this argument, so aviod having spaces in browser args values, spaces are treated as parameter separators.')
    .describe('proxy-delay', 'add delay when proxying calls, ms')
    .argv;
var express = require('express');
var serveIndex = require('serve-index');
var open = require('open');
var app = express();
var serveHttpApp = express();
var http = require('http');
var https = require('https');
var httpProxy = require('http-proxy');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var childProcess = require('child_process');
var fs = require('fs');
var url = require('url');
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ extended: true }));
var isPhantomJs = ('string' === typeof argv.browser) && (-1 !== argv.browser.indexOf(PHANTOM_COMMAND_SUBSTRING));
var previousFrameBase64 = '';
var httpsOptions = {
    cert: '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAOW6zUbKURlOMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\nBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX\naWRnaXRzIFB0eSBMdGQwHhcNMTcwODIyMjM0MTIwWhcNMTcwOTIxMjM0MTIwWjBF\nMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50\nZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB\nCgKCAQEAtVpysdvhvVQz4RncxS9en0KpXYhCG/8MQEIFV+jsOQiVuVZ+FN3gUORc\nJH9DK8zIkf0e2ccE5S8gFLnbGdbLiRH4lAXCaa8Y5qWfJ6Y5TOkXmN/g03X8O3sO\n+/Xq4ImPt+mAUUaT+iWyYm+PWicJjoy0da3WRGV0bGYjneZ6qXcrAJUPFc5EqZXE\nS4oVyvTu9kfzCinqDMCmwZUMz2W9z+3+7UspqsfzysOlNBk6Bo0i0s5NJQGnbIsY\nO+b5zl4ieZW3jtqb+IvukE9Bdu7MsNDiB8woBm52qAPHPgErgs3y2waow/5vb4xq\nt7nEzGNL5FzWGw+qmmRhGU6i0U59/wIDAQABo1AwTjAdBgNVHQ4EFgQUeX7K2Pmy\nLhjbbuL8oF35LFUKji4wHwYDVR0jBBgwFoAUeX7K2PmyLhjbbuL8oF35LFUKji4w\nDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEArBIwqSfuFl12QclcoSml\nTWYFa2RfBiqhCtEEZ9Uiv30JA8TtjyEosIyX1r3DbGX+tO8V3Q6hBxrG/db3V6kH\n6Nia4N7dFlRU96yPgsPaIwF4XDsIKUsmIO4JEhoy7R98QvGwC6AAwm2aIu4Dfp/m\nEE9jdX0LQsGBGUYlIZYFDrvAXkA7MgKmLuB00zQd/2iGRZjVPnz9Zt3dx9+zyjbG\nhPStbo8UboLYrlFfrlOeh33Q+8MYzvWBgcvnTgnIVb/is/BNSSko3yOepQAx3Wm4\nX5zu27m3T6nPmdPsy/WyNXgF1bHTq8wNIb85T/UAU4XhX72IfhPr9EDsFqEsS+Wx\nnQ==\n-----END CERTIFICATE-----',
    key: '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC1WnKx2+G9VDPh\nGdzFL16fQqldiEIb/wxAQgVX6Ow5CJW5Vn4U3eBQ5Fwkf0MrzMiR/R7ZxwTlLyAU\nudsZ1suJEfiUBcJprxjmpZ8npjlM6ReY3+DTdfw7ew779ergiY+36YBRRpP6JbJi\nb49aJwmOjLR1rdZEZXRsZiOd5nqpdysAlQ8VzkSplcRLihXK9O72R/MKKeoMwKbB\nlQzPZb3P7f7tSymqx/PKw6U0GToGjSLSzk0lAadsixg75vnOXiJ5lbeO2pv4i+6Q\nT0F27syw0OIHzCgGbnaoA8c+ASuCzfLbBqjD/m9vjGq3ucTMY0vkXNYbD6qaZGEZ\nTqLRTn3/AgMBAAECggEAPzJzwZM0STvskEbo7jYhrTIXvyZak1L/u+zF2+qpVv6s\n3ldLvI3NO6M4kOdgSwUj5+vjMlTuWcdgUJirx4dYij2e+EZBh36jGM0idzivwyN/\nO6DYwhfdfATYJel+nhyR3q8aLjiAHK3CShdCR1JPPEPAJzoa7t7EAXpecwn8OM1d\nVk5RyVE1/h9yGc4jJ02sJWXn/aghsJiRhXe0hK+l/TsD9GRiG2tMLUc5kUXHtSFa\nSP7yX7H0xFZIELZY159PeNscvout3neF/+z4ohyDjbapwYt57gJ4ybM41W4Ttsbh\n+SrN+KgJPISekXGRTLsm7zw9tfpEBeHUkyKdqIAZcQKBgQDuf6srLn/2XFQt0Ae8\nxB4aBnWAJL/kON9oKo3N+Vo3ovQb8/q5/b+r14LlzTSLun4SBUs72bpJHTXE5LfJ\nmx7dohljAiGLUnlm1BYnIym24SkCDZE62mh6w0JMivWXZImWSfB9S9E8kZ7VjN99\nRukKV40ehyQU1onTBGp5EA7x1QKBgQDCqUVyjut93AZ3jY25ytwVfapCQJcGSlC7\nU97NWQ74E1zUbkToSofqaaF5pstKs+QHNCGexZHLJlcMGt+KE9B2itROV/HB6Y9J\nFLi0SYi3Ftr5JsMxk9Fbr+Rm2fn3ju/m0qFgrNxQHgCmHYMP3+jrO8Eco6LWCbwV\nMFGJESbGgwKBgQDlF21sBTaVhwq1FubXw+rGRP4JIUPSDW9Lt9SOzb6DQtwJHcrx\nbXT3tAPgicS3k2QWG0+xJety38QOZUTFO2PisRqBqEJgedBznbXJ0lT3fkDN4Apo\n5fMGORkuPSy7R6+B1XRUZseNzrMrni3vQHYJoR/E+zsFaS7qq4s6ztoMIQKBgQCI\nBokE+GIO3QWX3U7AGcWZLuseyMvAFYY8oOr8S9Nt/vnLaBK2z/4SDCZOQAOm+/XI\nIuGrdRvf/bauOskiT55Id9LLvCCwBGmgA97d/NSQPGRf3npf1o9hppPQW1mVaEiz\n31Ptnl2FjrGdYtoG6cx1NJhJTv+m2b6Yf986DMYvyQKBgQCaIkHVa3ANQe5ZhAHp\nrioWNudCOh3iO5jmdx+7KeB0h1/eILbP4y2nrC6hvmLnwAESYc3PCBWvoVDTu3Fa\nxPFVn89kFGYq5MoDWd8Ckanvmc60FWuSujhoqr5rdLw0l7TkN6loJw5n0hdjNZrQ\nx4qqkJUcGNmJ2Zx1VP5rmYF0ew==\n-----END PRIVATE KEY-----'
};

if (argv.frames) {
    if (fs.existsSync(argv.frames)) {
        if (! fs.statSync(argv.frames).isDirectory()) {
            console.log('[' + argv.frames + '] exists but is not a directory');
            process.exit(1);
        }
    } else {
        console.log('trying to create [' + argv.frames + ']');
        fs.mkdirSync(argv.frames);
        if (fs.existsSync(argv.frames)) {
            console.log('created');
        } else {
            console.log('unable to create [' + argv.frames + ']');
            process.exit(1);
        }
    }
}
var stats = {
    totalTests: 0,
    totalAssertions: 0,
    successfulTests: 0,
    successfulAssertions: 0,
    failedTests: 0,
    failedAssertions: 0
};

var timeout = argv.timeout ? (argv.timeout * 1000) : 60000;

var sessionKey = crypto.randomBytes(20).toString('hex');
var failures = [];
var pulseTime = (new Date()).getTime();

var ffmpegProcess;
var ffmpegProcessShuttingDown;
var firstFrameOfThisTest;
var currentFfmpegVideoFileBase;
var frameMap = {};
var frameCompressionMap = {};
var currentPhantomJsFrame = 0;
var currentFfmpegFrame = 1;
var ffmpegWarmup;
var browserStdoutPaused = false;
var currentTestBeingExecuted = '';
var currentFrameFolder = false;
var currentFrameIndex = 1;

var getFrameFileName = function(currentFrameIndex) {
    return currentFrameFolder + '/0000000'.substr(0, 8 - String(currentFrameIndex).length) + String(currentFrameIndex) + '.png';
};

app.get('/', function (req, res) {
  res.send('<!DOCTYPE html><html><head></head><body><pre>Hello, this is cartFiller backend, you should not ever interact with it directly, here are current stats: ' + JSON.stringify(stats, null, 4) + '</pre></body></html>');
});

var logDate = function(thisTs, prevTs, withDate){
    return (withDate ? (thisTs.getUTCFullYear() + '-' + ('0' + thisTs.getUTCMonth()).substr(-2) + '-' + ('0' + thisTs.getUTCDate()).substr(-2) + ' ') : '') + ('0' + thisTs.getUTCHours()).substr(-2) + ':' + ('0' + thisTs.getUTCMinutes()).substr(-2) + ':' + ('0' + thisTs.getUTCSeconds()).substr(-2) + '.' + ('00' + thisTs.getUTCMilliseconds()).substr(-3) + ' (+' + (thisTs.getTime() - prevTs.getTime()) + 'ms)';
};

var prevProgressTs = new Date();

app.post('/progress/' + sessionKey, function (req, res) {
    pulseTime = (new Date()).getTime();
    res.setHeader('Access-Control-Allow-Origin', '*');
    req.body.task = parseInt(req.body.task) + 1;
    req.body.step = parseInt(req.body.step) + 1;
    if (req.body.result !== 'ok') {
        failures.push(req.body);
    }
    var task = req.body.task;
    var step = req.body.step;
    var frameMapTask = String(parseInt(req.body.nextTask) + 1);
    var frameMapStep = String(parseInt(req.body.nextStep) + 1);
    console.log('setting frameMap for ' + frameMapTask + '.' + frameMapStep);
    frameMap[frameMapTask + '.' + frameMapStep] = [parseInt(req.body.nextVideoFrame), parseInt(req.body.nextSleep)];
    
    var ts = new Date();
    console.log((req.body.result + '       ').substr(0,8) + logDate(ts, prevProgressTs) + ' ' + req.body.test + ', task ' + task + ': ' + req.body.taskName + ', step ' + step + ': result = ' + req.body.result + (req.body.videoFrame ? (', frame = ' + req.body.videoFrame) : '') + (req.body.message ? (', message = ' + req.body.message) : ''));
    prevProgressTs = ts;
    res.end();
});

var endFfmpegProcess = function(cb) {
    var endFn = function() {
        cb();
    };
    ffmpegProcess.on('close', function() {
        ffmpegProcess = false;
        console.log('ffmpegProcess closed');
        endFn();
    });
    ffmpegProcessShuttingDown = true;
    console.log('sending stdin.end to ffmpeg');
    ffmpegProcess.stdin.end();
    var frameMapFile = currentFfmpegVideoFileBase + '.json';
    console.log('writing framemap to ' + frameMapFile);
    fs.writeFileSync(frameMapFile, JSON.stringify(getConvertedFrameMap()));
};

var getConvertedFrameMap = function() {
    frameMap['0.0'] = [firstFrameOfThisTest + 2, 2000]; // small startup pause on video
    var convertedFrameMap = [];
    for (var i = firstFrameOfThisTest; undefined !== frameCompressionMap[i]; i ++) {
        if (undefined === convertedFrameMap[frameCompressionMap[i]]) {
            convertedFrameMap[frameCompressionMap[i]] = ['', '', frameCompressionMap[i], 0];
        } else {
            convertedFrameMap[frameCompressionMap[i]][3] += 40; // 40 ms delay for each next frame
        }
    }
    for (i in frameMap) {
        var internalFrameNumber = frameCompressionMap[frameMap[i][0]];
        convertedFrameMap[internalFrameNumber] = [i.split('.')[0], i.split('.')[1], internalFrameNumber, frameMap[i][1]];
    }
    convertedFrameMap.sort(function(a, b) {
        return a[2] - b[2];
    });
    for (i = convertedFrameMap.length - 1; i >= 0; i --) {
        if (convertedFrameMap[i]) {
            convertedFrameMap[i][3] = 10000;
            break;
        }
    }

    return convertedFrameMap;
};

var writeFrameMapToFrameFolder = function() {
    var buf = new Buffer(previousFrameBase64, 'base64');
    var frameFileName = getFrameFileName(currentFrameIndex); 
    console.log('saving final frame to ' + frameFileName);
    frameCompressionMap[currentPhantomJsFrame + 1] = currentFrameIndex;
    fs.writeFileSync(frameFileName, buf);
    currentFrameIndex ++;
    // we are going to write frameMap here
    console.log('writing frameMap.json to ' + currentFrameFolder);
    fs.writeFileSync(currentFrameFolder + '/frameMap.json', JSON.stringify(getConvertedFrameMap()));
};

app.post('/ready/' + sessionKey, function(req, res) {
    console.log('testSuiteController says get ready for : ' + req.body.test);
    res.setHeader('Access-Control-Allow-Origin', '*');
    currentTestBeingExecuted = req.body.test;
    if (argv.frames) {
        if (currentFrameFolder) {
            writeFrameMapToFrameFolder();
        }
        console.log('resetting frameMap');
        firstFrameOfThisTest = false;
        frameMap = {};
        frameCompressionMap = {};
        // make sure that directory exists
        currentFrameFolder = argv.frames.replace(/\/+$/, '') + '/' + currentTestBeingExecuted;
        console.log('preparing folder for frames: ' + currentFrameFolder);
        var stat;
        try {
            stat = fs.statSync(currentFrameFolder);
        } catch (e) {}
        if (stat && ! stat.isDirectory()) {
            console.log('unable to save frames in specified directory: ' + currentFrameFolder + ' because it is a file');
            currentFrameFolder = false;
        } else if (! stat) {
            try {
                fs.mkdirSync(currentFrameFolder);
            } catch (e) {
                console.log(e);
            }
            try {
                stat = fs.statSync(currentFrameFolder);
            } catch (e) {}
            if ((! stat) || (! stat.isDirectory())) {
                console.log('tried to created folder to save frames to: ' + currentFrameFolder + ' but did not succeed');
                currentFrameFolder = false;
            }
        } else if (stat && stat.isDirectory()) {
            console.log('frame folder already exists: ' + currentFrameFolder);
        }
        currentFrameIndex = 1;
    }

    if (argv.video) {
        var next = function() {
            var pc = argv.video.split('.');
            var ext = pc.pop();
            var name = pc.pop();
            pc.push(name + '___' + req.body.test);
            currentFfmpegVideoFileBase = pc.join('.');
            pc.push(ext);
            var args = ['-c:v', 'png', '-f', 'image2pipe', '-r', '25', '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', pc.join('.')];
            console.log('launching ffmpeg ' + args.join(' '));
            ffmpegWarmup = true;
            var ffmpegWarmedUp = function() {
                if (ffmpegWarmup) {
                    ffmpegWarmup = false;
                    previousFrameBase64 = '';
                    setTimeout(function() {
                        res.end();
                    }, 20000);
                }
            };
            ffmpegProcessShuttingDown = false;
            ffmpegProcess = childProcess.spawn('ffmpeg', args);
            currentFfmpegFrame = 1;
            firstFrameOfThisTest = false;
            frameMap = {};
            frameCompressionMap = {};

            ffmpegProcess.stdout.on('data', function(data) { 
                console.log('ffmpeg stdout: ' + data); 
                ffmpegWarmedUp(); 
            });

            ffmpegProcess.stderr.on('data', function(data) { 
                console.log('ffmpeg stderr: ' + data); 
                ffmpegWarmedUp(); 
            });
            
            ffmpegProcess.stdin.on('drain', function() {
                console.log('ffmpegProcess.stdin: drain event received');
                if (browserStdoutPaused) {
                    console.log('browserProcess.stdout is paused, resuing');
                    browserProcess.stdout.resume();
                    browserStdoutPaused = false;
                }
            });
        };
        if (ffmpegProcess) {
            endFfmpegProcess(next);
        } else {
            next();
        }

    } else {
        res.end();
    }
});

var tearDownFn = function(code) {
    var cmds;
    var waterfall = [];
    if (isPhantomJs || argv['browser-args'] !== undefined) {
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
            endFfmpegProcess(function() {
                waterfall.shift();
                waterfall[0]();
            });
        });
    }
    if (argv.frames) {
        waterfall.push(function() {
            writeFrameMapToFrameFolder();
            waterfall.shift();
            waterfall[0]();
        });
    }
    waterfall.push(function(){
        process.exit(code);
    });
    waterfall[0]();
};

var testUrl = argv._[0];
var onlyServeHttp = testUrl === '-';
if (onlyServeHttp) {
    if (! argv['serve-http']) {
        argv['serve-http'] = '.';
    }
    console.log('running in dumb http server mode, serving [' + argv['serve-http'] + '] on port ' + serveHttpPort);
    testUrl = 'http' + (argv.https ? 's' : '') + '://localhost/' + (argv['proxy-to'] ? 'cartfillerFiles/dist/index.html#root=/cartfillerTests/playground&editor=1' : 'dist/index.html#root=../playground&editor=1');
}

if (! onlyServeHttp) {
    console.log('watchdog timeout set to ' + (timeout / 1000) + ' seconds');
    setInterval(function() {
        if (pulseTime < ((new Date()).getTime() - timeout)) {
            console.log('exitting with code 1 because there was no activity over recent ' + (timeout / 1000 ) + ' seconds');
            if (childApp) {
                childApp.kill();
            }
            tearDownFn(1);
        }
    }, 1000);
} else {
    console.log('skipping watchdog, because of dumb http mode');
}

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
var phantomJsStdoutBuffer = '';

var startup = [];

startup.push(function() {
    if (onlyServeHttp) {
        console.log('skipping test runner http server startup');
        startup.shift();
        startup[0]();
    } else {
        server = argv.https ? https.createServer(httpsOptions, app) : http.createServer(app);
        server
            .listen(port, '0.0.0.0', function(err){
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
    }
});

var proxyDelay = argv['proxy-delay'] || 0;
var logWrapper = function(cb) {
    return function(req, res, next) {
        console.log('serveHttp: ' + req.method + ' ' + req.url);
        cb(req, res, next);
    };
};
if (argv['serve-http']) {
    serveHttpApp.use((argv['proxy-to'] ? '/cartfillerTests' : '/'), logWrapper(express.static(argv['serve-http'])));
    serveHttpApp.use((argv['proxy-to'] ? '/cartfillerTests' : '/'), logWrapper(serveIndex(argv['serve-http'])));
    serveHttpApp.use('/cartfillerFiles', logWrapper(express.static(__dirname + '/..')));
    serveHttpApp.use('/cartfillerFiles', logWrapper(serveIndex(__dirname + '/..')));
    if (argv['proxy-to']) {
        var proxy = httpProxy.createProxyServer({
            agent: 0 === argv['proxy-to'].indexOf('https:') ? https.globalAgent : http.globalAgent,
            protocolRewrite: true,
            timeout: 600000,
            proxyTimeout: 600000,
            changeOrigin: true,
            hostRewrite: true,
            secure: false,
            target: argv['proxy-to']
        });
        proxy.on('error', function(err, req, res) {
            console.log('proxy error: ' + err);
            res.writeHead(500);
            res.end();
        });
        serveHttpApp.use(function(req, res) {
            console.log(req.headers);
            console.log('proxy request ' + req.url);
            if (proxyDelay) {
                console.log('proxy delay: ' + proxyDelay);
            }
            setTimeout(function() {
                if (proxyDelay) {
                    console.log('doing proxy request ' + req.url);
                }
                proxy.web(req, res);
            }, proxyDelay);
        });
    }
    startup.push(function() {
        serveHttpServer = argv.https ? https.createServer(httpsOptions, serveHttpApp) : http.createServer(serveHttpApp);
        serveHttpServer
            .listen(serveHttpPort, '0.0.0.0', function(err){
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
} else if (argv['proxy-to']) {
    console.log('--proxy-to only works together with --serve-http, because when proxying you still need to tell proxy where tests should be served from');
    process.exit(1);
}


if (argv.app) {
    startup.push(function() {
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
        var urlToProbe = testUrl.split('#')[0];
        var probedOk = false;
        setTimeout(function probeUrl() {
            if (probedOk) {
                return;
            }
            try {
                console.log('probing application url: ' + urlToProbe);
                var options = url.parse(urlToProbe);
                var req = http.request(options, function(res) {
                    res.on('data', function() { 
                        if (probedOk) {
                            return;
                        }
                        console.log('application seems to be ready');
                        probedOk = true;
                        req.end();
                        startup.shift();
                        startup[0]();
                    });
                    res.on('error', function() {
                        setTimeout(probeUrl, 500);
                    });
                });
                req.on('error', function() { 
                    setTimeout(probeUrl, 500);
                });
                req.end();
            } catch (e) {
                setTimeout(probeUrl, 500);
            }
        }, 0);
    });
}

var injectPortIntoUrl = function(testUrl, port) {
    var pc = testUrl.split('/');
    pc[2] = pc[2].replace(/\:\d+$/, '') + ':' + port;
    return pc.join('/');
};
    
startup.push(function() {
    if (argv['serve-http']) {
        testUrl = injectPortIntoUrl(testUrl, serveHttpPort);
    }
    var backendUrl = 'http' + (argv.https ? 's' : '') + '://127.0.0.1:' + port;
    var editor = argv.editor;
    var root = argv.root;
    var wait = argv.wait;
    var args = [];
    args.push('backend=' + encodeURIComponent(backendUrl));
    args.push('key=' + encodeURIComponent(sessionKey));
    if (argv.test) {
        args.push(
            'job=' + encodeURIComponent(argv.test),
            'task=0',
            'step=1'
        );
    }
    if (editor) {
        args.push('editor=1');
    }
    if (root) {
        if (argv['serve-http'] && /^https?:/.test(root)) {
            root = injectPortIntoUrl(root, serveHttpPort);
        }
        args.push('root=' + encodeURIComponent(root));
    }
    if (wait) {
        args.push('wait=' + wait);
    }
    if (! onlyServeHttp) {
        var hash = testUrl.split('#')[1];
        testUrl = testUrl.split('#')[0];
        testUrl = -1 === testUrl.indexOf('?') ? (testUrl + '?' + (new Date()).getTime()) : (testUrl.replace('?', '?' + (new Date()).getTime() + '&'));
        if (undefined !== hash) {
            testUrl += '#' + hash;
        }
        testUrl = testUrl + (-1 === testUrl.indexOf('#') ? '#' : '&') + args.join('&');
    } else {
        if (argv['proxy-to']) {
            testUrl = testUrl + (-1 === testUrl.indexOf('#') ? '#' : '&') + 'globals[baseUrl]=' + encodeURIComponent('http' + (argv.https ? 's' : '') + '://localhost:' + serveHttpPort);
        }
    }
    if (isPhantomJs) {
        var childArgs;
        childArgs = PHANTOM_DEFAULT_ARGS.concat(argv['browser-args'] ? argv['browser-args'].split(' ') : []);
        if (argv['phantomjs-debugger-port']) {
            childArgs.push('--remote-debugger-port=' + argv['phantomjs-debugger-port']);
            childArgs.push('--remote-debugger-autorun=yes');
        }
        childArgs.push(__dirname + '/phantomjs.js');
        if (argv['phantomjs-auth']) {
            childArgs.push('--auth=' + argv['phantomjs-auth']);
        }
        if (argv['phantomjs-render']) {
            childArgs.push('--render=' + argv['phantomjs-render']);
        }
        if (argv.video || argv.frames) {
            childArgs.push('--video');
        }
        childArgs.push(testUrl);
        console.log('Launching ' + (argv.browser) + ' ' + childArgs.join(' '));
        browserProcess = childProcess.spawn(argv.browser, childArgs);


        browserProcess.stdout.on('data', function(data) { 
            if (argv.video || argv.frames) {
                phantomJsStdoutBuffer += data.toString();
                while (true) {
                    var firstStart = phantomJsStdoutBuffer.indexOf('$start$');
                    if (-1 === firstStart) {
                        break;
                    }
                    var firstFinish = phantomJsStdoutBuffer.indexOf('$finish$', firstStart);
                    if (-1 === firstFinish) {
                        break;
                    }
                    currentPhantomJsFrame = parseInt(phantomJsStdoutBuffer.substr(firstStart + 7, 8).trim());
                    var frameContents = phantomJsStdoutBuffer.substr(firstStart + 16, firstFinish - firstStart - 16);
                    phantomJsStdoutBuffer = phantomJsStdoutBuffer.substr(firstFinish + 8);
                    if (argv.video) {
                        frameCompressionMap[currentPhantomJsFrame] = currentFfmpegFrame;
                    } else if (argv.frames) {
                        frameCompressionMap[currentPhantomJsFrame] = currentFrameIndex;
                    }
                    if (previousFrameBase64 === frameContents) {
                        console.log('skipping frame ' + currentPhantomJsFrame + ' because it is exactly same as previous (currentFrameIndex = ' + currentFrameIndex + ')');
                        continue;
                    }
                    if (false === firstFrameOfThisTest) {
                        console.log('setting firstFrameOfThisTest to ' + currentPhantomJsFrame);
                        firstFrameOfThisTest = currentPhantomJsFrame;
                    }

                    previousFrameBase64 = frameContents;
                    var sendToFfmpeg = (ffmpegProcess && (! ffmpegProcessShuttingDown) && (! ffmpegWarmup));
                    if (sendToFfmpeg || argv['debug-frame-folder'] || currentFrameFolder) {
                        var buf = new Buffer(frameContents, 'base64');
                        if (sendToFfmpeg) {
                            console.log('sending frame ' + currentPhantomJsFrame + ' to ffmpeg as frame ' + currentFfmpegFrame);
                            if (! ffmpegProcess.stdin.write(buf)) {
                                console.log('ffmpegProcess.stdin.write returned false, pausing browserProcess.stdout');
                                browserProcess.stdout.pause();
                                browserStdoutPaused = true;
                            }
                            currentFfmpegFrame ++;
                        } else if (argv.video) {
                            if (ffmpegProcess) {
                                if (ffmpegProcessShuttingDown) {
                                    console.log('skipping frame because of ffmpegProcessShuttingDown');
                                }
                                if (ffmpegWarmup) {
                                    console.log('skipping frame because of ffmpegWarmup');
                                }
                            } else {
                                console.log('skipping frame because ffmpegProcess is not running');
                            }
                        }
                        if (sendToFfmpeg && argv['debug-frame-folder']) {
                            var debugFrameFile = argv['debug-frame-folder'] + '/0000000'.substr(0, 8 - String(currentPhantomJsFrame).length) + String(currentPhantomJsFrame) + '.png';
                            console.log('saving frame to ' + debugFrameFile);
                            fs.writeFileSync(debugFrameFile, buf);
                        }
                        if (currentFrameFolder) {
                            var frameFileName = getFrameFileName(currentFrameIndex); 
                            console.log('saving frame to ' + frameFileName);
                            fs.writeFileSync(frameFileName, buf);
                            currentFrameIndex ++;
                        }
                    }
                }
            } else {
                console.log('PhantomJs stdout: ' + data);
            }
        });
        browserProcess.stderr.on('data', function(data) { 
            var match = /phantomjs\.js have rendered frame \[(\d+)\]/.exec(data);
            if (match) {
                if (false === firstFrameOfThisTest) {
                    firstFrameOfThisTest = parseInt(match[1]);
                }
            } else {
                console.log('PhantomJs stderr: ' + data);
            }
        });
    } else if (argv['browser-args'] !== undefined) {
        var browserArgs = argv['browser-args'] ? argv['browser-args'].split(' ') : [];
        browserArgs.push(testUrl);
        browserProcess = childProcess.spawn(argv.browser, browserArgs);
        browserProcess.stdout.on('data', function(data) { 
            console.log('browser stdout: ' + data);
        });
        browserProcess.stderr.on('data', function(data) { 
            console.log('browser stderr: ' + data);
        });
    } else {
        console.log('Launching ' + (argv.browser ? argv.browser : 'default browser') + ' with URL: ' + testUrl);
        browserProcess = open(testUrl, argv.browser);
    }
});

startup[0]();
