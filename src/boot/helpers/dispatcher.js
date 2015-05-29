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
    };
    /**
     * Resets worker if worker did not report result using 
     * {@link CartFiller.Api#result} or {@link CartFiller.Api#nop} functions
     * @access private
     */
    var resetWorker = function(){
        workerCurrentTaskIndex = workerCurrentStepIndex = workerOnLoadHandler = false;
    };

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
        /**
         * Handles event "worker (job progress) frame loaded". If 
         * main frame is loaded too, then bootstraps worker (job progress) frame
         * @function CartFiller.Dispatcher#onMessage_register
         * @access public
         */
        onMessage_register: function(){
            workerFrameLoaded = true;
            if (mainFrameLoaded && !bootstrapped){
                this.bootstrapCartFiller();
            }
        },
        /**
         * Makes worker (job progres) frame smaller
         * @function CartFiller.Dispatcher#onMessage_makeSmaller
         * @access public
         */
        onMessage_makeSmaller: function(){
            me.modules.ui.setSize('small');
        },
        /**
         * Makes worker (job progress) frame bigger
         * @function CartFiller.Dispatcher#onMessage_makeBigger
         * @access public
         */
        onMessage_makeBigger: function(){
            me.modules.ui.setSize('big');
        },
        /**
         * Toggles size of worker (job progress) frame
         * @function CartFiller.Dispatcher#onMessage_toggleSize
         * @access public
         */
        onMessage_toggleSize: function(){
            me.modules.ui.setSize();
        },
        /**
         * Shows Choose Job frame
         * @function CartFiller.Dispatcher#onMessage_chooseJob
         * @access public
         */
        onMessage_chooseJob: function(){
            me.modules.ui.showHideChooseJobFrame(true);
        },
        /**
         * Hides Choose Job frame
         * @function CartFiller.Dispatcher#onMessage_chooseJobCancel
         * @access public
         */
        onMessage_chooseJobCancel: function(){
            me.modules.ui.showHideChooseJobFrame(false);
        },
        /**
         * Passes job details from Choose Job frame to worker (job progress)
         * frame. 
         * @function CartFiller.Dispatcher#onMessage_jobDetails
         * @param {Object} message Job details description. TBD
         * @access public
         */
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
        /**
         * Sends job result from worker (job progress) frame to Choose Job frame
         * @function CartFiller.Dispatcher#onMessage_sendResult
         * @param {Object} message message.result contains result, while
         * message.tasks contains job details as provided by Choose Job frame
         * both are arrays of same size and order
         * @access public
         */
        onMessage_sendResult: function(message){
            me.modules.ui.showHideChooseJobFrame(true);
            if (resultMessageName){
                this.postMessageToChooseJob(resultMessageName, message);
            }
        },
        /**
         * Loads worker coder by evaluating it
         * @function CartFiller.Dispatcher#onMessage_loadWorker
         * @param {Object} message message.code contains source code of worker
         * @access public
         */
        onMessage_loadWorker: function(message){
            try {
                eval(message.code); // jshint ignore:line
            } catch (e){
                alert(e);
                throw e;
            }
        },
        /**
         * Makes next worker step
         * @function CartFiller.Dispatcher#onMessage_invokeWorker
         * @param {Object} message {index: job task index, step: step index,
         * details: details for this task as provided by ChooseJob}
         * @access public
         */
        onMessage_invokeWorker: function(message){
            if ((false !== workerCurrentTaskIndex) || (false !== workerCurrentStepIndex)){
                var err = 'ERROR: worker task is in still in progress';
                alert(err);
                this.postMessage('workerStepResult', {index: message.index, step: message.step, result: err});
            } else {
                if (workerCurrentTaskIndex !== message.index){
                    for (var oldKey in workerCurrentTask){
                        delete workerCurrentTask[oldKey];
                    }
                    for (var newKey in message.details){
                        workerCurrentTask[newKey] = message.details[newKey];
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
                };
                try {
                    worker[message.task][(message.step * 2) + 1](highlightedElement, env);
                } catch (err){
                    alert(err);
                    debugger; // jshint ignore:line
                    throw err;
                }
            }
        },
        /**
         * Forces worker reset
         * @function CartFiller.Dispathcer#onMessage_resetWorker
         * @access public
         */
        onMessage_resetWorker: function(){
            resetWorker();
        },
        /**
         * Closes popup window in case of popup UI
         * @function CartFiller.Dispathcer#onMessage_closePopup
         * @access public
         */
        onMessage_closePopup: function(){
            me.modules.ui.closePopup();
        },
        /**
         * Handles "main frame loaded" event. If both main frame and 
         * worker (job progress) frames are loaded then bootstraps 
         * job progress frame
         * If worker have registered onLoad callback, then calls it
         * 
         * @function CartFiller.Dispatcher#onMainFrameLoaded
         * @param {boolean} watchdog It may happen, that main frame 
         * window code will replace our onLoad handler with its own one
         * and we will miss onLoad event. For such cases UI
         * pings main frame to check whether it is already loaded, and
         * if yes calls this function with watchdog = true. NOTE: 
         * as a result this function can be called several times (once)
         * after each ping.
         * @access public
         */
        onMainFrameLoaded: function(watchdog) {
            mainFrameLoaded = true;
            if (workerFrameLoaded && !bootstrapped){
                this.bootstrapCartFiller();
            }
            if (workerOnLoadHandler) {
                workerOnLoadHandler(watchdog);
                workerOnLoadHandler = false;
            }
        },
        /**
         * Sends message to worker (job progress frame)
         * @function CartFiller.Dispatcher#postMessageToWorker
         * @param {String} cmd command
         * @param {Object} details
         * @access public
         */
        postMessageToWorker: function(cmd, details){
            postMessage(me.modules.ui.workerFrameWindow, cmd, details);
        },
        /**
         * Sends message to Choose Job frame
         * @function CartFiller.Dispatcher#postMessageToChooseJob
         * @param {String} cmd command
         * @param {Object} details
         * @access public
         */
        postMessageToChooseJob: function(cmd, details){
            postMessage(me.modules.ui.chooseJobFrameWindow, cmd, details, cmd);
        },
        /**
         * Launches worker (job progress frame)
         * @function CartFiller.Dispathcer#bootstrapCartFiller
         * @access public
         */
        bootstrapCartFiller: function(){
            bootstrapped = true;
            //// TBD sort out paths
            this.postMessageToWorker('bootstrap', {lib: me.baseUrl.replace(/(src|dist)\/?$/, 'lib/'), debug: me['data-debug']});
        },
        /**
         * Negotiates with worker, fetches its task-handing code
         * fetches task steps descriptions and passes to worker (job progress)
         * frame
         * @function CartFiller.Dispatcher#registerWorker
         * @param {CartFiller.Api.registerCallback} cb
         * @param {CartFiller.Api} api
         * @access public
         */
        registerWorker: function(cb, api){
            worker = cb(me.modules.ui.mainFrameWindow, undefined, api, workerCurrentTask);
            var list = {};
            for (var taskName in worker){
                if (worker.hasOwnProperty(taskName)){
                    var taskSteps = [];
                    for (var i = 0 ; i < worker[taskName].length; i++){
                        // this is step name/comment
                        if ('string' === typeof worker[taskName][i]){
                            taskSteps.push(worker[taskName][i]);
                        }
                    }
                    list[taskName] = taskSteps;
                }
            }
            this.postMessageToWorker('workerRegistered', {jobTaskDescriptions: list});
        },
        /**
         * Passes step result from worker to worker (job progress) frame
         * @function CartFiller.Dispatcher#submitWorkerResult
         * @see CartFiller.Api#result
         * @see CartFiller.Api#nop
         * @access public
         */
        submitWorkerResult: function(message, recoverable){
            var status;
            if ((undefined === message) || ('' === message)) {
                status = 'ok';
            } else if ('string' === typeof message){
                status = recoverable ? 'skip' : 'error';
            } else {
                throw 'invalid message type ' + typeof(message);
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
        /**
         * Registers worker's onLoad callback for main frame
         * @function CartFiller.Dispatcher#registerWorkerOnloadCallback
         * @param {CartFiller.Api.onloadCallback} cb
         * @access public
         */
        registerWorkerOnloadCallback: function(cb){
            workerOnLoadHandler = cb;
        },
        /**
         * Returns current step indx
         * @function CartFiller.Dispatcher#getWorkerCurrentStepIndex
         * @returns {integer}
         * @access public
         */
        getWorkerCurrentStepIndex: function(){
            return workerCurrentStepIndex;
        },
        /**
         * Sets current highlighted element
         * @function CartFiller.Dispatcher#setHighlightedElement
         * @param {jQuery|HtmlElement} element
         * @access public
         */
        setHighlightedElement: function(element){
            highlightedElement = element;
        }

    });
}).call(this, document, window);