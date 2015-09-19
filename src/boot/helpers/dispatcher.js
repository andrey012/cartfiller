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
     * Keeps last known window title to save some coins on updating title
     * @var {String} CartFiller.Dispatcher~oldTitle
     * @access private
     */
    var oldTitle;
    /**
     * Keeps value (ms) to sleep after this step in slow mode
     * @var {integer} CartFiller.Dispatcher~sleepAfterThisStep
     * @access private
     */
    var sleepAfterThisStep;
    /**
     * This is passed to ChooseJob frame to prevent it from requesting assets directly.
     * If set to true, then ChooseJob should instead ask dispatcher to give it assets, 
     * and dispatcher will itself ask the opener, which should be the local.html
     * @var {boolean} CartFiller.Dispatcher~useTopWindowForLocalFileOperations
     * @access private
     */
    var useTopWindowForLocalFileOperations;
    var currentInvokeWorkerMessage;
    var suspendAjaxRequestsCallback;
    var magicParamPatterns = {
        repeat: /repeat(\d+)/,
        sleep: /sleep(\d+)/
    };
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
        igniteFromLocal: false,
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
        clearRegisteredTimeoutsAndIntervals();
        workerCurrentTaskIndex = workerCurrentStepIndex = workerOnLoadHandler = suspendAjaxRequestsCallback = false;
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
        var value;
        for (var newKey in src){
            if (src.hasOwnProperty(newKey)){
                value = src[newKey];
                if (value instanceof Array) {
                    value = workerGlobals[decodeAlias(value)];
                }
                workerCurrentTask[newKey] = value;
            }
        }
    };
    /** 
     * Decodes nested alias. To be documented
     * @function CartFiller.Dispatcher~decodeAlias
     * @param {String|Array} alias
     * @access private
     * @return {String}
     */
    var decodeAlias = function(alias) {
        var pc = alias.map(function(part) {
            return part instanceof Array ? String(workerGlobals[decodeAlias(part)]) : part;
        });
        return pc.join('');
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
        return me.localIndexHtml ? '' : me.baseUrl.replace(/(src|dist)\/?$/, 'lib/');
    };
    /**
     * Keeps directions on next task flow
     * @var {string} CartFiller.Dispatcher~nextTaskFlow
     * @access private
     */
    var nextTaskFlow;
    /**
     * Prevent double initialization when launched from slave mode
     * @var {boolean} CartFiller.Dispathcer~initialized
     */
    var initialized;
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
                workerOnLoadHandler = suspendAjaxRequestsCallback = false;
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
            if (me.localInjectJs) {
                relay.igniteFromLocal = true;
                setTimeout(function igniteFromLocal() {
                    if (relay.igniteFromLocal) {
                        relay.nextRelay.postMessage(me.localInjectJs, '*');
                        setTimeout(igniteFromLocal, 500);
                    }
                }, 500);
            }
        }
    };
    var workersToEvaluate = [];
    var sharedWorkerFunctions = {};
    var currentEvaluatedWorker;
    var workerTaskSources = {};
    var evaluateNextWorker = function() {
        if (! workersToEvaluate.length) {
            me.modules.dispatcher.postMessageToWorker(
                'globalsUpdate', 
                {
                    globals: workerGlobals
                }
            );
            return;
        }
        currentEvaluatedWorker = workersToEvaluate.shift();
        var apiIsThere = false;
        var injectDebuggerFn = function(match, fn, nl) {
            if ((! apiIsThere) && /\,\s*api\s*\,/.test(match)) {
                apiIsThere = true;
            }
            if (apiIsThere) {
                return fn + ' if(api.debugger()) debugger;' + (-1 === nl.indexOf('\n') ? '\n' : nl);
            } else {
                return match;
            }
        };
        eval(workerSourceCodes[currentEvaluatedWorker].replace(/(function\([^)]*\)\s*{[ \t]*)([\n\r]*)/g, injectDebuggerFn)); // jshint ignore:line
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
    /**
     * Discovers if a step depends on result of previous step.
     * If yes, then user should be prompted, that if he clicks on 
     * this step straight away - then most likely it will not succeed
     * @function CartFiller.Dispatcher~discoverStepDependencies
     * @param {Function} fn
     */
    var discoverStepDependencies = function(fn) {
        var firstParam = fn.toString().split('(')[1].split(')')[0].split(',')[0].trim();
        if (firstParam.length) {
            for (var i in magicParamPatterns) {
                if (magicParamPatterns[i].test(firstParam)) {
                    // it is magic param
                    return false;
                }
            }
            return true;
        }
        return false;
    };
    /**
     * Discovers task parameters, that are used by this function 
     * looking for patters like task.theparameter or task['the parameter']
     * @function CartFiller.Dispatcher~discoverTaskParameters
     * @param {Function} fn
     * @param {Object} allParams holds all parameters, parameters discovered
     * here are added to this map
     * @return {Object} discovered parameters
     * @access private
     */
    var discoverTaskParameters = function(fn, allParams) {
        var params = {};
        [
            /[^a-zA-Z0-9_$]task\.([a-zA-Z0-9_$]+)[^a-zA-Z0-9_$]/g, 
            /[^a-zA-Z0-9_$]task\[['"]([^'"]+)['"]\]/g]
            .filter(function(pattern) {

                var localPattern = new RegExp(pattern.source);
                var s = fn.toString();
                var m = s.match(pattern);
                if (m) {
                    m.filter(function(v){
                        var paramMatch = localPattern.exec(v);
                        if (paramMatch) {
                            params[paramMatch[1]] = allParams[paramMatch[1]] = true;
                        }
                    });
                }

                var declaredParameterList = fn.cartFillerParameterList;
                if ('undefined' !== typeof declaredParameterList) {
                    if (declaredParameterList instanceof Array) {
                        declaredParameterList.filter(function(v) {
                            params[v] = allParams[v] = true;
                        });
                    } else {
                        for (var i in declaredParameterList) {
                            params[i] = allParams[i] = true;
                        }
                    }
                }
            });
        return params;
    };
    
    var startupWatchDog = {
        fn: function() {
            var pc = [];
            if (! this.workerRegistered) {
                pc.push('worker');
            }
            if (pc.length) {
                var message = 'one or more frames were not registered: ' + pc.join(', ');
                if (window.cartFillerEventHandler) {
                    window.cartFillerEventHandler({message: message, filename: 'dispatcher.js', lineno: 0});
                }
                alert(message);
            }
        },
        workerRegistered: false,
        chooseJobRegistered: false,
        mainRegistered: false
    };

    this.cartFillerConfiguration.scripts.push({
        running: false,
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
         * @parameter {boolean} isSlaveMode
         * @access public
         */
        init: function(isSlaveMode){
            if (! isSlaveMode) {
                setTimeout(function() {startupWatchDog.fn();}, 10000);
            }
            var dispatcher = this;
            if (initialized) {
                return;
            }
            initialized = true;
            window.addEventListener('message', function(event) {
                var prefix = 'cartFillerMessage:';
                if (prefix === event.data.substr(0, prefix.length)) {
                    var message = JSON.parse(event.data.substr(prefix.length));
                    if (event.source === relay.nextRelay && message.cmd !== 'register' && message.cmd !== 'bubbleRelayMessage' && message.cmd !== 'locate') {
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
                } else if (0 === event.data.indexOf('cartFillerFilePopupUrl') || 0 === event.data.indexOf('cartFillerFilePopupPing')) {
                    // just relay
                    window.opener.postMessage(event.data, '*');
                } else if ('/^\'cartFillerEval\'/' === event.data) {
                    // launch slave frame
                    event.source.postMessage(me.localInjectJs, '*');
                } else if (0 === event.data.indexOf('\'cartFillerEval\';')) {
                    // ignition from local message, ignore it, we are already launched
                } else {
                    // this message was received by an accident and we need to resend it to mainFrame where
                    // real recipient is.
                    var deepCopy = function(x, k, d) {
                        if (d > 20) {
                            // too deep
                            return {};
                        }
                        if ('undefined' === typeof d) {
                            d = 0;
                        }
                        if ('undefined' === typeof k) {
                            k = [];
                        }
                        var e;
                        var known = function(v) { return v === e ; };
                        var r = {};
                        for (var i in x) {
                            e = x[i];
                            try {
                                if (! (e instanceof Window) && ! (e instanceof Function) && '[object Window]' !== e.toString()) {
                                    var c = null;
                                    try {
                                        if ('object' === typeof e && e.constructor) {
                                            c = e.constructor.name;
                                        }
                                    } catch (e) {}
                                    if (c !== 'Window') {
                                        if (! k.filter(known).length) {
                                            k.push(e);
                                            if ('object' === typeof x[i]) {
                                                r[i] = deepCopy(e, k, d + 1);
                                            } else {
                                                r[i] = x[i];
                                            }
                                        }
                                    }
                                }
                            } catch (e) {}
                        }
                        return r;
                    };
                    me.modules.dispatcher.onMessage_postMessage({cmd: 'postMessage', event: deepCopy(event), originalEvent: event});
                }
                return false;
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
                startupWatchDog.workerRegistered = true;
                if (mainFrameLoaded && !bootstrapped){
                    this.bootstrapCartFiller();
                }
            } else if (source === me.modules.ui.chooseJobFrameWindow) {
                startupWatchDog.chooseJobRegistered = true;
                this.postMessageToChooseJob('bootstrap', {
                    lib: getLibUrl(),
                    testSuite: true,
                    src: me.localIndexHtml ? '' : me.baseUrl.replace(/\/$/, '') + '/',
                    hashUrl: window.location.hash
                }, 'cartFillerMessage');
            } else if (source === me.modules.ui.mainFrameWindow) {
                startupWatchDog.mainRegistered = true;
                postMessage(source, 'bootstrap', {dummy: true});
            } else if (source === relay.nextRelay) {
                relay.igniteFromLocal = false;
                relay.nextRelayRegistered = true;
                var url;
                var codeToSend = [];
                for (url in workerSourceCodes) {
                    if (workerSourceCodes.hasOwnProperty(url)) {
                        codeToSend.push(url);
                    }
                }
                for (var i = codeToSend.length - 1; i >= 0 ; i --) {
                    relay.nextRelayQueue.unshift({cmd: 'loadWorker', jobDetailsCache: jobDetailsCache, url: codeToSend[i], code: workerSourceCodes[codeToSend[i]], isFinal: (i === codeToSend.length - 1)});
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
         * @param {Object} details
         * @access public
         */
        onMessage_toggleSize: function(details){
                me.modules.ui.setSize(details.size);
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
            if (relay.isSlave) {
                //////
                message.message = 'sendStatus';
                message.notToChildren = true;
                message.cmd = 'bubbleRelayMessage';
                this.onMessage_bubbleRelayMessage(message);
            } else {
                if (statusMessageName){
                    this.postMessageToChooseJob(statusMessageName, message);
                }
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
                if (message.jobDetailsCache) {
                    jobDetailsCache = message.jobDetailsCache;
                }
                workerSourceCodes[message.src] = message.code;
                if (message.isFinal) {
                    evaluateWorkers();
                }
                if (relay.nextRelay) {
                    message.jobDetailsCache = jobDetailsCache;
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
                var value = message.value;
                if (value instanceof Array) {
                    value = workerGlobals[decodeAlias(value)];
                }
                workerCurrentTask[message.name] = value;
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
            currentInvokeWorkerMessage = message;
            if (message.globals) {
                fillWorkerGlobals(message.globals);
            } 
            this.running = message.running;
            if (! relay.isSlave && ((! message.drillToFrame) || (! message.drillToFrame.length))) {
                // ok, this is original call, we can clear all overlays, etc
                me.modules.ui.prepareTolearOverlaysAndReflect();
            }
            if (this.reflectMessage(message, message.drillToFrame)) {
                if (message.debug) {
                    console.log('Debugger call went to slave tab - look for it there!');
                }
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
                        sleepAfterThisStep = undefined;
                        currentStepWorkerFn = workerFn;
                        me.modules.api.debugger(message.debug);
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
            if (relay.nextRelay) {
                openRelay('about:blank', message);
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
            this.postMessageToChooseJob(details.message, {useTopWindowForLocalFileOperations: useTopWindowForLocalFileOperations});
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
            var arrow = [];
            var elements;
            try {
                elements = eval('(function(window, document, jQuery, $, api){return jQuery' + details.selector + ';})(me.modules.ui.mainFrameWindow, me.modules.ui.mainFrameWindow.document, me.modules.ui.mainFrameWindow.jQuery, me.modules.ui.mainFrameWindow.$, me.modules.api);'); // jshint ignore:line
            } catch (e) {
                elements = [];
            }
            for (var i = 0; i < elements.length && i < 16 ; i ++ ) {
                arrow.push(elements[i]);
            }
            me.modules.ui.clearOverlays();
            me.modules.ui.arrowTo(arrow, true, true);
            this.postMessageToWorker('cssSelectorEvaluateResult', {count: elements.length});
        },
        /**
         * Processes message exchange between relays
         * @function CartFiller.Dispatcher#onMessage_bubbleRelayMessage
         * @param {Object} details
         * @param {Window} source
         * @access public
         */
        onMessage_bubbleRelayMessage: function(details, source) {
            details.cmd = 'bubbleRelayMessage';
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
                    relay.knownUrls[details.args[0]] = true;
                    me.modules.dispatcher.onMessage_bubbleRelayMessage({message: 'openRelayOnTail', args: details.args, notToParents: true});
                }
            } else if (details.message === 'openRelayOnTail' && ! relay.nextRelay) {
                openRelay(details.args[0], undefined, details.args[1]);
            } else if (details.message === 'updateTitle') {
                me.modules.dispatcher.onMessage_updateTitle(details);
            } else if (details.message === 'drill' && ! relay.isSlave) {
                details.cmd = 'invokeWorker';
                me.modules.dispatcher.onMessage_invokeWorker(details);
            } else if (details.message === 'drawOverlays') {
                me.modules.ui.drawOverlays(details);
            } else if (details.message === 'clearOverlays') {
                me.modules.ui.clearOverlays();
            } else if (details.message === 'drawOverlays') {
                me.modules.ui.drawOverlays();
            } else if (details.message === 'tellWhatYouHaveToDraw') {
                me.modules.ui.tellWhatYouHaveToDraw();
            } else if (details.message === 'sendStatus' && source && (! relay.isSlave)) {
                //////
                me.modules.dispatcher.onMessage_sendStatus(details);
            } else if (details.message === 'clearCurrentUrl' && source) {
                me.modules.dispatcher.onMessage_clearCurrentUrl();
            } else if (details.message === 'prepareToClearOverlays') {
                me.modules.ui.prepareToClearOverlays();
            }
        },
        /**
         * Used by progress frame for selector builder
         * @function CartFiller.Dispatcher#onMessage_reportingMousePointerClick
         * @param {Object} details
         * @access public
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
        onMessage_postMessage: function(details) {
            if (/^cartFillerFilePopup/.test(details.event.data)) {
                me.modules.ui.chooseJobFrameWindow.postMessage(details.event.data, '*');
            } else {
                if (! me.modules.dispatcher.reflectMessage(details)) {
                    var event;
                    event = new me.modules.ui.mainFrameWindow.CustomEvent('message', details.event);
                    for (var i in details.event) {
                        try {
                            event[i] = details.event[i];
                        } catch (e) {}
                    }
                    me.modules.ui.mainFrameWindow.dispatchEvent(event);
                }
            }
        },
        /**
         * Just alerts, used to help user to find this tab after slave tab poped up
         * @function CartFiller.Dispatcher#onMessage_locate
         * @access public
         */
        onMessage_locate: function() {
            alert('Here I am!');
        },
        /**
         * Update hash URL of top window
         * @function CartFiller.Dispatcher#onMessage_updateHashUrl
         * @param {Object} details
         * @access public
         */
        onMessage_updateHashUrl: function(details) {
            var params = details.params;
            var hash = window.location.hash.replace(/^#\/?/, '').split('&').map(function(v) {
                for (var i in params) {
                    var name = encodeURIComponent(i);
                    if (0 === v.indexOf(name + '=')) {
                        var r = (params[i] !== '' && params[i] !== false) ? (name + '=' + encodeURIComponent(params[i])) : '';
                        delete params[i];
                        return r;
                    }

                }
                return v;
            }).filter(function(v){ return v.length; });
            for (var i in params) {
                if (params[i] !== '' && params[i] !== false) {
                    hash.push(encodeURIComponent(i) + '=' + encodeURIComponent(params[i]));
                }
            }
            var hashString = hash.join('&');
            if (hashString.length < 4096) {
                window.location.hash = hashString;
            }
        },
        /**
         * Updates title
         * @function CartFiller.Dispatcher#onMessage_updateTitle
         * @param {Object} details
         * @access public
         */
        onMessage_updateTitle: function(details) {
            window.document.title = details.title;
        },
        /**
         * Passes loadWorker message to chooseJobFrame
         * @function CartFiller.Dispatcher#onMessage_requestWorkers
         * @param {Object} details
         * @access public
         */
        onMessage_requestWorkers: function(details) {
            this.postMessageToChooseJob('cartFillerRequestWorkers', details);
        },
        /**
         * Launches cartfiller from slave mode - in specific case, when this tab is a popup tab
         * invoked by local/index.html
         * @function CartFiller.Dispatcher#onMessage_launchFromSlave
         * @access public
         */
        onMessage_launchFromSlave: function() {
            useTopWindowForLocalFileOperations = true;
            me.launch(true);
        },
        /**
         * When user hovers over element button in selector query builder
         * we should highlight apropriate element
         * @function CartFiller.Dispatcher#onMessage_highlightElementForQueryBuilder
         * @param {Object} details details.path should contain DOM path to an element to be highlighted
         * @access public
         */
        onMessage_highlightElementForQueryBuilder: function(details) {
            if (me.modules.dispatcher.reflectMessage(details)) {
                return;
            }
            me.modules.ui.highlightElementForQueryBuilder(details.path);
        },
        /**
         * Update global value from progress frame
         * @function CartFiller.Dispatcher#onMessage_updateGlobal
         * @param {Object} details
         * @access public
         */
        onMessage_updateGlobal: function(details) {
            this.reflectMessage(details);
            workerGlobals[details.name] = details.value;
            fillWorkerCurrentTask(currentStepEnv.task);
        },
         /*
         *
         */
        onMessage_toggleEditorMode: function(details) {
            ////
            this.onMessage_sendStatus({'toggleEditorMode': true, enable: details.enable});
            if (details.cb) {
                suspendAjaxRequestsCallback = details.cb;
            }
            if (details.enable) {
                this.postMessageToWorker('toggleEditorModeResponse', {enabled: true});
            }
        },
        /**
         * 
         */
        onMessage_suspendAjaxRequestsDone: function(details) {
            if (this.reflectMessage(details)) {
                return;
            }
            this.postMessageToWorker('toggleEditorModeResponse');
            if (suspendAjaxRequestsCallback) {
                suspendAjaxRequestsCallback();
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
                    if (source[i] === me.modules.api) {
                        // do nothing
                    } else if (
                        source[i] instanceof Array && 
                        (
                            (source[i].length === 0) || 
                            (
                                source[i].length > 0 && 
                                (
                                    ('string' === typeof source[i][0]) || 
                                    (source[i][0] instanceof Array)
                                )
                            )
                        )
                    ) {
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
            for (var taskName in thisWorker){
                if (thisWorker.hasOwnProperty(taskName)){
                    worker[taskName] = recursivelyCollectSteps(thisWorker[taskName]);
                    workerTaskSources[taskName] = currentEvaluatedWorker;
                }
            }
            if (! workersToEvaluate.length) {
                // only do this for last worker
                var list = {};
                var discoveredParameters = {};
                var stepDependencies = {};
                for (taskName in worker) {
                    stepDependencies[taskName] = {};
                    var taskSteps = [];
                    var params = {};
                    var allParams = {};
                    for (var i = 0 ; i < worker[taskName].length; i++){
                        // this is step name/comment
                        if ('string' === typeof worker[taskName][i]){
                            taskSteps.push(worker[taskName][i]);
                            if (worker[taskName][i+1] instanceof Function) {
                                params[taskSteps.length - 1] = discoverTaskParameters(worker[taskName][i+1], allParams);
                                stepDependencies[taskName][taskSteps.length - 1] = discoverStepDependencies(worker[taskName][i+1]);
                            }
                        }
                    }
                    params.all = allParams;
                    list[taskName] = taskSteps;
                    discoveredParameters[taskName] = params;
                }
                this.postMessageToWorker('workerRegistered', {
                    jobTaskDescriptions: list, 
                    discoveredParameters: discoveredParameters, 
                    workerTaskSources: workerTaskSources,
                    stepDependencies: stepDependencies
                });
            }
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
            if (suspendAjaxRequestsCallback) {
                suspendAjaxRequestsCallback = false;
                this.onMessage_toggleEditorMode({enable: true});
            }
            if (workerCurrentStepIndex === false) {
                alert('You have invalid worker, result is submitted twice, please fix');
                return;
            }
            // update worker globals if necessary
            for (var i in currentStepEnv.task) {
                // was task property an alias? 
                if (currentStepEnv.task[i] instanceof Array) {
                    // if it was nested alias - we need to find the deepest one
                    for (var alias = currentStepEnv.task[i][0]; alias[0] instanceof Array; alias = alias[0]) {}
                    workerGlobals[decodeAlias(currentStepEnv.task[i])] = workerCurrentTask[i];
                }
            }
            var status, m;
            if ((undefined === message) || ('' === message)) {
                status = 'ok';
            } else if ('string' === typeof message){
                status = recoverable ? 'skip' : 'error';
            } else {
                throw new Error('invalid message type ' + typeof(message));
            }
            removeWatchdogHandler();
            clearRegisteredTimeoutsAndIntervals();
            // tell UI that now it can tell all slaves what to draw
            this.onMessage_bubbleRelayMessage({
                message: 'tellWhatYouHaveToDraw'
            });
            // now let's see, if status is not ok, and method is repeatable - then repeat it
            if (status !== 'ok') {
                stepRepeatCounter ++;
                m = magicParamPatterns.repeat.exec(currentStepWorkerFn.toString().split(')')[0]);
                if (m && parseInt(m[1]) > stepRepeatCounter) {
                    me.modules.api.setTimeout(function() {
                        currentStepWorkerFn(highlightedElement, currentStepEnv);
                    }, 1000);
                    return;
                }
            } else {
                // see how long should we sleep;
                if ('undefined' === typeof sleepAfterThisStep) {
                    m = magicParamPatterns.sleep.exec(currentStepWorkerFn.toString().split(')')[0]);
                    if (m) {
                        sleepAfterThisStep = parseInt(m[1]);
                    }
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
                    globals: workerGlobals,
                    sleep: sleepAfterThisStep
                }
            );
            workerCurrentStepIndex = workerOnLoadHandler = suspendAjaxRequestsCallback = false;
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
                this.onMessage_bubbleRelayMessage({message: 'clearCurrentUrl'});
                workerCurrentUrl = url;
            }
        },
        /**
         * Clears current url from this dispatcher - if another
         * dispatcher has one
         */
        onMessage_clearCurrentUrl: function() {
            workerCurrentUrl = false;
        },
        ////
        haveAccess: function(framesPath) {
            var windowToCheck = me.modules.ui.mainFrameWindow;
            (framesPath || []).filter(function(index) {
                windowToCheck = windowToCheck.frames[index];
            });
            try {
                windowToCheck.location.href;
            } catch (e){
                return false;
            }
            return true;
        },
        /**
         * Pass message to next dispatcher if this one does not have access.
         * If there is no next dispatcher - then open new popup for dispatcher
         * @function CartFiller.Dispatcher#reflectMessage
         * @param {Object} message
         * @param {integer} frameIndex
         * @return bool
         * @access public
         */
        reflectMessage: function(message, framesPath) {
            if (this.haveAccess(framesPath)) {
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
            var link = document.createElement('a');
            try {
                link.textContent = 'This tab is used by cartFiller as slave, DO NOT CLOSE IT!, click this message to locate original tab.';
                link.style.color = 'red';
                link.style.display = 'block';
                link.style.padding = '20px';
                link.setAttribute('href', '#');
                link.onclick = function() {
                    window.opener.postMessage('cartFillerMessage:{"cmd":"locate"}', '*');
                };
            } catch (e) {}
            body.appendChild(link);
            try {
                link.focus();
            } catch (e) {}
            // initialize
            worker = {};
            me.modules.dispatcher.init(true);
            window.opener.postMessage('cartFillerMessage:{"cmd":"register"}', '*');
            me.modules.ui.chooseJobFrameWindow = me.modules.ui.workerFrameWindow = window.opener;
            try { // this can fail when Cartfiller tab is opened from local/index.html
                for (var opener = window.opener; opener && opener !== opener.opener; opener = opener.opener) {
                    try {
                        if (opener.frames.cartFillerMainFrame) {
                            me.modules.ui.mainFrameWindow = opener.frames.cartFillerMainFrame;
                            break;
                        }
                    } catch (e) {}
                }
            } catch (e) {
                return; 
            }   
            if (! me.modules.ui.mainFrameWindow) {
                // probably we are still going to switch to UI mode, so we'll report this failure after 10 seconds
                setTimeout(function() {
                    if (! me.uiLaunched) {
                        alert('could not find mainFrameWindow in slave mode');
                    }
                }, 10000);
                return;
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
                var title;
                try {
                    if (me.modules.ui.mainFrameWindow.document &&
                        (me.modules.ui.mainFrameWindow.document.readyState === 'complete') &&
                        ! me.modules.ui.mainFrameWindow.document.getElementsByTagName('html')[0].getAttribute('data-cartfiller-reload-tracker')){
                        me.modules.ui.mainFrameWindow.document.getElementsByTagName('html')[0].setAttribute('data-cartfiller-reload-tracker', 0);
                        me.modules.dispatcher.onMainFrameLoaded(true);
                    }
                    title = 'undefined' === typeof me.modules.ui.mainFrameWindow.document.title ? '' : me.modules.ui.mainFrameWindow.document.title;
                } catch (e){}
                if (oldTitle !== title) {
                    oldTitle = title;
                    if ('undefined' !== typeof title) {
                        me.modules.dispatcher.onMessage_updateTitle({title: title});
                        relay.bubbleMessage({message: 'updateTitle', title: title});
                    }
                }
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
         * Defines shared worker function for later use in other workers
         * @function CartFiller.Dispatcher#defineSharedWorkerFunction
         * @param {String} name
         * @param {Function} fn
         * @access public
         */
        defineSharedWorkerFunction: function(name, fn){
            sharedWorkerFunctions[name] = fn;
        },
        /**
         * Set sleepAfterThisStep
         * @function CartFiller.Dispatcher#setSleepAfterThisStep
         * @param {integer} time (ms)
         * @access public
         */
        setSleepAfterThisStep: function(sleep) {
            sleepAfterThisStep = sleep;
        },
        drill: function(frameIndexes) {
            workerCurrentStepIndex = workerOnLoadHandler = suspendAjaxRequestsCallback = false;
            currentInvokeWorkerMessage.drillToFrame = this.getFrameToDrill();
            currentInvokeWorkerMessage.drillToFrame.push(frameIndexes);
            currentInvokeWorkerMessage.message = 'drill';
            currentInvokeWorkerMessage.notToChildren = true;
            currentInvokeWorkerMessage.notToParents = false;
            this.onMessage_bubbleRelayMessage(currentInvokeWorkerMessage);
        },
        isDrilling: function() {
            return 'undefined' !== typeof currentInvokeWorkerMessage.drillToFrame;
        },
        getFrameToDrill: function() {
            return currentInvokeWorkerMessage.drillToFrame ? currentInvokeWorkerMessage.drillToFrame : [];
        },
        isSlave: function() {
            return relay.isSlave;
        }
    });
}).call(this, document, window);
