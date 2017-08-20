'use strict';
var argv = require('yargs')
    .help('help')
    .usage('Usage: $0 [options] <base video filename> <folder with audios>')
    .demand(1, 'Please specify base video filename. It is exactly same, that you specified for -v option of backend.js')
    .demand(2, 'Please specify folder with audio files')
    .describe('debug-dump-frames', 'Dump individual frames from source files into subfolders of this dir')
    .argv;

// ffmpeg -i ... -f image2 /tmp/1/%05d.png

var fs = require('fs');
var childProcess = require('child_process');
var allAudioFiles = fs.readdirSync(argv._[1]).filter(function(file) {
    return 0 === file.indexOf('cartFillerAudio_');
});

var injectAudioDelaysIntoMap = function(map, testName) {
    var suitableFiles = {};
    allAudioFiles.filter(function(file) {
        return (0 === file.indexOf('cartFillerAudio_' + testName + '___'));
    }).map(function(file) {
        var pc = file.split('___');
        var ppc = pc[1].split('_');
        return {
            file: file, 
            task: ppc[0], 
            step: ppc[1], 
            duration: ppc[2],
            timestamp: ppc[3]
        };
    }).sort(function(a,b){
        return a.timestamp - b.timestamp;
    }).filter(function(file) {
        console.log('found audio file: ' + file.file);
        suitableFiles[String(file.task) + '.' + String(file.step)] = file;
    });
    console.log(suitableFiles);
    return map.filter(function(frame) { 
        return !! frame; 
    }).map(function(frame) {
        console.log(frame);
        var key = String(frame[0]) + '.' + String(frame[1]);
        if (suitableFiles[key]) {
            console.log('using audio file for task ' + frame[0] + ', step ' + frame[1]);
            frame[3] = Math.max(frame[3], parseInt(suitableFiles[key].duration) + 500);
            frame[4] = suitableFiles[key].file;
        }
        return frame;
    });
};

var findFrameFolders = function(baseName) {
    var dir = baseName.replace(/\/+$/, '');
    return fs.readdirSync(dir).filter(function(file) {
        return fs.statSync(baseName + '/' + file).isDirectory();
    }).map(function(file) {
        return [dir + '/' + file, file];
    });
};

var frameFolders = findFrameFolders(argv._[0]);

var processFrameFolder = function() {
    var pc = frameFolders.shift();
    var dir = pc[0];
    var testName = pc[1];

    var map;
    try {
        map = JSON.parse(fs.readFileSync(dir + '/frameMap.json'));
        // ffmpeg -i /tmp/output___suite2%2Ftest22%3Ffoo%3Dbar.mp4 -filter:v "setpts='PTS+if(gte(N,50),3/TB,0)'" -y /tmp/result.mp4
        map = injectAudioDelaysIntoMap(map, testName);
        var totalDuration = 0;
        var pts = map.filter(function(frame) {
            totalDuration += 40;
            return frame[3] > 0;
        }).map(function(frame) {
            totalDuration += frame[3];
            return 'if(gte(N,' + (parseInt(frame[2]) - 1) + '),' + frame[3] + '/(1000*TB),0)';
        });
        var audioInputs = map.filter(function(frame) {
            return !! frame[4];
        });
        console.log('total duration: ' + totalDuration);
        var args = [];
        pts.unshift('');
        args.push(
            '-i', '%07d.png'
        );
        if (audioInputs.length) {
            audioInputs.filter(function(frame) {
                args.push(
                    '-f', 'lavfi',
                    '-i', 'anullsrc=channel_layout=5.1:sample_rate=48000'
                );
                args.push(
                    '-i', argv._[1] + '/' + frame[4]
                );
                args.push(
                    '-f', 'lavfi',
                    '-i', 'anullsrc=channel_layout=5.1:sample_rate=48000'
                );
            });
        }

        args.push(
            '-filter:v',
            'setpts=\'N/(25*TB)' + pts.join('+') + '\''
        );

        
        if (audioInputs.length) {
            var totalInjectedTime = 0;
            var audioFilterPieces = [];
            var previousAudioEnd = 0;
            var audioFilterSinks = [];
            var audioIndex = 0;
            map.filter(function(frame) {
                var duration = frame[3] / 1000;
                if (frame[4]) {
                    // we need to put audio here
                    var indexOfThisFrame = frame[2];
                    var positionOfThisAudio = indexOfThisFrame * 0.04 + totalInjectedTime;
                    var pause = positionOfThisAudio - previousAudioEnd;
                    var prefilter = '[' + (audioIndex * 3 + 2) + ':a][' + (audioIndex * 3 + 3) + ':a]concat=n=2:v=0:a=1[x' + audioIndex + ']; ';
                    var filter = 
                        '[' + (audioIndex * 3 + 1) + ':a]atrim=end=' + String(pause) + ',asetpts=PTS-STARTPTS[a' + audioIndex + 'p]; ' +
                        '[x' + audioIndex + ']atrim=end=' + String(duration) + ',asetpts=PTS-STARTPTS[a' + audioIndex + ']; ';
                    audioFilterPieces.push(prefilter + filter);
                    audioFilterSinks.push('[a' + audioIndex + 'p][a' + audioIndex + ']');
                    audioIndex ++;
                    previousAudioEnd = positionOfThisAudio + duration;
                }
                totalInjectedTime += duration;
            });
            args.push(
                '-filter_complex',
                audioFilterPieces.join('') + ' ' + audioFilterSinks.join('') + 'concat=n=' + (audioFilterSinks.length * 2) + ':v=0:a=1[a]',
                '-map', '0:v',
                '-map', '[a]',
                '-strict', '-2'
            );
        }
        
        args.push('-t', Math.floor((5000.0 + totalDuration) / 1000));

        args.push(
            '-force_key_frames', 'expr:gte(t,n_forced)',
            '-y',
            dir + '.mp4'
        );

        console.log('ffmpeg ' + args.join(' '));

        var ffmpegProcess = childProcess.spawn('ffmpeg', args, {cwd: dir});
        ffmpegProcess.stdout.on('data', function(data) { 
            console.log('ffmpeg stdout: ' + data); 
        });

        ffmpegProcess.stderr.on('data', function(data) { 
            console.log('ffmpeg stderr: ' + data); 
        });

        ffmpegProcess.on('close', function() {
            if (frameFolders.length) {
                processFrameFolder();
            }
        });
    } catch (e) {
        console.log(e);
        if (frameFolders.length) {
            processFrameFolder();
        }
    }
};
console.log(frameFolders);
processFrameFolder();