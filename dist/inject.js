/*
 *  cartFiller - v0.0.1
 *  Tool for automating cart filling process when doing big purchases
 *  https://andrey012.github.com/cartFiller
 *
 *  Made by Andrey Grinenko
 *  Under MIT License
 */
// this file is used as as header when concatenating inject scripts. It is not valid as standalone.
/* jshint ignore:start */
(function(){
/* jshint ignore:end */

/**
 * @namespace CartFiller
 */
/**
 * @class CartFiller.Injector
 */
(function(document, window, undefined){
    'use strict';
    /** 
     * Is set to true if all injector scripts are concatenated and probably
     * minified
     * This changes logic of {@link CartFiller.Loader} -- if scripts are
     * concatenated, then loader does not load more files
     * 
     * @member CartFiller.Injector~concatenated
     * @access private
     */
    var concatenated = ('undefined' !== typeof this.cartFillerConfiguration);
    /**
     * Is set to true if this script (concatenated or not) is launched
     * by eval() statement in the bookmarklet (which is for Eval and Iframe
     * bookmarklets)
     * When launched by eval() by bookmarklet, the script is wrapped in another
     * anonymous function, called with this = another object, which makes
     * difference for unconcatenated version, because otherwise unconcatenated
     * version will be loaded without any wrapper
     * 
     * @member {boolean} CartFiller.Injector~evaled
     * @access private
     */
    var evaled = ('undefined' !== typeof this.cartFillerEval);

    /**
     * cartFiller configuration object, which keeps parameters passed through
     * bookmarklet. It is accessible by modules as this.cartFillerConfiguration
     * member. If injector is launched as not concatenated/minified 
     * then this will be === window, which is suitable for 
     * debugging. Otherwise this will be anonymous object used to make nothing
     * leak
     *
     * @member {CartFiller.Configuration} CartFiller.Injector~config
     * @access public
     */
    var config;
    
    /**
     * @class CartFiller.Configuration
     */
    // if source code is not concatenated, then we still put it into
    // window object, because other scripts, once loaded, will look for it
    // inside this scope which will be === window for them
    if (evaled && !concatenated) {
        window.cartFillerConfiguration = {};
        config = window.cartFillerConfiguration;
    } else {
        this.cartFillerConfiguration = {};
        config = this.cartFillerConfiguration;
    }
    /**
     * Set to true if source code is concatenated and probably minified
     * 
     * @member {boolean} CartFiller.Configuration#concatenated
     * @access public
     */
    config.concatenated = concatenated;
    /**
     * Array of scripts (modules) of cartFiller, that were loaded
     * See {@link CartFiller.Loader}
     * @member CartFiller.Configuration#scripts
     * @access public
     */
    config.scripts = [];
    /**
     * Launches the {@link CartFiller.UI}
     * 
     * @function CartFiller.Configuration#launch
     * @access public
     */
    config.launch = function(){
        if (String(config['data-type']) === '0') {
            this.modules.ui.framed(document, window);
        } else if (String(config['data-type']) === '1'){
            this.modules.ui.popup(document, window);
        } else {
            alert('Type not specified, should be 0 for framed, 1 for popup');
        }
    };

    /**
     * Base URL where cartFiller assets will be searched at. When
     * debugging, this value should be .../src
     * 
     * @member {string} CartFiller.Configuration#baseUrl
     * @access public
     */
    config.baseUrl = '';
    
    /**
     * Type of UI. 0 for Framed, 1 for Popup. When configured through
     * script attributes - the attribute name is 'data-type'
     * 
     * @member {integer} CartFiller.Configuration#data-type
     * @access public
     */
    config['data-type'] = 0;
    
    /**
     * Choose Job URL - will be opened in separate frame to provide integration
     * with another website, which provides source data for jobs
     * 
     * @member {String} CartFiller.Configuration#data-choose-job
     * @access public
     */
    config['data-choose-job'] = '';
    
    /**
     * Set to 1 or true to turn on debug features. One on the most
     * important features is ability to reload new version of worker
     * during step pause
     *
     * @member {boolean} CartFiller.Configuration#data-debug
     * @access public
     */
    config['data-debug'] = false;
    
    /**
     * Overrides worker URL. This is used to debug worker - in this
     * case you put worker JS file locally, specify its URL in
     * bookmarklet parameters, while leaving
     * [Choose Job URL]{@link CartFiller.Configuration.data-choose-job}
     * pointing to live system. If set to "" (default), then
     * worker URL will be delivered with Choose Job details
     *
     * @member {String} CartFiller.Configuration#data-worker
     * @access public
     */
    config['data-worker'] = '';

    // if we are not launched through eval(), then we should fetch
    // parameters from data-* attributes of <script> tag
    if (!evaled){
        var scripts = document.getElementsByTagName('head')[0].getElementsByTagName('script');
        var me = scripts[scripts.length - 1];
        var attrs = me.attributes;
        for (var j = attrs.length - 1 ; j >= 0; j --){
            if (/^data-/.test(attrs[j].name)){
                if (attrs[j].name === 'data-base-url'){
                    config.baseUrl = attrs[j].value;
                } else {
                    config[attrs[j].name] = attrs[j].value;
                }
            }
        }
    } else {
        config.baseUrl = this.cartFillerEval[0];
        config['data-type'] = this.cartFillerEval[1];
        config['data-choose-job'] = this.cartFillerEval[2];
        config['data-debug'] = this.cartFillerEval[3];
        config['data-worker'] = this.cartFillerEval[4];
    }
    // if not concatenated - then load loader.js, which, itself, will load other
    // files
    if (!concatenated) {
        var script = document.createElement('script');
        script.setAttribute('src', config.baseUrl + '/boot/helpers/loader.js');
        document.getElementsByTagName('head')[0].appendChild(script);
    }
}).call(this, document, window);

/**
 * Represents the API interface used by worker. 
 * @class CartFiller.Api
 */
(function(document, window, undefined){
    'use strict';

    // Callbacks
    /**
     * Called by cartFiller in response to worker registration to 
     * fetch worker capabilities -- tasks and steps it performs.
     * 
     * @callback CartFiller.Api.registerCallback
     * @param {Window} window
     * @param {Document} document, undefined will be passed here, to prevent
     * worker from accessing document. Instead worker should access
     * window.document. This is because worker is instantiated in the top frame
     * but operates with main frame where target site is opened, and document
     * in that main frame changes time to time.
     * @param {CartFiller.Api} api
     * @param {Object} task When called first time - contains empty object.
     * When particular step callbacks, this object will each time be
     * reinitialized with next task as provided by 
     * {@link CartFiller.submitJobDetails}
     * @see CartFiller.SampleWorker~registerCallback
     */
    
    /**
     * Performs particular step of the task. Each callback must finally, 
     * immediately or asynchronously call either {@link CartFiller.Api#result}
     * or {@link CartFiller.Api#nop} function.
     * 
     * @callback CartFiller.Api.workerStepCallback
     * @param {jQuery|HtmlElement|undefined} highlightedElement Most recently 
     * highlighted element is passed back to this callback
     * @param {CartFiller.Api.StepEnvironment} env Environment utility object
     */

    /** 
     * Called by Api when target site window issues onload event
     * Has no parameters and result of this callback is ignored
     * It is expected, that with this callback Worker checks result
     * of navigation or form submit, and reports result with 
     * {@link CartFiller.Api#result} function
     * 
     * @callback CartFiller.Api.onloadCallback
     * @param {boolean|undefined} watchdog See {@link CartFiller.Dispatcher#onMainFrameLoaded}
     */
    /**
     * Used by {@link CartFiller.Api#waitFor} to check for particular event.
     * Has no parameters and should return either true if event happend
     * or false (=undefined) if not. If this callback itself calls
     * {@link CartFiller.Api#result} or {@link CartFiller.Api#nop}, then
     * {@link CartFiller.Api.waitForResultCallback} will not be called
     * and step will be considered as completed. This can happen, if 
     * during check procedure an error occures
     * 
     * @callback CartFiller.Api.waitForCheckCallback
     * @return {boolean|undefined} true if event happened, false or undefined
     * if not
     */

    /**
     * Used by {@link CartFiller.Api#waitFor} after either event or timeout
     * has happened. This function is expected to launch some more
     * actions against target website or report result using 
     * {@link CartFilter.Api#result} function.
     *
     * @callback CartFiller.Api.waitForResultCallback
     * @param {boolean} result Result, returned by 
     * {@link CartFilter.Api.waitForCheckCallback} function or false 
     * in case of timeout
     */

    /**
     * @var {CartFiller.Configuration} CartFiller.Api~me Shortcut to cartFiller configuration
     * @access private
     */
    var me = this.cartFillerConfiguration;
    me.scripts.push({
        /**
         * Returns name used by loader to organize modules
         * @function CartFiller.Api#getName 
         * @returns {String}
         * @access public
         */
        getName: function(){ return 'api'; },

        /**
         * Registers worker object. Worker object can be replaced by new one
         * to make it possible to update code during debugging.
         * @function CartFiller.Api#registerWorker
         * @param {CartFiller.Api.registerCallback} cb A callback, that will
         * will return an object, whoes properties are tasks, and each property
         * should be an array of ['step1 name', function(){...}, 'step2 name' ,
         * function(){...}, ...]
         * @see CartFiller.SampleWorker~registerCallback
         * @access public
         * @return {CartFiller.Api} for chaining
         */
        registerWorker: function(cb){
            me.modules.dispatcher.registerWorker(cb, this);
            return this;
        },
        /**
         * Used by Worker to report result of a step. If step does not 
         * finally (immediately or asynchronously) call result() or nop()
         * the process will stop and then will be considered as failure
         * @function CartFiller.Api#result
         * @param {String|undefined} message If undefined or empty string
         * then result considered successful, while nonempty string means
         * error
         * @param {String|undefined|boolean} recoverable If message means success, then
         * this parameter is only honored if it contains 'nop' string, 
         * otherwise it is ignored. 'nop' string means, that completely nothing
         * interesting happend during this step, so, if steps are executed in
         * slow mode, we can skip delays between steps, because there is no
         * any action. If message means error, then false or undefined means,
         * that error is severe and we should stop, while true means, that
         * we can skip all next steps of same task and continue to next task
         * To report 'nop' it is easier to use {CartFiller.Api#nop} method.
         * @access public
         * @return {CartFiller.Api} for chaining
         */
        result: function(message, recoverable){
            me.modules.dispatcher.submitWorkerResult(message, recoverable);
            return this;
        },
        /**
         * Reports, that nothing happend during this step. Means success. 
         * @function CartFiller.Api#nop
         * @access public
         * @return {CartFiller.Api} for chaining
         */
        nop: function(){
            me.modules.dispatcher.submitWorkerResult('', 'nop');
            return this;
        },
        /**
         * Registers the onload handler for the main window. Worker uses
         * this function before it initiates navigation in target website.
         * After callback is being called, it will not be called again until
         * worker will register it by calling onload() another time
         *
         * @function CartFiller.Api#onload
         * @param {CartFiller.Api.onloadCallback} cb Callback
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        onload: function(cb){
            me.modules.dispatcher.registerWorkerOnloadCallback(cb);
            return this;
        },
        /**
         * Waits for particular event, calling checkCallback time to time
         * to check whether event happened or not, and calling resultCallback 
         * once after event or timeout has happened
         * @function CartFiller.Api#waitFor
         * @param {CartFiller.Api.waitForCheckCallback} checkCallback
         * @param {CartFiller.Api.waitForResultCallback} resultCallback
         * @param {integer} timeout Measured in milliseconds. Default value
         * (if timeout is undefined) 20000 ms
         * @param {integer} period Poll period, measured in milliseconds, 
         * default value (if undefined) is 200 ms
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        waitFor: function(checkCallback, resultCallback, timeout, period){
            if (undefined === timeout){
                timeout = 20000;
            }
            if (undefined === period){
                period = 200;
            }
            var counter = Math.round(timeout / period);
            var fn = function(){
                var result = checkCallback();
                if (false === me.modules.dispatcher.getWorkerCurrentStepIndex()){
                    return;
                } 
                if (result) {
                    resultCallback(result);
                } else {
                    counter --;
                    if (counter > 0){
                        setTimeout(fn, period);
                    } else {
                        resultCallback(false);
                    }
                }
            };
            setTimeout(fn, period);
            return this;
        },
        /**
         * Highlights element by adding a gray semi-transparent overlay over 
         * the target website page, which has a rectangular hole over
         * this element + some padding around
         * Additionally API remembers this element and passes it back
         * to [next step handler]{@link CartFiller.Api.workerStepCallback}
         * as first parameter
         * 
         * @function CartFiller.Api#highlight
         * @param {jQuery|HtmlElement} element If jQuery object is passed, then
         * only first element will be highlighted unless allElements parameter
         * is set to true. If element is false, undefined or empty jQuery
         * object, then whole page will be covered by gray overlay.
         * @param {boolean|undefined} allElements If set to true, then a rectangle
         * which fit all the elements will be drawn
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        highlight: function(element, allElements){
            me.modules.ui.highlight(element, allElements);
            me.modules.dispatcher.setHighlightedElement(element);
            return this;
        }

    });
}).call(this, document, window);
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
     * Keeps worker URL during load process. If load was successful sends URL back to controller
     * @var {String} CartFiller.Dispatcher~workerSrcPretendent
     * @access private
     */
    var workerSrcPretendent = '';
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
                workerSrcPretendent = message.src;
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
            this.postMessageToWorker('workerRegistered', {jobTaskDescriptions: list, src: workerSrcPretendent});
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
/**
 * Manages loading of pieces of code
 * @class CartFiller.Loader
 */
(function(document, window, undefined){
    'use strict';
    /** 
     * modules to be loaded
     * @member {String[]} CartFiller.Loader~require
     * @access private
     */
    var require = [
        'dispatcher',
        'ui',
        'api'
    ];

    var me = this;
    /**
     * Calls CartFiller.Configuration#launch when all modules are loaded
     * @function CartFiller.Loader~onScriptLoaded
     * @access private
     */
    var onScriptLoaded = function(){
        for (var i = require.length - 1; i >= 0; i --){
            var found = false;
            for (var j = me.cartFillerConfiguration.scripts.length - 1; j >= 0; j--){
                if (me.cartFillerConfiguration.scripts[j].getName() === require[i]){
                    found = true;
                    break;
                }
            }
            if (!found) {
                return;
            }
        }
        // register gloabl function, that worker code will discover
        //// TBD wrap worker in another (function(){...}).call({api:...});, since
        // we are anyway evaluating worker code to load it
        window.cartFillerAPI = function(){
            return me.cartFillerConfiguration.modules.api;
        };
        me.cartFillerConfiguration.modules = {};
        for (var scriptIndex = me.cartFillerConfiguration.scripts.length - 1; scriptIndex >= 0; scriptIndex--){
            var script = me.cartFillerConfiguration.scripts[scriptIndex];
            me.cartFillerConfiguration.modules[script.getName()] = script;
        }
        me.cartFillerConfiguration.launch();
    };
    // replaces push function of {@link CartFiller.Configuration#scripts}
    // to be able to track new modules,that are loaded
    this.cartFillerConfiguration.scripts.push = function(value){
        Array.prototype.push.call(this, value);
        onScriptLoaded();
    };
    // we have to load scripts manually
    if (!this.cartFillerConfiguration.concatenated) {
        var head = document.getElementsByTagName('head')[0];
        for (var i = require.length - 1; i >= 0; i --){
            var script = document.createElement('script');
            script.setAttribute('src', this.cartFillerConfiguration.baseUrl + '/boot/helpers/' + require[i] + '.js');
            head.appendChild(script);
        }
    }
}).call(this, document, window);
/**
 * Manages effects on main frame, which shows target site
 * 
 * @class CartFiller.UI
 */
(function(document, window, undefined){
    'use strict';
    /**
     * Just to make code shorter
     * @member {CartFiller.configuration} CartFiller.UI~me
     * @access private
     */
    var me = this.cartFillerConfiguration;
    /**
     * Keeps current size of worker (job progress) frame
     * @member {String} CartFiller.UI~currentSize can be 'big' or 'small'
     * @access private
     */
    var currentSize;
    /**
     * @const {String} CartFiller.UI~overlayClassName
     * @default
     */
    var overlayClassName = 'cartFillerOverlayDiv';
    /**
     * @const {String} CartFiller.UI~mainFrameName
     * @default
     */
    var mainFrameName = 'cartFillerMainFrame';
    /**
     * @const {String} CartFiller.UI~workerFrameName
     * @default
     */
    var workerFrameName = 'cartFillerWorkerFrame';
    /**
     * @const {String} CartFiller.UI~chooseJobFrameName
     * @default
     */
    var chooseJobFrameName = 'cartFillerChooseJobFrame';

    /**
     * Returns main frame document
     * @function CartFiller.UI~getDocument
     * @returns {Document}
     * @access private
     */
    var getDocument = function(){
        return me.modules.ui.mainFrameWindow.document;
    };
    /**
     * Returns horizontal scroll position
     * @function CartFiller.UI~getScrollLeft
     * @returns {integer} 
     * @access private
     */
    var getScrollLeft = function(){
        return getDocument().documentElement.scrollLeft || getDocument().body.scrollLeft;
    };
    /**
     * Returns vertical scroll position
     * @function CartFiller.UI~getScrollTop
     * @returns {integer}
     * @access private
     */
    var getScrollTop = function(){
        return  getDocument().documentElement.scrollTop || getDocument().body.scrollTop;

    };
    /**
     * Creates overlay div
     * @function CartFiller.UI~createOverlay
     * @param {integer} left
     * @param {integer} top
     * @param {integer} right
     * @param {integer} bottom
     * @access private
     */
    var createOverlay = function(left, top, right, bottom){
        left = Math.round(left);
        top = Math.round(top);
        right = Math.round(right);
        bottom = Math.round(bottom);
        var div =  getDocument().createElement('div');
        div.style.position = 'absolute';
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = (right - left) + 'px';
        div.style.height = (bottom - top) + 'px';
        div.style.backgroundColor = 'rgba(0,0,0,0.3)';
        div.style.zIndex = 100000;
        div.className = overlayClassName;
        div.onclick = function(){removeOverlay();};
        getDocument().getElementsByTagName('body')[0].appendChild(div);

    };
    /**
     * Scrolls both vertically and horizontally to make center of specified
     * rectangle be in the center of window if possible
     * @function CartFiller.UI~scrollTo
     * @param {integer} left
     * @param {integer} top
     * @param {integer} right
     * @param {integer} bottom
     * @access private
     */
    var scrollTo = function(left, top, right, bottom){
        var centerX = (right + left ) / 2;
        var centerY = (bottom + top) / 2;
        var currentX, currentY;
        var destX = centerX - ( getDocument().documentElement.clientWidth / 2);
        var destY = centerY - ( getDocument().documentElement.clientHeight / 2);
        for (var tries = 1000; tries; tries--){
            currentX = getScrollLeft();
            currentY = getScrollTop();
            me.modules.ui.mainFrameWindow.scrollBy(destX - currentX, destY -  currentY);
            if (getScrollLeft() === currentX &&
                getScrollTop() === currentY) {
                break;
            }
        }

    };
    /**
     * Removes overlay divs
     * @function CartFiller.UI~removeOverlay
     * @access private
     */
    var removeOverlay = function(){
        var divs =  getDocument().getElementsByClassName(overlayClassName);
        for (var i = divs.length - 1; i >= 0 ; i--){
            divs[i].parentNode.removeChild(divs[i]);
        }
    };

    /**
     * Returns src for worker (job progress) frame
     * @function CartFiller.UI~getWorkerFramSrc
     * @returns {String}
     * @access private
     */
    var getWorkerFrameSrc = function(){
        return me.baseUrl + '/index.html';        
    };
    me.scripts.push({
        /**
         * Returns name used by loader to organize modules
         * @function CartFiller.Api#getName 
         * @returns {String}
         * @access public
         */
        getName: function(){ return 'ui'; },
        /** 
         * Sets size of worker (job progress) frame. Implementation
         * depends on particular type of UI - framed or popup
         * @function CartFiller.UI#setSize
         * @param {String} size can be 'big' or 'small'
         * @acces public
         */
        setSize: function() {},
        /**
         * Shows or hides Choose Job frame
         * @function CartFiller.UI#showHideChooseJobFrame
         * @param {boolean} show true to show, false to hide
         * @access public
         */
        showHideChooseJobFrame: function(show){
            this.chooseJobFrame.style.display = show ? 'block' : 'none';
        },
        /**
         * Closes popup window in case of popup UI
         * @function CartFiller.UI#closePopup
         * @access public
         */
        closePopup: function() {

        },
        /**
         * Highlights element by drawing an overlay
         * @see CartFiller.Api#highlight
         * @function CartFiller.UI#highlight
         * @access public
         */
        highlight: function(element, allElements){
                var rect;
                if (undefined !== this.mainFrameWindow.jQuery && (element instanceof this.mainFrameWindow.jQuery)){
                    if (1 > element.length) {
                        element = undefined;
                    } else {
                        if (true === allElements) {
                            rect = {left: undefined, right: undefined, top: undefined, bottom: undefined};
                            element.each(function(i,el){
                                var thisRect = el.getBoundingClientRect();
                                rect.left = (undefined === rect.left) ? thisRect.left : Math.min(rect.left, thisRect.left);
                                rect.right = (undefined === rect.right) ? thisRect.right : Math.max(rect.right, thisRect.right);
                                rect.top = (undefined === rect.top) ? thisRect.top : Math.min(rect.top, thisRect.top);
                                rect.bottom = (undefined === rect.bottom) ? thisRect.bottom : Math.max(rect.bottom, thisRect.bottom);
                            });
                         } else {
                            rect = element[0].getBoundingClientRect();                
                         }
                    }
                } else if (undefined !== element) {
                    rect = element.getBoundingClientRect();                
                }
                var body = this.mainFrameWindow.document.getElementsByTagName('body')[0];
                var full = body.getBoundingClientRect();
                var scrollTop = getScrollTop();
                var scrollLeft = getScrollLeft();
                var pageRight = Math.max(full.right + scrollLeft, body.scrollWidth, this.mainFrameWindow.innerWidth) - 1;
                var pageBottom = Math.max(full.bottom + scrollTop, body.scrollHeight, this.mainFrameWindow.innerHeight) - 1;
                removeOverlay();
                if (undefined !== element) {
                    var border = 5;
                    createOverlay(0, 0, Math.max(0, rect.left + scrollLeft - border), pageBottom);
                    createOverlay(Math.min(pageRight, rect.right + scrollLeft + border), 0, pageRight, pageBottom);
                    createOverlay(Math.max(0, rect.left + scrollLeft - border), 0, Math.min(pageRight, rect.right + scrollLeft + border), Math.min(pageBottom, rect.top + scrollTop - border));
                    createOverlay(Math.max(0, rect.left + scrollLeft - border), Math.max(0, rect.bottom + scrollTop + border), Math.min(pageRight, rect.right + scrollLeft + border), pageBottom);
                    scrollTo(rect.left + scrollLeft, rect.top + scrollTop, rect.right + scrollLeft, rect.bottom + scrollTop);
                } else {
                    createOverlay(0, 0, pageRight, pageBottom);
                }

            },
        /**
         * Starts Popup type UI
         * @function CartFiller.UI#popup
         * @param {Document} document Document where we are at the moment of injecting
         * @param {Window} window Window, that we are at the moment of injecting
         * @access public
         */
        popup: function(document, window){
            var windowWidth = window.innerWidth,
                windowHeight = window.innerHeight,
                chooseJobFrameLeft = 0.02 * windowWidth,
                chooseJobFrameWidth = 0.76 * windowWidth,
                chooseJobFrameTop = 0.02 * windowHeight,
                chooseJobFrameHeight = 0.96 * windowHeight,
                workerFrameWidthBig = windowWidth * 0.8 - 1,
                workerFrameWidthSmall = windowWidth * 0.2 - 1;

            me.modules.dispatcher.init();
            this.mainFrameWindow = window.open(window.location.href, '_blank', 'height=' + Math.round(window.outerHeight) + ', width=' + Math.round(window.outerWidth*0.8));
            this.closePopup = function(){
                this.mainFrameWindow.close();
            };
            this.mainFrameWindow.addEventListener('load', function(){
                me.modules.dispatcher.onMainFrameLoaded();
            }, true);
            var ui = this;
            setTimeout(function loadWatcher(){
                if (ui.mainFrameWindow.document && 
                    (ui.mainFrameWindow.document.readyState === 'complete')){
                    me.modules.dispatcher.onMainFrameLoaded(true);
                }
                setTimeout(loadWatcher, 100);
            }, 100);

            var body = window.document.getElementsByTagName('body')[0];
            while (body.children.length) {
                body.removeChild(body.children[0]);
            }

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentSize === 'big') ? 'small' : 'big';
                }
                currentSize = size;
                if (size === 'big') {
                    this.workerFrame.style.width = workerFrameWidthBig + 'px';
                    this.workerFrame.style.left = (windowWidth - workerFrameWidthBig - 5) + 'px';
                } else if (size === 'small') {
                    this.workerFrame.style.width = workerFrameWidthSmall + 'px';
                    this.workerFrame.style.left = (windowWidth - workerFrameWidthSmall - 5) + 'px';
                }
            };

            this.workerFrame = window.document.createElement('iframe');
            this.workerFrame.setAttribute('name', workerFrameName);
            this.workerFrame.style.position='fixed';
            this.workerFrame.style.top = '0px';
            this.workerFrame.style.height = '100%';
            this.workerFrame.style.zIndex = '100000';
            this.setSize('big');
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();

            this.chooseJobFrame = window.document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.position='fixed';
            this.chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
            this.chooseJobFrame.style.top = chooseJobFrameTop + 'px';
            this.chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
            this.chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
            this.chooseJobFrame.style.zIndex = '1000000';
            this.chooseJobFrame.style.background = 'white';
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];
            this.chooseJobFrameWindow.location.href=me['data-choose-job'];


        },
        /**
         * Starts Popup type UI
         * @function CartFiller.UI#framed
         * @param {Document} document Document where we are at the moment of injecting
         * @param {Window} window Window, that we are at the moment of injecting
         * @access public
         */
        framed: function(document, window) {
            me.modules.dispatcher.init();
            var body = document.getElementsByTagName('body')[0];
            var mainFrameSrc = window.location.href,
                chooseJobFrameSrc = me['data-choose-job'],
                windowWidth = window.innerWidth,
                windowHeight = window.innerHeight,
                mainFrameWidthBig = windowWidth * 0.8 - 1,
                mainFrameWidthSmall = windowWidth * 0.2 - 1,
                workerFrameWidthBig = windowWidth * 0.8 - 1,
                workerFrameWidthSmall = windowWidth * 0.2 - 1,
                framesHeight = windowHeight - 15,
                chooseJobFrameLeft = 0.02 * windowWidth,
                chooseJobFrameWidth = 0.76 * windowWidth,
                chooseJobFrameTop = 0.02 * windowHeight,
                chooseJobFrameHeight = 0.96 * windowHeight,
                currentSize = 'big';



            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            this.mainFrame = document.createElement('iframe');
            this.mainFrame.setAttribute('name', mainFrameName);
            this.mainFrame.style.height = framesHeight + 'px';
            this.mainFrame.style.position = 'fixed';
            this.mainFrame.style.left = '0px';
            this.mainFrame.style.top = '0px';

            this.workerFrame = document.createElement('iframe');
            this.workerFrame.setAttribute('name', workerFrameName);
            this.workerFrame.style.height = framesHeight + 'px';
            this.workerFrame.style.position = 'fixed';
            this.workerFrame.style.top = '0px';

            this.chooseJobFrame = document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.display = 'none';
            this.chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
            this.chooseJobFrame.style.top = chooseJobFrameTop + 'px';
            this.chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
            this.chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
            this.chooseJobFrame.style.position = 'fixed';
            this.chooseJobFrame.style.background = 'white';
            body.appendChild(this.mainFrame);
            this.mainFrameWindow = window.frames[mainFrameName];

            this.mainFrame.onload = function(){
                me.modules.dispatcher.onMainFrameLoaded();
            };

            this.mainFrameWindow.location.href=mainFrameSrc;
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];
            this.chooseJobFrameWindow.location.href=chooseJobFrameSrc;

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentSize === 'big') ? 'small' : 'big';
                }
                currentSize = size;
                if (size === 'big') {
                    this.workerFrame.style.width = workerFrameWidthBig + 'px';
                    this.mainFrame.style.width = mainFrameWidthSmall + 'px';
                    this.workerFrame.style.left = mainFrameWidthSmall + 'px';
                } else if (size === 'small') {
                    this.workerFrame.style.width = workerFrameWidthSmall + 'px';
                    this.mainFrame.style.width = mainFrameWidthBig + 'px';
                    this.workerFrame.style.left = mainFrameWidthBig + 'px';
                }
            };

            this.setSize('big');
        }
    });
}).call(this, document, window);
// this file is used as a footer when concatenating inject scripts. It is not valid as standalone.
/* jshint ignore:start */
}).call({
    cartFillerConfiguration:{},
    cartFillerEval:this.cartFillerEval
});
/* jshint ignore:end */