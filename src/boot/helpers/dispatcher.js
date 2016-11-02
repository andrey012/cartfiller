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
    var postMessageFromWindowToWindow = function(cmd, details, from, to) {
        from.tmpReference1892049810jf10jfa = to;
        details.cmd = cmd;
        var payload = 'cartFillerMessage:' + JSON.stringify(details);
        from.eval('tmpReference1892049810jf10jfa.postMessage(' + JSON.stringify(payload) + ', "*");');
    };
    var reinitializeWorker = function() {
        var task = workerCurrentTask;
        var api = me.modules.api;
        var getStack = function() {
            return (workerGlobals['_foreach stack'] || '').split('|');
        };
        var setStack = function(pc) {
            workerGlobals['_foreach stack'] = pc.join('|');
        };
        worker = {
            '_set': ['set [ref] to [value]', function() { api.internalDebugger(); task.ref = task.value; api.result(); }],
            '_loop': ['check [ref] against [value]', function() { api.internalDebugger(); if (parseInt(task.ref) < parseInt(task.value)) { api.repeatTask(task.tasks); } api.result();}],
            '_inc': ['inc [ref]', function() { api.internalDebugger(); task.ref = parseInt(task.ref) + 1; api.result(); }],
            '_assertEquals': ['assert that [ref] is equals to [value]', function() { api.internalDebugger().result(api.compare(task.value, task.ref)); }],
            '_wait': ['wait for tasks to be added', function() { api.internalDebugger().repeatTask().setTimeout(api.result, 1000);}],
            '_say': ['say some static message', function() { 
                if (task.clear) {
                    api.arrow();
                }
                api.internalDebugger()
                    .say(task.message, task.pre, task.nextButton)
                    .sleep(task.sleepMs);
                if (! task.nextButton) {
                    api.result(); 
                }
            }],
            '_foreach': [
                'check whether we are looping', function() {
                    api.internalDebugger();
                    var pc = getStack(), myIndex = -1, myStack = '', index = 0;
                    pc.filter(function(v, k) {
                        if (parseInt(v.split(':')[0]) === api.env.taskIndex) {
                            myIndex = k;
                            myStack = v;
                        }
                    });
                    if (myIndex !== -1) {
                        var ppc = myStack.split(':');
                        pc = pc.slice(0, myIndex);
                        if (ppc[2] === '*') {
                            // ok, we are looping 
                            index = parseInt(ppc[1]);
                        }
                    }
                    myStack = String(api.env.taskIndex) + ':' + index;
                    pc.push(myStack);
                    setStack(pc);
                    api.nop();
                }, 'initialize values', function() {
                    api.internalDebugger();
                    var pc = getStack();
                    var recent = pc.pop();
                    var ppc = recent.split(':');
                    var index = parseInt(ppc[1]);
                    var values = task.values.split(task.separator);
                    task.index = index;
                    task.value = values[index];
                    if (task.fields) {
                        var valuePc = task.value.split(task.fieldSeparator || ',').map(function(v){ return v.trim(); });
                        task.fields.split(task.fieldSeparator || ',').filter(function(field) {
                            workerGlobals[field] = valuePc.shift();
                        });
                    }
                    if (index === values.length - 1) {
                        recent = ppc[0] + ':-';
                        pc.push(recent);
                        setStack(pc);
                    }
                    api.nop();
                }
            ],
            '_endforeach':[
                'loop', function() {
                    api.internalDebugger();
                    var pc = getStack();
                    var recent = pc.pop();
                    var ppc = recent.split(':');
                    if (ppc[1] === '-') {
                        setStack(pc);
                        return api.nop();
                    }
                    recent = String(ppc[0]) + ':' + String(parseInt(ppc[1]) + 1) + ':*';
                    pc.push(recent);
                    setStack(pc);
                    api.repeatTask(1 + api.env.taskIndex - parseInt(ppc[0])).nop();
                }
            ]
        };
    };
    var INTERPOLATE_PATTERN = /(^|[^\\])\$\{([^}]+)}/;
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
    /**
     * @var {boolean} CartFiller.Dispatcher~captureWorkerFnResult if set to true
     * then api.result(v) call will be implicitly converted to api.return(v).result();
     * @access private
     */
    var captureWorkerFnResult = false;

    var workerGlobals = {};
    var currentCf;
    var workerLibResolve = function(arg, promise, path) {
        var name, type;

        if ('function' === typeof arg || arg instanceof Array) {
            var evaluateArg = false;
            if (undefined === promise.promiseArgs[0] && 'function' === typeof arg && 'string' === typeof arg.name && arg.name.length) {
                // this is case: lib()(function findSomeButton() {...})
                type = 'helper';
                name = arg.name;
            } else if ('string' === typeof promise.promiseArgs[0] && promise.promiseArgs[0].length && ('function' !== typeof arg || 'string' !== typeof arg.name || ! arg.name.length)) {
                // this is case: lib('getSomeSteps')(function() { ... })
                // or lib('getSomeSteps')([ 'step1', ... ])
                type = 'step builder';
                name = promise.promiseArgs[0];
                evaluateArg = true;
            } else {
                throw new Error('invalid lib usage, name of function should either be specified as a parameter or named function should be used');
            }
            var args = promise.promiseArgs.slice(1);
            if ('function' === typeof arg) {
                // this is case: lib('getSomeSteps')(function() { ... })
                workerLibByWorkerPath[path][name] = arg;
                workerLibByWorkerPath[path][name].cartFillerWorkerLibType = type;
                return evaluateArg ? arg.apply({}, args) : [];
            } else {
                workerLibByWorkerPath[path][name] = function() {
                    return arg;
                };
                workerLibByWorkerPath[path][name].cartFillerWorkerLibType = type;
                return arg;
            }
        } else {
            name = promise.promiseArgs[0];
            if ('function' === typeof name) {
                // this is case: lib(function findSomeButton() {...})
                if ('string' !== typeof name.name || ! name.name.length) {
                    throw new Error('incorrect usage of lib, only named functions should be defined like that');
                }
                workerLibByWorkerPath[path][name.name] = name;
                workerLibByWorkerPath[path][name.name].cartFillerWorkerLibType = 'helper';
                return [];
            } else {
                var pc = name.split('.');
                name = pc.pop();
                var lib = workerLibByWorkerPath[path];
                pc.filter(function(item, index) {
                    if ((! lib[item]) || (! lib[item].cartFillerWorkerLibFn)) {
                        throw new Error('lib [' + path + ']->[' + pc.slice(0, index).join('.') + '] does not have [' + item + '] sublib');
                    }
                    lib = lib[item];
                });
                if (! lib.hasOwnProperty(name)) {
                    throw new Error('lib [' + path + ']->[' + pc.join('.') + '] does not have [' + name + '] entry');
                }
                if ('function' === typeof lib[name]) {
                    return lib[name].apply({}, promise.promiseArgs.slice(1));
                } else {
                    return lib[name];
                }
            }
        }
    };
    var workerLibByWorkerPath;
    var workerLib;
    var workerLibFactory = function(path) {
        var workerLibFn = function() {
            var result = function(arg) {
                return workerLibResolve(arg, result, path.join('.'));
            };
            result.cartFillerLibPromiseFunction = true;
            result.promiseArgs = [];
            for (var i = 0; i < arguments.length ; i ++) {
                result.promiseArgs.push(arguments[i]);
            }
            result.none = [];
            return result;
        };
        workerLibFn.cartFillerWorkerLibFn = true;
        workerLibFn.cartFillerWorkerLibPath = path.join('.');
        return workerLibFn;
    };
    var makeProxyForWorkerLib = function(fn) {
        var result = function() {
            var mainFrameWindowDocument;
            try { mainFrameWindowDocument = me.modules.ui.mainFrameWindow.document; } catch (e) {}
            return fn.apply(mainFrameWindowDocument, arguments);
        };
        result.cartFillerWorkerLibType = fn.cartFillerWorkerLibType;
        if (result.cartFillerWorkerLibType !== 'step builder') {
            result.cartFillerWorkerLibType = 'helper';
        }
        fn.cartFillerWorkerLibType = result.cartFillerWorkerLibType;
        return result;
    };
    var workerLibBrief = {};
    var workerUrlsCommonPart;
    var resetWorkerLib = function () {
        workerLib = workerLibFactory([]);
        workerLibByWorkerPath = {};
        workerLibBrief = {};
        workerUrlsCommonPart = false;
        for (var i in workerSourceCodes) {
            if (false === workerUrlsCommonPart) {
                workerUrlsCommonPart = i; 
                continue;
            }
            for (var j = workerUrlsCommonPart.length ; j >= 0 ; j --) {
                if (workerUrlsCommonPart.substr(0,j) === i.substr(0,j)) {
                    break;
                }
            }
            workerUrlsCommonPart = workerUrlsCommonPart.substr(0,j);
        }
    };
    var ambiguousWorkerLibProxyFunctionFactory = function(name) {
        return function(){
            throw new Error('[' + name + '] is ambiguous inside lib, use fully qualified name');
        };
    };

    var processWorkerLibByPath = function(lib, path) {
        for (var i in lib) {
            if (lib.hasOwnProperty(i)) {
                if ('function' === typeof lib[i]) {
                    lib[i] = makeProxyForWorkerLib(lib[i]);
                } else if ('object' === typeof lib[i]) {
                    lib[i].cartFillerWorkerLibType = 'steps';
                }
                if (workerLib.hasOwnProperty(i)) {
                    workerLib[i] = ambiguousWorkerLibProxyFunctionFactory(i);
                } else {
                    workerLib[i] = lib[i];
                }
                if (lib[i].cartFillerWorkerLibType) {
                    workerLibBrief[(path.join('.') + '.' + i).replace(/^\./, '')] = lib[i].cartFillerWorkerLibType;
                }
            }
        }
        var $this = workerLib;
        var thisPath = [];
        path.filter(function(item, i) {
            thisPath.push(item);
            if (undefined === $this[item]) {
                $this[item] = (i === path.length - 1) ? lib : workerLibFactory(thisPath);
            } else if ($this[item].cartFillerWorkerLibFn) {
                // that's ok except for last piece
                if (i === path.length - 1) {
                    throw new Error('can\'t replace workerLib on this path: [' + thisPath.join('.') + ']');
                }
            } else {
                throw new Error('naming conflict, can\'t put workerLib on this path: [' + thisPath.join('.') + ']');
            }
            $this = $this[item];
        });
    };
    var processWorkerTasks = function(tasks) {
        for (var taskName in tasks){
            if (tasks.hasOwnProperty(taskName)){
                worker[taskName] = recursivelyCollectSteps(tasks[taskName]);
                workerTaskSources[taskName] = currentEvaluatedWorker;
            }
        }
    };
    var postProcessWorkerLibs = function() {
        for (var i in workerLibByWorkerPath) {
            for (var j in workerLib) {
                if (workerLib.hasOwnProperty(j) && ! workerLibByWorkerPath[i].hasOwnProperty(j)) {
                    workerLibByWorkerPath[i][j] = workerLib[j];
                }
            }
        }
    };
    var makeLibPathFromWorkerPath = function(workerUrl) {
        return workerUrl.substr(workerUrlsCommonPart.length).replace(/(^|\/)workers\//g, function(m,a){return a;}).replace(/\.js$/, '').split('/');
    };
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
    var knownCurrentUrls = {};
    /**
     * Flag, that is set to true after worker (job progress) frame
     * is bootstrapped to avoid sending extra bootstrap message
     * @var {boolean} CartFiller.Dispatcher~bootstrapped
     * @access private
     */
    var bootstrapped = false;
    /**
     * See {@link CartFiller.Api#highlight}, {@link CartFiller.Api#arrow}
     * @var {Array} CartFiller.Dispatcher~returnedValuesOfSteps
     * @access private
     */
    var returnedValuesOfSteps = [];
    /**
     * @var {int} CartFiller.Dispatcher~returnedValuesOfStepsAreForTask
     * @access private
     */
    var returnedValuesOfStepsAreForTask;
    var mostRecentReturnedValueOfStep;
    var mostRecentReturnedValueOfStepIsElement;

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
    var rememberedHashParams = {};
    var hideHashParam = {};
    var mainWindowOwnedByTestSuite = window.document.getElementsByTagName('body')[0].getAttribute('data-cartfiller-is-here') ? true : false;
    /**
     * Keeps details about relay subsystem
     * @var {Object} CartFiller.Dispatcher~rel
     */
    var relay = {
        isSlave: false,
        slaveCounter: 0,
        parent: false,
        currentMainFrameWindow: 0,
        nextRelay: false,
        nextRelayDomain: false,
        nextRelayRegistered: false,
        nextRelayQueue: [],
        knownDomains: {},
        registeredDomains: {},
        noFocusForDomain: {},
        igniteFromLocal: false,
        recoveryPoints: {},
        bubbleMessage: function(message) {
            if (this.isSlave) {
                postMessage(this.parent, 'bubbleRelayMessage', message);
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
    var getWorkerFnParams = function() {
        if (returnedValuesOfStepsAreForTask !== workerCurrentTaskIndex) {
            // this is the case when we switch to next task - we keep 
            // result of previous task as the only parameter
            returnedValuesOfSteps = [returnedValuesOfSteps.pop()];
            returnedValuesOfStepsAreForTask = workerCurrentTaskIndex;
        }
        var result = [];
        var repeat = 1;
        for (var i = workerCurrentStepIndex; i >= 0; i --) {
            if (i in returnedValuesOfSteps) {
                while (repeat --) {
                    result.push(returnedValuesOfSteps[i]);
                }
                repeat = 1;
            } else {
                repeat ++;
            }
        }
        return result;
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
        var json = JSON.stringify(details);
        var payload = messageName + ':' + json;
        if ('function' === typeof toWindow.postMessage) {
            toWindow.postMessage(payload, '*');
        } else {
            console.log('unable to send message to window: ' + payload);
        }
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
                    value = decodeAlias(value);
                }
                workerCurrentTask[newKey] = value;
            }
        }
    };
    /** 
     * Decodes nested alias. To be documented
     * @function CartFiller.Dispatcher~decodeAlias
     * @param {String|Array} value
     * @access private
     * @return {String}
     */
    var decodeAlias = function(value, returnRefKey) {
        var result;
        if ('string' === typeof value) {
            result = returnRefKey ? value : (value === '_random' ? (String(new Date().getTime()) + String(Math.floor(1000 * Math.random()))) : workerGlobals[value]);
            return result;
        } else {
            if (1 === value.length) {
                // ["globalVar"] or [["email of ", ["userNameForThisActor"]]]
                value = value[0];
                if ('string' === typeof value) {
                    result = returnRefKey ? value : decodeAlias(value);
                    return result;
                } else if (value instanceof Array) {
                    result = returnRefKey ? decodeAlias(value) : workerGlobals[decodeAlias(value)];
                    return result;
                } else {
                    throw new Error('incorrect value: [' + (typeof value) + '] [ ' + JSON.stringify(value) + ']');
                }
            } else if (0 === value.length) {
                // [] - just prompt user for value
                result = returnRefKey ? undefined : prompt('enter value for ' + newKey, '');
                return result;
            } else {
                // ['entity for ts = ', ["timeStamp"]]
                result = returnRefKey ? undefined : value.map(function(part) {
                    return part instanceof Array ? String(decodeAlias(part)) : part;
                }).join('');
                return result;
            }
        }
        throw new Error('unable to decode: ' + JSON.stringify(value));
    };
    /**
     * Fills workerGlobals object with new values
     * @function CartFiller.Dispatcher~fillWorkerGlobals
     * @param {Object} src
     * @access private
     */
    var fillWorkerGlobals = function(src) {
        me.log(src);
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
    var getDomain = function(url) {
        return url.split('/').slice(0,3).join('/');
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
        if (url !== '') {
            relay.knownDomains[getDomain(url)] = true;
        }
        if (relay.nextRelay && message) {
            if (relay.nextRelayRegistered) {
                postMessage(relay.nextRelay, message.cmd, message);
            } else {
                relay.nextRelayQueue.push(message);
            }
        } else if (url !== '') {
            relay.nextRelayDomain = getDomain(url);
            me.modules.dispatcher.openPopup(
                {
                    url: url,
                    target: '_blank'
                }, 
                function(w) {
                    relay.nextRelay = w;
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
            );
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
        var injectDebuggerFn = function(match, fn) {
            if ((! apiIsThere) && /\,\s*api\s*\,/.test(match)) {
                apiIsThere = true;
            }
            if (apiIsThere) {
                // it was return fn + ' if(api.debug && (1 || api.debug.stop)) debugger; ';
                // but I don't like this behaviour
                return fn + ' if(api.debug && api.debug.stop) debugger; ';
            } else {
                return match;
            }
        };
        eval(workerSourceCodes[currentEvaluatedWorker].replace(/(function\s*\([^)]*\)\s*{[ \t]*)/g, injectDebuggerFn)); // jshint ignore:line
        evaluateNextWorker();
    };
    

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
                            (source[i][0] instanceof Array) ||
                            (
                                'function' === typeof source[i][0] &&
                                source[i][0].cartFillerLibPromiseFunction
                            )
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
    var resolveLibPromisesInWorker = function() {
        var found = false;
        for (var taskName in worker) {
            for (var i = worker[taskName].length - 1 ; i >= 0 ; i --) {
                if ('function' === typeof worker[taskName][i]) {
                    if (worker[taskName][i].cartFillerLibPromiseFunction === true) {
                        found = true;
                        var params = recursivelyCollectSteps(worker[taskName][i]());
                        params.unshift(1);
                        params.unshift(i);
                        worker[taskName].splice.apply(worker[taskName], params);
                    } else if (worker[taskName][i].cartFillerWorkerLibType === 'helper') {
                        // ignore it
                        worker[taskName].splice(i, 1);
                    }
                }
            }
        }
        if (found) {
            resolveLibPromisesInWorker();
        }
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
        resetWorkerLib();
        currentCf = me.modules.cf.create();
        evaluateNextWorker();
        processWorkerTasks(currentCf.buildTasks());
        currentCf.switchMode();
        postProcessWorkerLibs();
        resolveLibPromisesInWorker();
        var list = {};
        var discoveredParameters = {};
        var stepDependencies = {};
        var pausesBeforeSteps = {};
        for (var taskName in worker) {
            stepDependencies[taskName] = {};
            pausesBeforeSteps[taskName] = {};
            var taskSteps = [];
            var params = {};
            var allParams = {};
            for (i = 0 ; i < worker[taskName].length; i++){
                // this is step name/comment
                if ('string' === typeof worker[taskName][i]){
                    taskSteps.push(worker[taskName][i]);
                    if (worker[taskName][i+1] instanceof Function) {
                        params[taskSteps.length - 1] = discoverTaskParameters(worker[taskName][i+1], allParams);
                        stepDependencies[taskName][taskSteps.length - 1] = discoverStepDependencies(worker[taskName][i+1]);
                        pausesBeforeSteps[taskName][taskSteps.length - 1] = worker[taskName][i+1].cartFillerMakePauseBeforeStep;
                    }
                }
            }
            params.all = allParams;
            list[taskName] = taskSteps;
            discoveredParameters[taskName] = params;
        }
        me.modules.dispatcher.postMessageToWorker('workerRegistered', {
            jobTaskDescriptions: list, 
            discoveredParameters: discoveredParameters, 
            workerTaskSources: workerTaskSources,
            stepDependencies: stepDependencies,
            workerLib: workerLibBrief,
            pausesBeforeSteps: pausesBeforeSteps
        });
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
            /[^a-zA-Z0-9_$]task\[['"]([^'"]+)['"]\]/g
        ]
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
                    me.log(event.origin, message.cmd, message);
                    if (message.cmd === 'actAsSlaveHelper') {
                        // ok, we are just a helper tab, our purpose is simply to discover those
                        // frames of our opener, that are available to us and 
                        // inject ingnition code there
                        var frame;
                        try {
                            frame = event.source.frames['cartFillerMainFrame-s' + message.slaveIndex];
                            if (frame.location.hasOwnProperty('href')) {
                                frame.eval(me.injectFunction.toString());
                            }
                        } catch (e) {}
                        return;
                    }
                    if (event.source === relay.nextRelay && message.cmd !== 'register' && message.cmd !== 'bubbleRelayMessage' && message.cmd !== 'locate') {
                        if (message.cmd === 'workerStepResult') {
                            me.log('going to fillWorkerGlobals due to workerStepResult message', message);
                            fillWorkerGlobals(message.globals);
                        }
                        if (message.cmd === 'currentUrl') {
                            knownCurrentUrls[message.currentMainFrameWindow] = message.url;
                        }
                        postMessage(relay.isSlave ? relay.parent : me.modules.ui.workerFrameWindow, message.cmd, message);
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
                    relay.parent.postMessage(event.data, '*');
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
            var i;
            if (message.registerFromSlave) {
                if (! relay.isSlave && me.modules.ui.slaveFramesHelperWindows) {
                    for (i in me.modules.ui.slaveFramesHelperWindows) {
                        if (me.modules.ui.slaveFramesHelperWindows[i].w === source) {
                            source.postMessage('cartFillerMessage:{"cmd":"actAsSlaveHelper","slaveIndex":' + me.modules.ui.slaveFramesHelperWindows[i].i + '}', '*');
                            return;
                        }
                    }
                }
                relay.nextRelay = source;
                relay.registeredDomains[relay.nextRelayDomain] = true;
                this.onMessage_bubbleRelayMessage({message: 'updateKnownAndRegisteredSlaves', knownDomains: relay.knownDomains, registeredDomains: relay.registeredDomains, newRelayDomain: relay.nextRelayDomain });
            }
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
                    hashUrl: me['data-choose-job'].split('#')[1] || window.location.hash
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
                for (i = codeToSend.length - 1; i >= 0 ; i --) {
                    relay.nextRelayQueue.unshift({cmd: 'loadWorker', jobDetailsCache: jobDetailsCache, src: codeToSend[i], code: workerSourceCodes[codeToSend[i]], isFinal: (i === codeToSend.length - 1)});
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
        onMessage_reinitialize: function() {
            if (! relay.isSlave) {
                this.onMessage_chooseJob({hideHashDetails: 1});
            } else {
                alert('This slave is already initialized');
            }
        },
        /**
         * Shows Choose Job frame
         * @function CartFiller.Dispatcher#onMessage_chooseJob
         * @param {Object} details
         * @access public
         */
        onMessage_chooseJob: function(details){
            if (! relay.isSlave) {
                me.modules.ui.showHideChooseJobFrame(true);
                this.postMessageToWorker('chooseJobShown');
                if (details.hideHashDetails) {
                    hideHashParam = {job: 1, task: 1, step: 1};
                }
                this.onMessage_updateHashUrl({params: {}});
            } else {
                details.notToChildren = true;
                this.onMessage_bubbleRelayMessage(details);
            }
        },
        /**
         * Hides Choose Job frame
         * @function CartFiller.Dispatcher#onMessage_chooseJobCancel
         * @access public
         */
        onMessage_chooseJobCancel: function(){
            if (! relay.isSlave) {
                me.modules.ui.showHideChooseJobFrame(false);
                this.postMessageToWorker('chooseJobHidden');
                hideHashParam = {};
                this.onMessage_updateHashUrl({params: {}});
            } else {
                details.notToChildren = true;
                this.onMessage_bubbleRelayMessage(details);
            }
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
                hideHashParam = {};
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
                reinitializeWorker();
                workerGlobals = message.globals = message.globals ? message.globals : {};
                me.log('setting workerGlobals to', workerGlobals);
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
                    if (relay.isSlave) {
                        this.onMessage_bubbleRelayMessage({
                            message: 'slaveReady',
                            notToChildren: true
                        });
                    }
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
                    ////////
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
            me.modules.api.resetDrillDepth();
            if (message.index === 0 && message.step === 0 && me.modules.ui.currentMainFrameWindow > 0) {
                // for first step of first task we force switch to primary winodow
                this.switchToWindow(0);
            }
            if (! relay.isSlave) {
                message.currentMainFrameWindow = me.modules.ui.currentMainFrameWindow;
                if (message.step === 0) {
                    if (! relay.recoveryPoints[me.modules.ui.currentMainFrameWindow]) {
                        relay.recoveryPoints[me.modules.ui.currentMainFrameWindow] = {};
                    }
                    relay.recoveryPoints[me.modules.ui.currentMainFrameWindow][message.index] = knownCurrentUrls[me.modules.ui.currentMainFrameWindow];
                }
            }
            var err;
            currentInvokeWorkerMessage = message;
            if (message.globals) {
                me.log('going to fillWorkerGlobals due to invokeWorker message');
                fillWorkerGlobals(message.globals);
            } 
            this.running = message.running;
            if (! relay.isSlave && ((! message.drillToFrame) || (! message.drillToFrame.length))) {
                // ok, this is original call, we can clear all overlays, etc
                me.modules.ui.prepareTolearOverlaysAndReflect();
            }
            if (this.reflectMessage(message, message.drillToFrame)) {
                me.log('invokeWorker reflected');
                if (message.debug) {
                    console.log('Debugger call went to slave tab - look for it there!');
                }
                if (! relay.nextRelay) {
                    // we are last one in the slave chain, so this is clearly "access denied"
                    message.failures = (message.failures || 0) + 1;
                    me.log(message);
                    me.modules.dispatcher.onMessage_bubbleRelayMessage({message: 'retryInvokeWorker', payload: message});
                }

                return;
            }
            me.log('invokeWorker will be processed here');
            if (false !== workerCurrentStepIndex){
                err = 'ERROR: worker task is in still in progress';
                alert(err);
            } else {
                stepRepeatCounter = message.stepRepeatCounter;
                onLoadHappened = false;
                nextTaskFlow = 'normal';
                if (workerCurrentTaskIndex !== message.index){
                    fillWorkerCurrentTask(message.details);
                }
                workerCurrentTaskIndex = message.index;
                workerCurrentStepIndex = message.step;
                // by default inherit previous returned value
                this.setReturnedValueOfStep(mostRecentReturnedValueOfStep);
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
                     * @member {string} CartFiller.Api.StepEnvironment#taskName current task name
                     * @access public
                     */
                    taskName: message.task,
                    /**
                     * @member {Array} CartFiller.Api.StepEnvironment#taskSteps steps of current task
                     * @access public
                     */
                    taskSteps: worker[message.task],
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
                    params: {},
                    stepRepeatCounter: stepRepeatCounter
                };
                try {
                    if (undefined === worker[message.task]) {
                        // let's wait for task to appear
                        me.modules.api.repeatTask().setTimeout(me.modules.api.result, 1000);
                        return;
                    } else if (undefined === worker[message.task][(message.step * 2) + 1]){
                        alert(err = 'invalid worker - function for ' + message.task + ' step ' + message.step + ' does not exist');
                        me.modules.api.result(err, false);
                        return;
                    } else {
                        var workerFn = worker[message.task][(message.step * 2) + 1];
                        if ('function' !== typeof workerFn){
                            if ('function' === typeof workerFn[0]){
                                currentStepEnv.params = workerFn[1];
                                workerFn = workerFn[0];
                            } else {
                                alert(err = 'invalid worker - function for ' + message.task + ' step ' + message.step + ' is not a function');
                                me.modules.api.result(err, false);
                                return;
                            }
                        }
                        // register watchdog
                        registerWorkerWatchdog();
                        sleepAfterThisStep = undefined;
                        currentStepWorkerFn = workerFn;
                        me.modules.api.debug = message.debug;
                        if (message.debug) {
                            me.modules.api.debug = {};
                            try {
                                Object.defineProperty(me.modules.api.debug, 'stop', {get: function() { me.modules.api.debug = false; return 'debugging stopped'; }});
                            } catch (e) {
                                me.modules.api.debug.stop = 'can\'t attach getter';
                            }
                            console.log('to stop debugging of this step type api.debug = 0; in console, or hover over any api.debug.stop property');
                        }
                        me.modules.api.env = currentStepEnv;
                        captureWorkerFnResult = workerFn.cartFillerCaptureResult;
                        workerFn.apply(me.modules.ui.getMainFrameWindowDocument(), getWorkerFnParams());
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
                openRelay('', message);
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
        onMessage_startReportingMousePointer: function(details) {
            me.modules.ui.startReportingMousePointer(details);
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
                elements = eval('(function(window, document, api, cf, task){return ' + ('getlib(' === details.selector.substr(0, 7) ? 'cf.' : 'api.find') + details.selector + ';})(me.modules.ui.mainFrameWindow, me.modules.ui.mainFrameWindow.document, me.modules.api, me.modules.cf, ' + JSON.stringify(details.taskDetails) + ');'); // jshint ignore:line
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
            if (relay.isSlave && source !== relay.parent && ! details.notToParents) {
                postMessage(relay.parent, details.cmd, details);
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
                relay.noFocusForDomain[getDomain(details.args[0])] = details.args[1];
                if (! relay.knownDomains[getDomain(details.args[0])]) {
                    me.modules.dispatcher.onMessage_bubbleRelayMessage({message: 'openRelayOnTail', args: details.args});
                }
            } else if (details.message === 'openRelayOnTail') {
                relay.knownDomains[getDomain(details.args[0])] = true;
                if (! relay.nextRelay) {
                    openRelay(details.args[0], undefined, details.args[1]);
                }
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
                me.modules.dispatcher.onMessage_sendStatus(details);
            } else if (details.message === 'clearCurrentUrl' && source) {
                me.modules.dispatcher.onMessage_clearCurrentUrl();
            } else if (details.message === 'prepareToClearOverlays') {
                me.modules.ui.prepareToClearOverlays();
            } else if (details.message === 'setAdditionalWindows' && ! relay.isSlave) {
                me.modules.dispatcher.setAdditionalWindows(details.descriptors, details);
            } else if (details.message === 'switchToWindow' && ! relay.isSlave) {
                me.modules.dispatcher.switchToWindow(details.index);
            } else if (details.message === 'slaveReady' && ! relay.isSlave) {
                relay.slaveCounter ++;
                me.modules.dispatcher.onMessage_bubbleRelayMessage({
                    message: 'updateSlaveCounter',
                    slaveCounter: relay.slaveCounter
                });
            } else if (details.message === 'chooseJob' && ! relay.isSlave) {
                me.modules.dispatcher.onMessage_chooseJob(details);
            } else if (details.message === 'chooseJobCancel' && ! relay.isSlave) {
                me.modules.dispatcher.onMessage_chooseJobCancel(details);
            } else if (details.message === 'updateSlaveCounter') {
                relay.slaveCounter = details.slaveCounter;
            } else if (details.message === 'broadcastReturnedValues' && source) {
                if (details.returnedValuesOfStepsAreForTask !== returnedValuesOfStepsAreForTask) {
                    returnedValuesOfSteps = [undefined];
                    returnedValuesOfStepsAreForTask = details.returnedValuesOfStepsAreForTask;
                }
                details.values.filter(function(value, index) {
                    if (undefined !== value && null !== value) {
                        returnedValuesOfSteps[index] = value;
                    }
                });
            } else if (details.message === 'reportingMousePointerClickForWindow' && source) {
                if (details.currentMainFrameWindow === relay.currentMainFrameWindow) {
                    me.modules.ui.reportingMousePointerClickForWindow(details.x, details.y);
                }
            } else if (details.message === 'retryInvokeWorker' && ! relay.isSlave) {
                me.log('retryInvokeWorker', details);
                if (details.payload.failures < 15) {
                    setTimeout(function() {
                        me.modules.dispatcher.onMessage_invokeWorker(details.payload);
                    }, 1000);
                } else {
                    // recover if there is recovery point
                    var recoveryUrl = relay.recoveryPoints[me.modules.ui.currentMainFrameWindow][details.payload.index] || 'about:blank';
                    if (recoveryUrl) {
                        me.modules.ui.mainFrames[me.modules.ui.currentMainFrameWindow].setAttribute('src', recoveryUrl);
                        // this is rather rare situation, so let's just wait for some 20 seconds
                        setTimeout(function() {
                            workerCurrentTaskIndex = details.payload.index;
                            workerCurrentStepIndex = details.payload.step; // to prevent alert
                            me.modules.api.repeatTask().result('recovering after access deined into: ' + recoveryUrl, 1);
                            workerCurrentTaskIndex = false; // to make it load task again
                        }, 20000);
                    }
                }
            } else if (details.message === 'popupRelayMainWindowRequest' && source) {
                if (me.modules.ui.mainFrameWindow) {
                    try {
                        postMessageFromWindowToWindow('popupRelayMainWindowResponse', {}, me.modules.ui.mainFrameWindow, source);
                    } catch (e) {}
                }
            } else if (details.message === 'updateKnownAndRegisteredSlaves') {
                relay.knownDomains = details.knownDomains;
                relay.registeredDomains = details.registeredDomains;
                if (! relay.isSlave && relay.noFocusForDomain[details.newRelayDomain]) {
                    alert('Thank you!');
                }
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
            me.modules.ui.reportingMousePointerClick(details.x, details.y, details.w, details.fl, details.ft);
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
            if (! mainWindowOwnedByTestSuite) {
                return;
            }
            var params = details.params;
            var i;
            for (i in params) {
                rememberedHashParams[i] = params[i];
            }
            for (i in rememberedHashParams) {
                if (undefined === params[i]) {
                    params[i] = rememberedHashParams[i];
                }
            }
            var hash = window.location.hash.replace(/^#\/?/, '').split('&').map(function(v) {
                var name, i;
                for (i in hideHashParam) {
                    name = encodeURIComponent(i);
                    if (0 === v.indexOf(name + '=')) {
                        return '';
                    }
                }
                for (i in params) {
                    name = encodeURIComponent(i);
                    if (0 === v.indexOf(name + '=')) {
                        var r = (hideHashParam[i] || (params[i] !== '' && params[i] !== false)) ? (name + '=' + encodeURIComponent(params[i])) : '';
                        delete params[i];
                        return r;
                    }

                }
                return v;
            }).filter(function(v){ return v.length; });
            for (i in params) {
                if ((! hideHashParam[i]) && params[i] !== '' && params[i] !== false) {
                    hash.push(encodeURIComponent(i) + '=' + encodeURIComponent(params[i]));
                }
            }
            var hashString = hash.join('&');
            if (hashString.length < 4096) {
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(undefined, undefined, '#' + hashString);
                } else {
                    window.location.hash = hashString;
                }
            }
        },
        /**
         * Updates title
         * @function CartFiller.Dispatcher#onMessage_updateTitle
         * @param {Object} details
         * @access public
         */
        onMessage_updateTitle: function(details) {
            window.document.title = me.modules.ui.rootWindowTitle() || details.title;
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
            me.modules.ui.highlightElementForQueryBuilder(details);
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
        setMainFrameLoaded: function() {
            mainFrameLoaded = true;
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
            var workerLibPath = makeLibPathFromWorkerPath(currentEvaluatedWorker);
            var workerLibOfThisWorker = workerLibFactory(workerLibPath);
            workerLibByWorkerPath[workerLibPath.join('.')] = workerLibOfThisWorker;
            var argNames = cb.toString().split('(')[1].split(')')[0].split(',').map(function(v) { return v.trim(); });
            var knownArgs = {
                window: me.modules.ui.mainFrameWindow,
                document: undefined,
                api: me.modules.api,
                task: workerCurrentTask,
                job: jobDetailsCache,
                globals: workerGlobals,
                lib: -1 === argNames.indexOf('cf') ? workerLibOfThisWorker : currentCf.getLib(),
                cf: currentCf.getCf()
            };
            var args = argNames.map(function(arg){
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
            processWorkerLibByPath(workerLibOfThisWorker, workerLibPath);
            processWorkerTasks(thisWorker);
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
                    var workerGlobalsRefKey = decodeAlias(currentStepEnv.task[i], true);
                    if (undefined !== workerGlobalsRefKey) {
                        workerGlobals[workerGlobalsRefKey] = workerCurrentTask[i];
                    }
                }
            }
            var status, m;
            if (captureWorkerFnResult === 1 || (captureWorkerFnResult > 1 && message)) {
                this.setReturnedValueOfStep([message === '' ? undefined : message, mostRecentReturnedValueOfStep, mostRecentReturnedValueOfStepIsElement]);
                nextTaskFlow = captureWorkerFnResult > 1 ? ('skipStep,' + (captureWorkerFnResult - 1)) : 'normal';
                message = undefined; // result = ok
            }
            if ((undefined === message) || ('' === message)) {
                status = 'ok';
            } else if ('string' === typeof message){
                status = recoverable ? 'skip' : 'error';
            } else {
                throw new Error('invalid message type ' + typeof(message));
            }
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
                        me.modules.api.repeatStep().result();
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
            removeWatchdogHandler();
            var messageForWorker = {
                index: workerCurrentTaskIndex, 
                step: workerCurrentStepIndex, 
                status: status, 
                message: message,
                response: response,
                nop: recoverable === 'nop',
                nextTaskFlow: nextTaskFlow,
                globals: workerGlobals,
                sleep: sleepAfterThisStep
            };
            workerCurrentStepIndex = false;
            if (currentInvokeWorkerMessage && currentInvokeWorkerMessage.details && currentInvokeWorkerMessage.details.task === '_wait') {
                // this is a specific case when we do not want to cache task parameters for _wait task
                workerCurrentTaskIndex = false;
            }
            workerOnLoadHandler = false;
            suspendAjaxRequestsCallback = false;
            this.postMessageToWorker(
                'workerStepResult', 
                messageForWorker
            );
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
         * @function CartFiller.Dispatcher#setReturnedValueOfStep
         * @param {jQuery|HtmlElement} element
         * @access public
         */
        setReturnedValueOfStep: function(element, isElement){
            returnedValuesOfSteps[workerCurrentStepIndex + 1] = mostRecentReturnedValueOfStep = element;
            mostRecentReturnedValueOfStepIsElement = isElement;
            this.onMessage_bubbleRelayMessage({
                message: 'broadcastReturnedValues', 
                values: returnedValuesOfSteps.map(function(v) {
                    if ('string' === typeof v || 'number' === typeof v) {
                        return v;
                    } else {
                        return undefined;
                    }
                }),
                returnedValuesOfStepsAreForTask: returnedValuesOfStepsAreForTask
            });
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
                this.postMessageToWorker('currentUrl', {url: url, currentMainFrameWindow: relay.isSlave ? me.modules.dispatcher.getFrameWindowIndex() : me.modules.ui.currentMainFrameWindow});
                this.onMessage_bubbleRelayMessage({message: 'clearCurrentUrl'});
                workerCurrentUrl = knownCurrentUrls[me.modules.ui.currentMainFrameWindow] = url;
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
                windowToCheck = windowToCheck && windowToCheck.frames[index];
            });
            if (! windowToCheck) {
                return false;
            }
            var d;
            var f = function() { };
            try {
                d = windowToCheck.document;
                f(d.getElementsByTagName('body')[0]);
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
            var access = this.haveAccess(framesPath);
            if (access && ((! message.hasOwnProperty('currentMainFrameWindow')) || relay.currentMainFrameWindow === message.currentMainFrameWindow)) {
                me.log('dispatcher.reflectMessage - false', access, framesPath);
                return false;
            }
            me.log('dispatcher.reflectMessage - true', access, framesPath);
            if (message.cmd === 'invokeWorker') {
                message.globals = {};
                for (var i in workerGlobals) {
                    message.globals[i] = workerGlobals[i];
                }
            }
            openRelay('', message);
            return true;
        },
        /**
         * Starts whole piece in slave mode
         * @function CartFiller.Dispatcher~startSlaveMode
         * @access public
         */
        startSlaveMode: function(overrideParent) {
            // operating in slave mode, show message to user
            var body = document.getElementsByTagName('body')[0];
            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            var link = document.createElement('a');
            var i, frame;
            try {
                link.textContent = 'This tab/iframe is used by cartFiller as slave (' + window.location.href.split('/')[2] + '), DO NOT CLOSE IT!, click this message to locate original tab.';
                link.style.color = 'red';
                link.style.display = 'block';
                link.style.padding = '0px';
                link.setAttribute('href', '#');
                link.onclick = function() {
                    relay.parent.postMessage('cartFillerMessage:{"cmd":"locate"}', '*');
                };
            } catch (e) {}
            body.appendChild(link);
            try {
                link.focus();
            } catch (e) {}
            // initialize
            reinitializeWorker();
            if (overrideParent) {
                relay.parent = overrideParent;
            } else if (window.opener) {
                relay.parent = window.opener;
            } else if (window.parent) {
                // we are opened as frame, we are going to find last slave and 
                // make it our parent
                relay.parent = window.parent;
                try {
                    for (i = 1; frame = window.parent.frames['cartFillerMainFrame-s' + i]; i++) {
                        if (frame === window) {
                            relay.currentMainFrameWindow = i;
                            me.modules.ui.mainFrameWindow = window.parent.frames['cartFillerMainFrame-' + i];
                            if (i > 1) {
                                relay.parent = window.parent.frames['cartFillerMainFrame-s' + (i - 1)];
                            } 
                            break;
                        }
                    }
                } catch (e) {}
            }
            me.modules.dispatcher.init(true);
            relay.parent.postMessage('cartFillerMessage:{"cmd":"register","registerFromSlave":1}', '*');
            me.modules.ui.chooseJobFrameWindow = me.modules.ui.workerFrameWindow = relay.parent;
            try { // this can fail when Cartfiller tab is opened from local/index.html
                if (relay.parent === window.opener) {
                    for (var opener = window.opener; opener && opener !== opener.opener; opener = opener.opener) {
                        try {
                            if (opener.frames['cartFillerMainFrame-0']) {
                                me.modules.ui.mainFrameWindow = opener.frames['cartFillerMainFrame-0'];
                                break;
                            }
                        } catch (e) {}
                        try {
                            if (opener.frames.cartFillerWorkerFrame) {
                                // ok, we found a root window, but it looks like it is in popup mode.
                                // let's make a request to it
                                postMessage(relay.parent, 'bubbleRelayMessage', {message: 'popupRelayMainWindowRequest'});
                            }
                        } catch (e) {}
                    }
                }
            } catch (e) {
                return; 
            }   
            if (! me.modules.ui.mainFrameWindow) {
                // probably we are still going to switch to UI mode, so we'll report this failure after 10 seconds
                setTimeout(function() {
                    if (! me.uiLaunched && ! me.modules.ui.mainFrameWindow) {
                        alert('could not find mainFrameWindow in slave mode');
                    }
                }, 10000);
                return;
            }
            this.startSlaveModeWithWindow();
        },
        startSlaveModeWithWindow: function() {
            if (relay.isSlave) {
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
        onMessage_popupRelayMainWindowResponse: function(details, source) {
            me.modules.ui.mainFrameWindow = source;
            this.startSlaveModeWithWindow();
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
                        me.modules.ui.checkAndUpdateCurrentUrl();
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
            me.log('dispatcher.drill', frameIndexes);
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
            return currentInvokeWorkerMessage && currentInvokeWorkerMessage.drillToFrame ? currentInvokeWorkerMessage.drillToFrame : [];
        },
        isSlave: function() {
            return relay.isSlave;
        },
        onMessage_closeRelay: function() {
            if (relay.nextRelay && relay.nextRelayRegistered) {
                openRelay('', {cmd: 'closeRelay'});
            }
            if (relay.isSlave) {
                window.close();
            }
        },
        resetRelays: function() {
            this.onMessage_closeRelay();
            relay.nextRelay = relay.nextRelayRegistered = false;
            relay.nextRelayQueue = [];
            relay.knownDomains = {};
            relay.registeredDomains = {};
            relay.slaveCounter = 0;
            relay.recoveryPoints = {};
            knownCurrentUrls = {};
            me.modules.ui.slaveFrames = [undefined];
            me.modules.ui.slaveFramesWindows = [undefined];
            me.modules.ui.slaveFramesHelperWindows = {};
        },
        getSlaveCounter: function() { return relay.slaveCounter; },
        onMessage_resetAdditionalWindows: function() { 
            me.modules.ui.switchToWindow(0);
            me.modules.ui.setAdditionalWindows([], true); 
        },
        setAdditionalWindows: function(descriptors, details) {
            if (relay.currentMainFrameWindow > 0) {
                throw new Error('setAdditionalWindows is only allowed when worker is switched to primary window (0)');
            }
            if (relay.isSlave) {
                this.onMessage_bubbleRelayMessage({
                    message: 'setAdditionalWindows',
                    descriptors: descriptors,
                    notToChildren: true, 
                    workerCurrentStepIndex: workerCurrentStepIndex,
                    workerCurrentTaskIndex: workerCurrentTaskIndex,
                    nextTaskFlow: nextTaskFlow,
                    sleepAfterThisStep: sleepAfterThisStep,
                    workerGlobals: workerGlobals
                });
            } else {
                me.modules.ui.setAdditionalWindows(descriptors);
                if (details) {
                    workerCurrentTaskIndex = details.workerCurrentTaskIndex;
                    workerCurrentStepIndex = details.workerCurrentStepIndex;
                    nextTaskFlow = details.nextTaskFlow;
                    sleepAfterThisStep = details.sleepAfterThisStep;
                    me.log('setting workerGlobals to: ', workerGlobals);
                    workerGlobals = details.workerGlobals;
                }
            }
        },
        switchToWindow: function(index) {
            if (relay.isSlave) {
                this.onMessage_bubbleRelayMessage({
                    message: 'switchToWindow',
                    index: index,
                    notToChildren: true
                });
            } else {
                me.modules.ui.switchToWindow(index);
                this.postMessageToWorker('switchToWindow', {currentMainFrameWindow: index});
            }
        },
        getFrameWindowIndex: function(){ return relay.currentMainFrameWindow; },
        discoverTaskParameters: function(fn, params) { return discoverTaskParameters(fn, params); },
        injectTaskParameters: function(fn, src) {
            var params = {};
            (src instanceof Array ? src : [src]).filter(function(src) {
                if ('function' === typeof src) {
                    me.modules.dispatcher.discoverTaskParameters(src, params);
                } else if ('string' === typeof src) {
                    me.modules.dispatcher.interpolateText(src, params);
                }
            });
            fn.cartFillerParameterList = fn.cartFillerParameterList || [];
            for (var i in params) {
                fn.cartFillerParameterList.push(i);
            }
            return fn;
        },
        recursivelyCollectSteps: function(source, taskSteps) {
            return recursivelyCollectSteps(source, taskSteps);
        },
        isRelayRegistered: function(url) {
            return relay.registeredDomains[getDomain(url)];
        },
        openPopup: function(details, callback, tries) {
            tries = tries || 0;
            var w = details.target ? window.open(details.url, details.target) : window.open(details.url);
            if (w) { 
                return callback(w);
            }
            if (tries % 20 === 0) {
                alert('looks like popups are blocked, please unblock popups and I\'ll retry in 15 seconds');
            }
            setTimeout(function() {
                me.modules.dispatcher.openPopup(details, callback, tries + 1);
            }, 1000);
        },
        interpolateText: function(text, storeDiscoveredParametersHere) {
            if ('string' !== typeof text) {
                text = (undefined === text || null === text) ? '' : String(text);
            }
            return text.replace(INTERPOLATE_PATTERN, function(m, g1, g2) {
                if (storeDiscoveredParametersHere) {
                    storeDiscoveredParametersHere[g2] = true;
                }
                var value = workerCurrentTask[g2];
                if (undefined === value) {
                    value = workerGlobals[g2];
                }
                return g1 + ((undefined === value || null === value) ? '' : String(value));
            }).replace(/\\\$/g, '$');
        }
    });
}).call(this, document, window);
