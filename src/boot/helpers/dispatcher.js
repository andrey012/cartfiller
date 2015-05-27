/**
 * Coordinates activity of worker (via API), UI, and progress frame
 * 
 * @class CartFiller.Dispatcher
 */
(function(document, window, undefined){
    'use strict';
    /**
     * Object, that keeps worker tasks. Can be replaced by new version of 
     * worker
     * @var {CartFiller.WorkerTasks} CartFiller.Dispatcher~worker
     * @access private
     */
    var worker = false;
    /**
     * Object, that keeps current task details
     * @var {CartFiller.TaskDetails} CartFiller.Dispatcher~workerCurrentTask
     * @access private
     */
    var workerCurrentTask = {};
    /**
     * index of current task
     * @var {integer} CartFiller.Dispatcher~workerCurrentTaskIndex
     * @access private
     */
    var workerCurrentTaskIndex = false;
    /**
     * index of current step
     * @var {integer} CartFiller.Dispatcher~workerCurrentStepIndex
     * @access private
     */
    var workerCurrentStepIndex = false;
    /**
     * current callback set by worker. Once
     * callback is called, this var is set to false
     * @var {CartFiller.Api.onLoadCallback} CartFiller.Dispatcher~workerOnLoadHandler
     * @access private
     */
    var workerOnLoadHandler = false;
    /**
     * Keeps message name, used to deliver job results to
     * Choose Job page opened in separate frame, if that is necessary at all
     * If set to false, empty string or undefined - no results will be delivered
     * @var {String} CartFiller.Dispatcher~resultMessageName 
     * @access private
     */
    var resultMessageName = false;
    /**
     * Flag, that is set to true when main frame (with target
     * website) is loaded first time
     * @var {boolean} CartFiller.Dispatcher~mainFrameLoaded
     * @access private
     */
    var mainFrameLoaded = false;
    /**
     * Flag, that is set to true when worker (job progress) frame
     * is loaded
     * @var {boolean} CartFiller.Dispatcher~workerFrameLoaded
     * @access private
     */
    var workerFrameLoaded = false;
    /**
     * Flag, that is set to true after worker (job progress) frame
     * is bootstrapped to avoid sending extra bootstrap message
     * @var {boolean} CartFiller.Dispatcher~bootstrapped
     * @access private
     */
    var bootstrapped = false;
    /**
     * See {@link CartFiller.Api#highlight}
     * @var {jQuery|HtmlElement|false} CartFiller.Dispatcher~highlightedElement 
     * @access private
     */
    var highlightedElement = false;
    /**
     * Just to make code shorter
     * @var {CartFiller.Configuration} CartFiller.Dispatcher~me
     * @access private
     */
    var me = this.cartFillerConfiguration;
    /**
     * Sends message to another frame/window. Puts all data to message text
     * (does not use transferables).
     * @function CartFiller.Dispatcher~postMessage
     * @param {Window} toWindow destination
     * @param {String} cmd payload -- command 
     * @param {Object} details payload -- additional data to transfer. This
     * object should not contain 'cmd' element
     * @param {String} messageName overrides default message name used by 
     * cartFiller
     * @access private
     */
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
    /**
     * Resets worker if worker did not report result using 
     * {@link CartFiller.Api#result} or {@link CartFiller.Api#nop} functions
     * @access private
     */
    var resetWorker = function(){
        workerCurrentTaskIndex = workerCurrentStepIndex = workerOnLoadHandler = false;
    }

    this.cartFillerConfiguration.scripts.push({
        /** 
         * Returns name of this module, used by loader
         * @function CartFiller.Dispatcher#getName
         * @return {String}
         * @access public
         */
        getName: function(){ return 'dispatcher'; },
        /**
         * Initializes module by adding event listener to listen
         * for messages from worker (job progress) frame and from 
         * Choose Job frame
         * @function CartFiller.Dispatcher#init
         * @access public
         */
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
            message.overrideWorkerSrc = me['data-worker'];
            this.postMessageToWorker('jobDetails', message);
        },
        onMessage_sendResult: function(message){
            me.modules.ui.showHideChooseJobFrame(true);
            if (resultMessageName){
                this.postMessageToChooseJob(resultMessageName, message);
            }
        },
        onMessage_loadWorker: function(message){
            eval(message.code);
        },
        onMessage_invokeWorker: function(message){
            if ((false !== workerCurrentTaskIndex) || (false !== workerCurrentStepIndex)){
                var err = 'ERROR: worker task is in still in progress';
                alert(err);
                this.postMessage('workerStepResult', {index: message.index, step: message.step, result: err});
            } else {
                if (workerCurrentTaskIndex !== message.index){
                    for (var key in workerCurrentTask){
                        delete workerCurrentTask[key];
                    }
                    for (var key in message.details){
                        workerCurrentTask[key] = message.details[key];
                    }
                }
                workerCurrentTaskIndex = message.index;
                workerCurrentStepIndex = message.step;
                /**
                 * Environment utility class - will contain various information,
                 * that can be rarely used by worker step callbacks
                 *
                 * @class CartFiller.Api.StepEnvironment
                 */
                var env = {
                    /**
                     * @member {integer} CartFiller.Api.StepEnvironment#stepIndex 0-based index of current step
                     * @access public
                     */
                    stepIndex: message.index,
                    /**
                     * @member {Object} CartFiller.Api.StepEnvironment#task Task object as provided by 
                     * {@link CartFiller.submitJobDetails}
                     * @access public
                     */
                    task: message.details
                }
                try {
                    worker[message.task][(message.step * 2) + 1](highlightedElement, env);
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
        onMainFrameLoaded: function(watchdog) {
            mainFrameLoaded = true;
            if (workerFrameLoaded && !bootstrapped){
                this.bootstrapCartFiller();
            }
            if (workerOnLoadHandler) {
                workerOnLoadHandler();
                workerOnLoadHandler = false;
            }
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
            worker = cb(me.modules.ui.mainFrameWindow, undefined, api, workerCurrentTask);
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
                    message: message,
                    nop: recoverable === 'nop'
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