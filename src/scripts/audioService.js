define('audioService', ['app', 'audioService'], function(app){
    app.service('cfAudioService', ['cfDebug', function(cfDebug){
        var recording = false;
        var initialized;
        var AudioContext;
        var audioContext;
        var inputPoint;
        var analyserNode;
        var zeroGain;
        var node;
        var buffers;
        var bufferLength;
        var sampleRate;
        var initialize = function() {
            if (initialized) {
                return;
            }
            initialized = true;
            AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            inputPoint = audioContext.createGain();
            if (!navigator.getUserMedia) {
                navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            }
            if (!navigator.cancelAnimationFrame) {
                navigator.cancelAnimationFrame = navigator.webkitCancelAnimationFrame || navigator.mozCancelAnimationFrame;
            }
            if (!navigator.requestAnimationFrame) {
                navigator.requestAnimationFrame = navigator.webkitRequestAnimationFrame || navigator.mozRequestAnimationFrame;
            }

            navigator.getUserMedia(
                {
                    'audio': {
                        'mandatory': {
                            'googEchoCancellation': 'false',
                            'googAutoGainControl': 'false',
                            'googNoiseSuppression': 'false',
                            'googHighpassFilter': 'false'
                        },
                        'optional': []
                    },
                }, 
                function(stream) {
                    audioContext.createMediaStreamSource(stream).connect(inputPoint);
                    analyserNode = audioContext.createAnalyser();
                    analyserNode.fftSize = 2048;
                    inputPoint.connect( analyserNode );
                    sampleRate = inputPoint.context.sampleRate;
                    if(!inputPoint.context.createScriptProcessor){
                        node = inputPoint.context.createJavaScriptNode(16384, 2, 2);
                    } else {
                        node = inputPoint.context.createScriptProcessor(16384, 2, 2);
                    }

                    node.onaudioprocess = function(e){
                        if (! recording) {
                            return;
                        }

                        var r = e.inputBuffer.getChannelData(0);
                        var l = e.inputBuffer.getChannelData(1);
                        var len = Math.max(r.length, l.length);
                        var b = new Uint16Array(2 * len);
                        var i, s;
                        for (i = 0; i < r.length; i ++) {
                            s = Math.max(-1, Math.min(1, r[i]));
                            b[i * 2] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }

                        for (i = 0; i < l.length; i ++) {
                            s = Math.max(-1, Math.min(1, l[i]));
                            b[i * 2 + 1] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        buffers.push(b);
                        bufferLength += len;
                        return;
                    };
                    inputPoint.connect(node);
                    node.connect(inputPoint.context.destination); 

                    zeroGain = audioContext.createGain();
                    zeroGain.gain.value = 0.0;
                    inputPoint.connect( zeroGain );
                    zeroGain.connect( audioContext.destination );
                }, 
                function(e) {
                    alert('Error getting audio');
                    console.log(e);
                }
            );

        };
        return {
            toggle: function(link, testName, task, step) {
                if (! recording) {
                    recording = (new Date()).getTime();
                    buffers = [];
                    bufferLength = 0;
                    initialize();
                } else {
                    var buffer = new ArrayBuffer(44 + bufferLength * 4);
                    var view = new DataView(buffer);

                    var writeString = function(view, offset, string){
                        for (var i = 0; i < string.length; i++){
                            view.setUint8(offset + i, string.charCodeAt(i));
                        }
                    };
                    /* RIFF identifier */
                    writeString(view, 0, 'RIFF');
                    /* file length */
                    view.setUint32(4, 32 + bufferLength * 4, true);
                    /* RIFF type */
                    writeString(view, 8, 'WAVE');
                    /* format chunk identifier */
                    writeString(view, 12, 'fmt ');
                    /* format chunk length */
                    view.setUint32(16, 16, true);
                    /* sample format (raw) */
                    view.setUint16(20, 1, true);
                    /* channel count */
                    view.setUint16(22, 2, true);
                    /* sample rate */
                    view.setUint32(24, sampleRate, true);
                    /* byte rate (sample rate * block align) */
                    view.setUint32(28, sampleRate * 4, true);
                    /* block align (channel count * bytes per sample) */
                    view.setUint16(32, 4, true);
                    /* bits per sample */
                    view.setUint16(34, 16, true);
                    /* data chunk identifier */
                    writeString(view, 36, 'data');
                    /* data chunk length */
                    view.setUint32(40, bufferLength * 4, true);
                    
                    var offset = 44;
                    buffers.filter(function(buffer) {
                        for (var i = 0; i < buffer.length; i ++) {
                            view.setInt16(offset, buffer[i], true);
                            offset += 2;
                        }
                    });


                    var url = (window.URL || window.webkitURL).createObjectURL(new Blob([view], { type: 'audio/wav' }));
                    link.href = url;
                    var now = (new Date()).getTime();
                    var duration = now - recording;
                    link.download = 'cartFillerAudio_' + cfDebug.makeFilesystemSafeTestName(testName) + '___' + (1 + task) + '_' + (1 + step) + '_' + duration + '_' + now + '.wav';
                    recording = false;
                }
                return recording;
            }
        };
    }]);
});
