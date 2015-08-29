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
     * Keeps workers URL=>code map, used to initiate relays on the fly
     * @var {Object} CartFiller.Dispatcher~workerSourceCodes
     * @access private
     */
    var workerSourceCodes = {};
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
     * flag, that mainWorkerFrame was loaded after worker step was started, but before
     * worker installed onload hook. This happens sometimes when network is really fast.
     * @var {boolean} CartFiller.Dispatcher~onLoadHappened
     * @access private
     */
    var onLoadHappened = false;
    /**
     * @var {integer} CartFiller.Dispatcher~workerTimeout Specifies time to wait 
     * for worker step to call api.result() or api.nop(). 
     * @access private
     */
    var workerTimeout = 0;
    /**
     * @var {Array} CartFiller.Dispatcher~workerSetTimeoutIds Keeps list of ids
     * of setTimeout, which were initiated from within the worker step function. 
     * In case Watchdog kills the step - these timers will be cleared 
     * @access private
     */
    var workerSetTimeoutIds = [];
    /**
     * @var {Array} CartFiller.Dispatcher~workerSetIntervalIds Keeps list of ids
     * of setInterval, which were initiated from within the worker step function. 
     * In case Watchdog kills the step - these timers will be cleared 
     * @access private
     */
    var workerSetIntervalIds = [];
    /**
     * @var {integer} CartFiller.Dispatcher~workerWatchdogId setTimeoutId of 
     * watchdog handler. When step function calls api.result() we should cancel
     * this watchdog. 
     * @access private
     */
    var workerWatchdogId = false;
    /**
     * @var {Object} CartFiller.Dispatcher~workerGlobals Keeps global variables
     * which can be assigned from within worker and then reused.
     * @access private
     */
    var workerGlobals = {};
    /**
     * @var {Object} workerEventListeners Registered event listeners, see
     * {@link CartFiller.Dispatcher#registerEventCallback}
     * @access private
     */
    var workerEventListeners = {};
    /**
     * Keeps message result name, used to deliver job results to
     * Choose Job page opened in separate frame, if that is necessary at all
     * If set to false, empty string or undefined - no results will be delivered
     * @var {String} CartFiller.Dispatcher~resultMessageName
     * @access private
     */
    var resultMessageName = false;
    /**
     * Keeps message name, used to deliver intermediate job status to
     * Choose Job page opened in separate frame, if that is necessary at all
     * If set to false, empty string or undefined - no results will be delivered
     * @var {String} CartFiller.Dispatcher~resultMessageName
     * @access private
     */
    var statusMessageName = false;
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
     * Keeps current URL of worker frame
     * @var {String} CartFiller.Dispatcher~workerCurrentUrl
     * @access private
     */
    var workerCurrentUrl = false;
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
     * Cache job details to give it to worker in full. Purpose is to make it 
     * possible to deliver configuration/environment variables from 
     * chooseJob to worker, and make them accessible by all tasks
     * @var {CartFillerPlugin~JobDetails} CartFiller.Dispatcher~jobDetailsCache
     * @access private
     */
    var jobDetailsCache = {};
    /**
     * Counts repetitions of steps, declared with repeatXX modifier
     * @var {integer} CartFiller.Dispatcher~stepRepeatCounter
     * @access private
     */
    var stepRepeatCounter = 0;
    /**
     * @var {CartFiller.Api.StepEnvironment} CartFiller.Dispatcher~currentStepEnv
     * @access private
     */
    var currentStepEnv = {};
    /**
     * @var {Function} CartFiller.Dispatcher~currentStepWorkerFn
     * @access private
     */
    var currentStepWorkerFn;
    /**
     * Just to make code shorter
     * @var {CartFiller.Configuration} CartFiller.Dispatcher~me
     * @access private
     */
    var me = this.cartFillerConfiguration;
    /**
     * Keeps details about relay subsystem
     * @var {Object} CartFiller.Dispatcher~rel
     */
    var relay = {
        isSlave: false,
        nextRelay: false,
        nextRelayRegistered: false,
        nextRelayQueue: [],
        knownUrls: {},
        bubbleMessage: function(message) {
            if (this.isSlave) {
                postMessage(window.opener, 'bubbleRelayMessage', message);
            }
            if (this.nextRelay) {
                if (this.nextRelayRegistered) {
                    postMessage(this.nextRelay, 'bubbleRelayMessage', message);
                } else {
                    message.cmd = 'bubbleRelayMessage';
                    this.nextRelayQueue.push(message);
                }
            }
        }
    };
    /**
     * Calls registered event callbacks
     * @function CartFiller.Dispatcher~callEventCallbacks
     * @param {string} event event alias
     */
    var callEventCallbacks = function(event) {
        if (undefined !== workerEventListeners[event]) {
            for (var i in workerEventListeners[event]) {
                workerEventListeners[event][i]();
            }
        }
    };
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
     * @function CartFiller.Dispatcher~resetWorker
     * @access private
     */
    var resetWorker = function(){
        workerCurrentTaskIndex = workerCurrentStepIndex = workerOnLoadHandler = false;
    };
    /**
     * Fills workerCurrentTask object with current task parameters.
     * See {@link CartFiller.Dispatcher~workerCurrentTask}
     * @function CartFiller.Dispatcher~fillWorkerCurrentTask
     * @param {Object} src
     * @access private
     */
    var fillWorkerCurrentTask = function(src){
        for (var oldKey in workerCurrentTask){
            if (workerCurrentTask.hasOwnProperty(oldKey)){
                delete workerCurrentTask[oldKey];
            }
        }
        for (var newKey in src){
            if (src.hasOwnProperty(newKey)){
                workerCurrentTask[newKey] = src[newKey];
            }
        }
    };
    /**
     * Fills workerGlobals object with new values
     * @function CartFiller.Dispatcher~fillWorkerGlobals
     * @param {Object} src
     * @access private
     */
    var fillWorkerGlobals = function(src) {
        for (var oldKey in workerGlobals){
            if (workerGlobals.hasOwnProperty(oldKey)){
                delete workerGlobals[oldKey];
            }
        }
        for (var newKey in src){
            if (src.hasOwnProperty(newKey)){
                workerGlobals[newKey] = src[newKey];
            }
        }
    };

    /**
     * Returns URL for lib folder
     * @function CartFiller.Dispatcher~getLibUrl
     * @access private
     */
    var getLibUrl = function() {
        //// TBD sort out paths
        return me.baseUrl.replace(/(src|dist)\/?$/, 'lib/');
    };
    /**
     * Keeps directions on next task flow
     * @var {string} CartFiller.Dispatcher~nextTaskFlow
     * @access private
     */
    var nextTaskFlow;
    /**
     * removes setTimeout's and setInterval's registered by worker earlier
     * @function CartFiller.Dispatcher~clearRegisteredTimeoutsAndIntervals
     * @access private 
     */
    var clearRegisteredTimeoutsAndIntervals = function() {
        while (workerSetTimeoutIds.length) {
            clearTimeout(workerSetTimeoutIds.pop());
        }
        while (workerSetIntervalIds.length) {
            clearInterval(workerSetIntervalIds.pop());
        }
    };
    /**
     * Register watchdog handler
     * @function CartFiller.Dispatcher~registerWorkerWatchdog
     * @access private
     */
    var registerWorkerWatchdog = function() {
        if (workerWatchdogId && workerWatchdogId !== true) {
            removeWatchdogHandler();
        } else {
            workerWatchdogId = false;
        }
        if (workerTimeout) {
            workerWatchdogId = setTimeout(function(){
                workerWatchdogId = false;
                workerOnLoadHandler = false;
                me.modules.api.result('Timeout happened, worker step cancelled');
            }, workerTimeout);
        } else {
            workerWatchdogId = true;
        }
    };
    /**
     * Removes watchdog handler if api.result is called earlier then timeout
     * @function CartFiller.Dispatcher~removeWatchdogHandler
     * @access private
     */
    var removeWatchdogHandler = function(){
        if (workerWatchdogId) {
            if (workerWatchdogId !== true) {
                clearTimeout(workerWatchdogId);
            }
            workerWatchdogId = false;
        }
    };
    /**
     * Passes message to next relay if message is not undefined and next relay exists, otherwise
     * create new relay using specified url and puts message if it is not undefined to the queue
     * @function CartFiller.Dispatcher~openRelay
     * @param {string} url
     * @param {Object} message
     * @param {boolean} noFocus Experimental, looks like it does not work
     * @access private
     */
    var openRelay = function(url, message, noFocus) {
        relay.knownUrls[url] = true;
        if (relay.nextRelay && message) {
            if (relay.nextRelayRegistered) {
                postMessage(relay.nextRelay, message.cmd, message);
            } else {
                relay.nextRelayQueue.push(message);
            }
        } else {
            relay.nextRelay = window.open(url, '_blank', 'toolbar=yes, location=yes, status=yes, menubar=yes, scrollbars=yes');
            if (noFocus) {
                setTimeout(function(){
                    relay.nextRelay.blur();
                    window.focus();
                },0);
            }
            if (message) {
                relay.nextRelayQueue.push(message);
            }
        }
    };
    var workersToEvaluate = [];
    var sharedWorkerFunctions = {};
    var evaluateNextWorker = function() {
        if (! workersToEvaluate.length) {
            return;
        }
        eval(workerSourceCodes[workersToEvaluate.shift()]); // jshint ignore:line
        evaluateNextWorker();
    };
    /**
     * Evaluate worker code sorting out dependencies
     * @function CartFiller.Dispatcher~evaluateWorkers
     * @access private
     */
    var evaluateWorkers = function() {
        workersToEvaluate = [];
        sharedWorkerFunctions = {};
        for (var i in workerSourceCodes) {
            workersToEvaluate.push(i);
        }
        evaluateNextWorker();
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
                if (pattern.test(event.data)){
                    var match = pattern.exec(event.data);
                    var message = JSON.parse(match[1]);
                    if (event.source === relay.nextRelay && message.cmd !== 'register' && message.cmd !== 'bubbleRelayMessage') {
                        if (message.cmd === 'workerStepResult') {
                            fillWorkerGlobals(message.globals);
                        }
                        postMessage(relay.isSlave ? window.opener : me.modules.ui.workerFrameWindow, message.cmd, message);
                    } else {
                        var fn = 'onMessage_' + message.cmd;
                        if (undefined !== dispatcher[fn] && dispatcher[fn] instanceof Function){
                            dispatcher[fn](message, event.source);
                        } else {
                            console.log('unknown message: ' + fn + ':' + event.data);
                        }
                    }
                } else {
                    // this message was received by an accident and we need to resend it to mainFrame where
                    // real recipient is.
                    var deepCopy = function(x, k) {
                        if ('undefined' === typeof k) {
                            k = [];
                        }
                        var known = function(v) { return v === k ; };
                        var r = {};
                        for (var i in x) {
                            if (! (x[i] instanceof Window) && ! (x[i] instanceof Function)) {
                                if (! k.filter(known).length) {
                                    k.push(x[i]);
                                    if ('object' === typeof x[i]) {
                                        r[i] = deepCopy(x[i], k);
                                    } else {
                                        r[i] = x[i];
                                    }
                                }
                            }
                        }
                        return r;
                    };
                    me.modules.dispatcher.onMessage_postMessage({cmd: 'postMessage', event: deepCopy(event), originalEvent: event});
                }
            }, false);
        },
        /**
         * Handles event "worker (job progress) frame loaded". If 
         * main frame is loaded too, then bootstraps worker (job progress) frame
         * @function CartFiller.Dispatcher#onMessage_register
         * @param {Object} message
         * @param Window source
         * @access public
         */
        onMessage_register: function(message, source){
            if (source === me.modules.ui.workerFrameWindow) {
                // skip other requests
                workerFrameLoaded = true;
                if (mainFrameLoaded && !bootstrapped){
                    this.bootstrapCartFiller();
                }
            } else if (source === me.modules.ui.chooseJobFrameWindow) {
                this.postMessageToChooseJob('bootstrap', {
                    lib: getLibUrl(),
                    testSuite: true,
                    src: me.baseUrl.replace(/\/$/, '') + '/'
                }, 'cartFillerMessage');
            } else if (source === relay.nextRelay) {
                relay.nextRelayRegistered = true;
                var url;
                var codeToSend = [];
                for (url in workerSourceCodes) {
                    if (workerSourceCodes.hasOwnProperty(url)) {
                        codeToSend.push(url);
                    }
                }
                for (var i = 0; i < codeToSend.length; i ++) {
                    relay.nextRelayQueue.push({cmd: 'loadWorker', url: codeToSend[i], code: workerSourceCodes[codeToSend[i]], isFinal: (i === codeToSend.length - 1)});
                }
                // now we can send all queued messages to relay
                var msg;
                while (relay.nextRelayQueue.length) {
                    msg = relay.nextRelayQueue.shift();
                    postMessage(relay.nextRelay, msg.cmd, msg);
                }
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
            this.postMessageToWorker('chooseJobShown');
        },
        /**
         * Hides Choose Job frame
         * @function CartFiller.Dispatcher#onMessage_chooseJobCancel
         * @access public
         */
        onMessage_chooseJobCancel: function(){
            me.modules.ui.showHideChooseJobFrame(false);
            this.postMessageToWorker('chooseJobHidden');
        },
        /**
         * Passes job details from Choose Job frame to worker (job progress)
         * frame. 
         * @function CartFiller.Dispatcher#onMessage_jobDetails
         * @param {Object} message Job details description. TBD
         * @access public
         */
        onMessage_jobDetails: function(message){
            var convertObjectToArray = function(details) {
                if (! (details instanceof Array)) {
                    var newDetails = [];
                    for (i = 0; 'undefined' !== typeof details[i]; i++ ){
                        newDetails.push(details[i]);
                    }
                    details = newDetails;
                }
                return details;
            };
            if (undefined !== message.details) {
                workerSourceCodes = {};
                if (message.resultMessage){
                    resultMessageName = message.resultMessage;
                } else {
                    resultMessageName = false;
                }
                if (message.statusMessage){
                    statusMessageName = message.statusMessage;
                } else {
                    statusMessageName = false;
                }
                me.modules.ui.showHideChooseJobFrame(false);
                message.overrideWorkerSrc = me['data-worker'];
                workerTimeout = message.timeout;
                workerCurrentTask = {};
                resetWorker();
                var i;
                for (i in jobDetailsCache) {
                    if (jobDetailsCache.hasOwnProperty(i)) {
                        delete jobDetailsCache[i];
                    }
                }
                for (i in message) {
                    jobDetailsCache[i] = message[i];
                }
                worker = {};
                workerGlobals = message.globals = message.globals ? message.globals : {};
                message.details = convertObjectToArray(message.details);
                workerEventListeners = {};
            } else if (undefined !== message.$cartFillerTestUpdate) {
                message.$cartFillerTestUpdate.details = convertObjectToArray(message.$cartFillerTestUpdate.details);
            } else if (undefined !== message.$preventPageReload) {
                me.modules.ui.preventPageReload();
                return;
            } else {
                throw new Error('unknown job details package - should have either details or $cartFillerTestUpdate');
            }

            this.postMessageToWorker('jobDetails', message);
        },
        /**
         * Sends job result from worker (job progress) frame to Choose Job frame
         * @function CartFiller.Dispatcher#onMessage_sendResult
         * @param {Object} message message.result contains result, while
         * message.tasks contains job details as provided by Choose Job frame
         * both are arrays of same size and order. See {@link CartFillerPlugin.resultCallback}
         * @access public
         */
        onMessage_sendResult: function(message){
            me.modules.ui.showHideChooseJobFrame(true);
            if (resultMessageName){
                this.postMessageToChooseJob(resultMessageName, message);
            }
        },
        /**
         * Sends intermediate job status from worker (job progress) frame to Choose Job frame
         * @function CartFiller.Dispatcher#onMessage_sendStatus
         * @param {Object} message see onMessage_sendResult for description, in 
         * addition to that - message.currentTaskIndex, and message.currentTaskStepIndex
         * identify the task and step, that triggered this status update
         * @access public
         */
        onMessage_sendStatus: function(message){
            if (statusMessageName){
                this.postMessageToChooseJob(statusMessageName, message);
            }
        },
        /**
         * Loads worker code by evaluating it
         * @function CartFiller.Dispatcher#onMessage_loadWorker
         * @param {Object} message message.code contains source code of worker
         * @access public
         */
        onMessage_loadWorker: function(message){
            try {
                workerSourceCodes[message.src] = message.code;
                if (message.isFinal) {
                    evaluateWorkers();
                }
                if (relay.nextRelay) {
                    postMessage(relay.nextRelay, message.cmd, message);
                }

            } catch (e){
                alert(e);
                console.log(e);
                throw e;
            }
        },
        /**
         * Updates task property value when it was edited from worker frame
         * @function CartFiller.Dispatcher#onMessage_updateProperty
         * @param {Object} message {index: job task index, name: property name, value: property value}
         * @access public
         */
        onMessage_updateProperty: function(message) {
            if (parseInt(message.index) === parseInt(workerCurrentTaskIndex)) {
                workerCurrentTask[message.name] = message.value;
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
            if (message.globals) {
                fillWorkerGlobals(message.globals);
            }
            try {
                me.modules.ui.say();
            } catch (e){}
            if (this.reflectMessage(message)) {
                return;
            }
            if (false !== workerCurrentStepIndex){
                var err = 'ERROR: worker task is in still in progress';
                alert(err);
            } else {
                stepRepeatCounter = 0;
                onLoadHappened = false;
                nextTaskFlow = 'normal';
                if (workerCurrentTaskIndex !== message.index){
                    fillWorkerCurrentTask(message.details);
                    // clear arrows and highlights
                    me.modules.api.arrow().highlight();
                }
                workerCurrentTaskIndex = message.index;
                workerCurrentStepIndex = message.step;
                /**
                 * Environment utility class - will contain various information,
                 * that can be rarely used by worker step callbacks
                 *
                 * @class CartFiller.Api.StepEnvironment
                 */
                currentStepEnv = {
                    /**
                     * @member {integer} CartFiller.Api.StepEnvironment#taskIndex 0-based index of current task
                     * @access public
                     */
                    taskIndex: message.index,
                    /**
                     * @member {integer} CartFiller.Api.StepEnvironment#stepIndex 0-based index of current step within task
                     * @access public
                     */
                    stepIndex: message.step,
                    /**
                     * @member {Object} CartFiller.Api.StepEnvironment#task Task object as provided by 
                     * {@link CartFiller.submitJobDetails}
                     * @access public
                     */
                    task: message.details,
                    /**
                     * @member {integer} CartFiller.Api.StepEnvironment#repeatCounter If task is 
                     * repeated then this value will get increased each step
                     * access public
                     */
                    repeatCounter: message.repeatCounter,
                    /**
                     * @member {Object} CartFiller.Api.StepEnvironment#params Task parameters as submitted by
                     * {@link CartFiller.Api.registerCallback}
                     */
                    params: {}
                };
                try {
                    if (undefined === worker[message.task]) {
                        alert('invalid worker - no function for ' + message.task + ' exist');
                    } else if (undefined === worker[message.task][(message.step * 2) + 1]){
                        alert('invalid worker - function for ' + message.task + ' step ' + message.step + ' does not exist');
                    } else {
                        var workerFn = worker[message.task][(message.step * 2) + 1];
                        if ('function' !== typeof workerFn){
                            if ('function' === typeof workerFn[0]){
                                currentStepEnv.params = workerFn[1];
                                workerFn = workerFn[0];
                            } else {
                                alert('invalid worker - function for ' + message.task + ' step ' + message.step + ' is not a function');
                                return;
                            }
                        }
                        // register watchdog
                        registerWorkerWatchdog();
                        currentStepWorkerFn = workerFn;
                        if (message.debug) {
                            /* jshint ignore:start */
                            debugger;
                            /* jshint ignore:end */
                        }
                        workerFn(highlightedElement, currentStepEnv);
                    }
                } catch (err){
                    this.reportErrorResult(err);
                    throw err;
                }
            }
        },
        /**
         * Exception handler for worker code. If exception handles inside worker
         * then this handler will report error back to progress frame and stop
         * all worker activity
         * @function CartFiller.Dispatcher#reportErrorResult:
         * @param {Exception} err
         * @access public
         */
        reportErrorResult: function(err) {
            console.log(err);
            if (workerWatchdogId) { // api.result was not called
                var msg = String(err);
                if (! msg) {
                    msg = 'unknown exception';
                }
                me.modules.api.result(msg, false);
            }
        },
        /**
         * Pops up mainFrame window if it is popup UI, if possible
         * @function CartFiller.Dispatcher#onMessage_focusMainWindow
         * @access public
         */
        onMessage_focusMainFrameWindow: function(){
            me.modules.ui.focusMainFrameWindow();
        },
        /**
         * Forces worker reset
         * @function CartFiller.Dispatcher#onMessage_resetWorker
         * @access public
         */
        onMessage_resetWorker: function(message){
            if (this.reflectMessage(message)) {
                return;
            }
            resetWorker();
        },
        /**
         * Closes popup window in case of popup UI
         * @function CartFiller.Dispatcher#onMessage_closePopup
         * @access public
         */
        onMessage_closePopup: function(){
            me.modules.ui.closePopup();
        },
        /**
         * Receives hello message from {@link CartFillerPlugin.Plugin}
         * and sends response bessage back
         * @function CartFiller.Dispatcher#onMessage_helloFromPlugin
         * @param {Object} details
         * @access public
         */
        onMessage_helloFromPlugin: function(details){
            this.postMessageToChooseJob(details.message, {});
        },
        /**
         * Refreshes worker page
         * @function CartFiller.Dispatcher#onMessage_refreshPage
         * @param {Object} message
         * @access public
         */
        onMessage_refreshPage: function(message) {
            if (this.reflectMessage(message)) {
                return;
            }
            me.modules.ui.refreshPage();
        },
        /**
         * Starts reporting mouse pointer - on each mousemove dispatcher 
         * will send worker frame a message with details about element
         * over which mouse is now
         * @function CartFiller.Dispatcher#onMessage_startReportingMousePointer
         * @access public
         */
        onMessage_startReportingMousePointer: function() {
            me.modules.ui.startReportingMousePointer();
        },
        /** 
         * Tries to find all elements that match specified CSS selector and 
         * returns number of elements matched
         * @function CartFiller.Dispatcher#onMessage_evaluateCssSelector
         * @param {Object} details
         * @access public
         */
        onMessage_evaluateCssSelector: function(details) {
            if (me.modules.dispatcher.reflectMessage(details)) {
                return;
            }
            this.postMessageToWorker('cssSelectorEvaluateResult', {count: eval('(function(j){j.each(function(i,el){(function(o){if (o !== "0") {el.style.opacity=0; setTimeout(function(){el.style.opacity=o;},200);}})(el.style.opacity);}); return j.length;})(me.modules.ui.mainFrameWindow.jQuery' + details.selector + ')')}); // jshint ignore:line
        },
        /**
         * Processes message exchange between relays
         * @function CartFiller.Dispatcher#onMessage_bubbleRelayMessage
         * @param {Object} details
         * @param {Window} source
         * @access public
         */
        onMessage_bubbleRelayMessage: function(details, source) {
            if (relay.isSlave && source !== window.opener && ! details.notToParents) {
                postMessage(window.opener, details.cmd, details);
            }
            if (relay.nextRelay && source !== relay.nextRelay && ! details.notToChildren) {
                if (relay.nextRelayRegistered) {
                    postMessage(relay.nextRelay, details.cmd, details);
                } else {
                    relay.nextRelayQueue.push(details);
                }
            }
            if (details.message === 'onMainFrameLoaded') {
                me.modules.dispatcher.onMainFrameLoaded(details.args[0], true);
            } else if (details.message === 'openRelayOnHead' && ! relay.isSlave) {
                if (! relay.knownUrls[details.args[0]]) {
                    me.modules.dispatcher.onMessage_bubbleRelayMessage({message: 'openRelayOnTail', args: details.args, notToParents: true});
                }
            } else if (details.message === 'openRelayOnTail' && ! relay.nextRelay) {
                openRelay(details.args[0], undefined, details.args[1]);
            }
        },
        /**
         * ////
         */
        onMessage_reportingMousePointerClick: function(details) {
            if (me.modules.dispatcher.reflectMessage(details)) {
                return;
            }
            me.modules.ui.reportingMousePointerClick(details.x, details.y);
        },
        /**
         * Dispatches event issued by postMessage and captured by Dispatcher by mistake
         * @param {Object} details
         * @param {Window} source
         * @access public
         */
        onMessage_postMessage: function(details, source) {
            if (! me.modules.dispatcher.reflectMessage(details)) {
                var event;
                if ('undefined' === typeof source) {
                    event = details.originalEvent;
                } else {
                    event = new me.modules.ui.mainFrameWindow.CustomEvent('message', details.event);
                    for (var i in details.event) {
                        try {
                            event[i] = details.event[i];
                        } catch (e) {}
                    }
                }
                me.modules.ui.mainFrameWindow.dispatchEvent(event);
            }
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
         * @param {boolean} bubbling Means that we received this message from
         * another dispatcher and we should not bubble it
         * @access public
         */
        onMainFrameLoaded: function(watchdog, bubbling) {
            mainFrameLoaded = true;
            if (workerFrameLoaded && !bootstrapped){
                this.bootstrapCartFiller();
            } else if (! bubbling) {
                relay.bubbleMessage({message: 'onMainFrameLoaded', args: [watchdog]});
            }
            if (workerOnLoadHandler) {
                try {
                    callEventCallbacks('onload');
                    workerOnLoadHandler(watchdog);
                } catch (e) {
                    this.reportErrorResult(e);
                }
                workerOnLoadHandler = false;
                onLoadHappened = false;
            } else {
                onLoadHappened = true;
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
         * @param {String} messageName Optional, by default == cmd
         * @access public
         */
        postMessageToChooseJob: function(cmd, details, messageName){
            postMessage(me.modules.ui.chooseJobFrameWindow, cmd, details, messageName ? messageName : cmd);
        },
        /**
         * Launches worker (job progress frame)
         * @function CartFiller.Dispathcer#bootstrapCartFiller
         * @access public
         */
        bootstrapCartFiller: function(){
            bootstrapped = true;
            this.postMessageToWorker('bootstrap', {lib: getLibUrl(), debug: me['data-debug']});
        },
        /**
         * Negotiates with worker, fetches its task-handing code
         * fetches task steps descriptions and passes to worker (job progress)
         * frame
         * @function CartFiller.Dispatcher#registerWorker
         * @param {CartFiller.Api.registerCallback} cb
         * @access public
         */
        registerWorker: function(cb){
            var recursivelyCollectSteps = function(source, taskSteps) {
                if ('undefined' === typeof taskSteps) {
                    taskSteps = [];
                }
                for (var i = 0 ; i < source.length ; i ++) {
                    if (source[i] instanceof Array && source[i].length > 0 && 'string' === typeof source[i][0]) {
                        recursivelyCollectSteps(source[i], taskSteps);
                    } else {
                        taskSteps.push(source[i]);
                    }
                }
                return taskSteps;
            };
            var knownArgs = {
                window: me.modules.ui.mainFrameWindow,
                document: undefined,
                api: me.modules.api,
                task: workerCurrentTask,
                job: jobDetailsCache,
                globals: workerGlobals
            };
            var args = cb.toString().split('(')[1].split(')')[0].split(',').map(function(arg){
                arg = arg.trim();
                if (knownArgs.hasOwnProperty(arg)) {
                    return knownArgs[arg];
                }
                return function() {
                    while (! sharedWorkerFunctions[arg] && workersToEvaluate.length) {
                        evaluateNextWorker();
                    }
                    if (! sharedWorkerFunctions[arg]) {
                        var err = 'bad worker - shared function was not defined: [' + arg + ']';
                        alert(err);
                        throw new Error(err);
                    }
                    return sharedWorkerFunctions[arg].apply(worker, arguments);
                };
            });
            var thisWorker = cb.apply(undefined, args);
            var list = {};
            for (var taskName in thisWorker){
                if (thisWorker.hasOwnProperty(taskName)){
                    worker[taskName] = recursivelyCollectSteps(thisWorker[taskName]);
                }
            }
            for (taskName in worker) {
                var taskSteps = [];
                for (var i = 0 ; i < worker[taskName].length; i++){
                    // this is step name/comment
                    if ('string' === typeof worker[taskName][i]){
                        taskSteps.push(worker[taskName][i]);
                    }
                }
                list[taskName] = taskSteps;
            }
            this.postMessageToWorker('workerRegistered', {jobTaskDescriptions: list});
        },
        /**
         * Remembers directions for task flow to be passed to worker (job progress)
         * frame
         * @function CartFiller.Dispatcher#manageTaskFlow
         * @param {string} action
         * @access public
         */
        manageTaskFlow: function(action) {
            nextTaskFlow = action;
        },
        /**
         * Passes step result from worker to worker (job progress) frame
         * @function CartFiller.Dispatcher#submitWorkerResult
         * @see CartFiller.Api#result
         * @see CartFiller.Api#nop
         * @access public
         */
        submitWorkerResult: function(message, recoverable, response){
            if (workerCurrentStepIndex === false) {
                alert('You have invalid worker, result is submitted twice, please fix');
                return;
            }
            var status;
            if ((undefined === message) || ('' === message)) {
                status = 'ok';
            } else if ('string' === typeof message){
                status = recoverable ? 'skip' : 'error';
            } else {
                throw new Error('invalid message type ' + typeof(message));
            }
            removeWatchdogHandler();
            clearRegisteredTimeoutsAndIntervals();
            // now let's see, if status is not ok, and method is repeatable - then repeat it
            if (status !== 'ok') {
                stepRepeatCounter ++;
                var m = /repeat(\d+)/.exec(currentStepWorkerFn.toString().split(')')[0]);
                if (m && m[1] > stepRepeatCounter) {
                    setTimeout(function() {
                        currentStepWorkerFn(highlightedElement, currentStepEnv);
                    }, 1000);
                    return;
                }
            }
            this.postMessageToWorker(
                'workerStepResult', 
                {
                    index: workerCurrentTaskIndex, 
                    step: workerCurrentStepIndex, 
                    status: status, 
                    message: message,
                    response: response,
                    nop: recoverable === 'nop',
                    nextTaskFlow: nextTaskFlow,
                    globals: workerGlobals
                }
            );
            workerCurrentStepIndex = workerOnLoadHandler = false;
        },
        /**
         * Registers worker's onLoad callback for main frame
         * @function CartFiller.Dispatcher#registerWorkerOnloadCallback
         * @param {CartFiller.Api.onloadCallback} cb
         * @access public
         */
        registerWorkerOnloadCallback: function(cb){
            if (onLoadHappened) {
                try {
                    callEventCallbacks('onload');
                    cb(true);
                } catch (e) {
                    this.reportErrorResult(e);
                }
                workerOnLoadHandler = false;
            } else {
                workerOnLoadHandler = cb;
            }
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
        },
        /**
         * Registers setTimeout id to be called if step will experience timeout
         * @function CartFiller.Dispatcher#registerWorkerSetTimeout
         * @param {integer} id setTimeout result
         * @access public
         */
        registerWorkerSetTimeout: function(id){
            workerSetTimeoutIds.push(id);
        },
        /**
         * Registers setTimeout id to be called if step will experience timeout
         * @function CartFiller.Dispatcher#registerWorkerSetTimeout
         * @param {integer} id setTimeout result
         * @access public
         */
        registerWorkerSetInterval: function(id){
            workerSetIntervalIds.push(id);
        },
        /** 
         * Update current worker URL
         * @function CartFiller.Dispatcher#updateCurrentUrl
         * @param {String} url
         * @access public
         */
        updateCurrentUrl: function(url) {
            if (workerCurrentUrl !== url) {
                this.postMessageToWorker('currentUrl', {url: url});
                workerCurrentUrl = url;
            }
        },
        /**
         * Pass message to next dispatcher if this one does not have access.
         * If there is no next dispatcher - then open new popup for dispatcher
         * @function CartFiller.Dispatcher#reflectMessage
         * @param {Object} message
         * @return bool
         * @access public
         */
        reflectMessage: function(message) {
            // check whether we can access the target window at all
            var haveAccess = true;
            try {
                me.modules.ui.mainFrameWindow.location.href;
            } catch (e){
                haveAccess = false;
            }
            if (haveAccess) {
                return false;
            }
            if (message.cmd === 'invokeWorker') {
                message.globals = workerGlobals;
            }
            openRelay('about:blank', message);
            return true;
        },
        /**
         * Starts whole piece in slave mode
         * @function CartFiller.Dispatcher~startSlaveMode
         * @access public
         */
        startSlaveMode: function() {
            // operating in slave mode, show message to user
            var body = document.getElementsByTagName('body')[0];
            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            var span = document.createElement('span');
            span.innerText = 'this frame is used by cartFiller as slave, do not close it';
            body.appendChild(span);
            // initialize
            worker = {};
            me.modules.dispatcher.init();
            window.opener.postMessage('cartFillerMessage:{"cmd":"register"}', '*');
            me.modules.ui.chooseJobFrameWindow = me.modules.ui.workerFrameWindow = window.opener;
            for (var opener = window.opener; opener && opener !== opener.opener; opener = opener.opener) {
                if (opener.frames.cartFillerMainFrame) {
                    me.modules.ui.mainFrameWindow = opener.frames.cartFillerMainFrame;
                }
            }
            if (! me.modules.ui.mainFrameWindow) {
                alert('could not find mainFrameWindow in slave mode');
            }
            me.modules.dispatcher.registerLoadWatcher();
            relay.isSlave = true;
            setInterval(function(){
                var url = false;
                try {
                    if (me.modules.ui.mainFrameWindow && me.modules.ui.mainFrameWindow.location) {
                        url = me.modules.ui.mainFrameWindow.location.href;
                    }
                } catch (e) {
                }
                if (url) {
                    me.modules.dispatcher.updateCurrentUrl(url);
                }
            },100);
        },
        /**
         * Registers watcher that tracks onload events of main frame
         * @function CartFiller.Dispatcher~registerLoadWatcher
         * @access public
         */
        registerLoadWatcher: function() {
            setTimeout(function loadWatcher(){
                try {
                    if (me.modules.ui.mainFrameWindow.document &&
                        (me.modules.ui.mainFrameWindow.document.readyState === 'complete') &&
                        ! me.modules.ui.mainFrameWindow.document.getElementsByTagName('html')[0].getAttribute('data-cartfiller-reload-tracker')){
                        me.modules.ui.mainFrameWindow.document.getElementsByTagName('html')[0].setAttribute('data-cartfiller-reload-tracker', 0);
                        me.modules.dispatcher.onMainFrameLoaded(true);
                    }
                } catch (e){}
                setTimeout(loadWatcher, 100);
            }, 100);
        },
        /**
         * Opens relay window. If url points to the cartFiller distribution
         * @function CartFiller.Dispatcher~openRelayOnTheTail
         * @param {string} url
         * @param {boolean} noFocus
         * @access public
         */
        openRelayOnTheTail: function(url, noFocus) {
            me.modules.dispatcher.onMessage_bubbleRelayMessage({message: 'openRelayOnHead', args: [url, noFocus], notToChildren: true});
        },
        /**
         * See {@link CartFiller.Api#registerOnloadCallback}
         * @function CartFiller.Dispatcher#registerEventCallback
         * @param {string} event event alias
         * @param {string} alias callback alias, '' by default
         * @param {CartFiller.Api.onloadEventCallback} callback callback
         * @access public
         */
        registerEventCallback: function(event, alias, callback){
            if (undefined === workerEventListeners[event]) {
                workerEventListeners[event] = {};
            }
            workerEventListeners[event][alias] = callback;
        },
        /** 
         * Return current worker task properties
         * @function CartFiller.Dispatcher#getWorkerTask
         * @return {CartFiller.TaskDetails}
         * @access public
         */
        getWorkerTask: function() {
            return workerCurrentTask;
        },
        /** 
         * Return current worker task properties
         * @function CartFiller.Dispatcher#getWorkerGlobals
         * @return {Object}
         * @access public
         */
        getWorkerGlobals: function() {
            return workerGlobals;
        },
        /**
         * Returns worker object
         * @function CartFiller.Dispatcher#getWorker
         * @return {CartFiller.WorkerTasks}
         * @access public
         */
        getWorker: function() {
            return worker;
        },
        /**
         * ////
         */
        defineSharedWorkerFunction: function(name, fn){
            sharedWorkerFunctions[name] = fn;
        }
    });
}).call(this, document, window);
