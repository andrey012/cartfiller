(function(document, window, undefined){
    'use strict';
    var
        worker = false,
        workerCurrentTaskIndex = false,
        workerCurrentStepIndex = false,
        workerOnLoadHandler = false,
        resultMessageName = false;    
    var mainFrameLoaded = false,
        workerFrameLoaded = false,
        bootstrapped = false;
    var highlightedElement = false;
    var me = this.cartFillerConfiguration;
    var postMessage = function(toWindow, cmd, details, messageName){
        if (undefined === messageName){
            messageName = 'cartFillerMessage';
        }
        if (undefined === details) {
            details = {};
        }
        details.cmd = cmd;
        toWindow.postMessage(
            messageName + ':' + JSON.stringify(details),
            '*'
        );

    }
    var resetWorker = function(){
        workerCurrentTaskIndex = workerCurrentStepIndex = workerOnLoadHandler = false;
    }

    this.cartFillerConfiguration.scripts.push({
        name: 'dispatcher',
        init: function(){
            var dispatcher = this;
            window.addEventListener('message', function(event) {
                var pattern = /^cartFillerMessage:(.*)$/;
                var test = pattern.exec(event.data);
                if (null != test){
                    var message = JSON.parse(test[1]);
                    var fn = 'onMessage_' + message.cmd;
                    dispatcher[fn](message);
                }
            }, false);
        },
        onMessage: function(event){

        },
        onMessage_register: function(message){
            workerFrameLoaded = true;
            if (mainFrameLoaded && !bootstrapped){
                this.bootstrapCartFiller();
            }
        },
        onMessage_makeSmaller: function(){
            me.modules.ui.setSize('small');
        },
        onMessage_makeBigger: function(){
            me.modules.ui.setSize('big');
        },
        onMessage_toggleSize: function(){
            me.modules.ui.setSize();
        },
        onMessage_chooseJob: function(){
            me.modules.ui.showHideChooseJobFrame(true);
        },
        onMessage_chooseJobCancel: function(){
            me.modules.ui.showHideChooseJobFrame(false);
        },
        onMessage_jobDetails: function(message){
            if (message.resultMessage){
                resultMessageName = message.resultMessage;
            } else {
                resultMessageName = false;
            }
            me.modules.ui.showHideChooseJobFrame(false);
            this.postMessageToWorker('jobDetails', message);
        },
        onMessage_sendResult: function(message){
            me.modules.ui.showHideChooseJobFrame(true);
            if (resultMessageName){
                this.postMessageToChooseJob(resultMessageName, message);
            }
        },
        onMessage_loadWorker: function(message){
            if ("string" === typeof me['data-worker']){
                message.src = me['data-worker'];
            }
            var workerScript = document.createElement('script');
            if (/\?/.test(message.src)){
                message.src += '&';
            } else {
                message.src += '?';
            }
            message.src += (new Date()).getTime();
            workerScript.setAttribute('src', message.src);
            worker = false;
            document.getElementsByTagName('body')[0].appendChild(workerScript);
        },
        onMessage_invokeWorker: function(message){
            if ((false !== workerCurrentTaskIndex) || (false !== workerCurrentStepIndex)){
                var err = 'ERROR: worker task is in still in progress';
                alert(err);
                this.postMessage('workerStepResult', {index: message.index, step: message.step, result: err});
            } else {
                workerCurrentTaskIndex = message.index;
                workerCurrentStepIndex = message.step;
                var env = {
                    messageIndex: message.index
                }
                try {
                    worker[message.task][(message.step * 2) + 1](message.details, highlightedElement, env);
                } catch (err){
                    alert(err);
                    debugger;
                    throw err;
                }
            }
        },
        onMessage_resetWorker: function(){
            resetWorker();
        },
        onMainFrameLoaded: function() {
            mainFrameLoaded = true;
            if (workerFrameLoaded && !bootstrapped){
                this.bootstrapCartFiller();
            }
            if (workerOnLoadHandler) workerOnLoadHandler();
        },
        postMessageToWorker: function(cmd, details){
            postMessage(me.modules.ui.workerFrameWindow, cmd, details);
        },
        postMessageToChooseJob: function(cmd, details){
            postMessage(me.modules.ui.chooseJobFrameWindow, cmd, details, cmd);
        },
        bootstrapCartFiller: function(){
            bootstrapped = true;
            this.postMessageToWorker('bootstrap', {lib : me.baseUrl.replace(/src/, 'lib/'), debug: me['data-debug']});
        },
        registerWorker: function(cb, api){
            worker = cb(me.modules.ui.mainFrameWindow, undefined, api);
            var list = {};
            for (var taskName in worker){
                if (worker.hasOwnProperty(taskName)){
                    var taskSteps = [];
                    for (var i = 0 ; i < worker[taskName].length; i++){
                        if ("string" === typeof worker[taskName][i]){
                            taskSteps.push(worker[taskName][i]);
                        }
                    }
                    list[taskName] = taskSteps;
                }
            }
            this.postMessageToWorker('workerRegistered', {jobTaskDescriptions: list});
        },
        submitWorkerResult: function(message, recoverable){
            var status;
            if ((undefined === message) || ("" === message)) {
                status = 'ok';
            } else if ("string" === typeof message){
                status = recoverable ? 'skip' : 'error';
            } else {
                throw "invalid message type " + typeof(message);
            }
            this.postMessageToWorker(
                'workerStepResult', 
                {
                    index: workerCurrentTaskIndex, 
                    step: workerCurrentStepIndex, 
                    status: status, 
                    message: message
                }
            );
            resetWorker();
        },
        registerWorkerOnloadCallback: function(cb){
            workerOnLoadHandler = cb;
        },
        getWorkerCurrentStepIndex: function(){
            return workerCurrentStepIndex;
        },
        setHighlightedElement: function(element){
            highlightedElement = element;
        }

    });
}).call(this, document, window);