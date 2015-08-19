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
        if (window.opener && window.opener !== window) {
            this.modules.dispatcher.startSlaveMode();
        } else {
            if (String(config['data-type']) === '0') {
                this.modules.ui.framed(document, window);
            } else if (String(config['data-type']) === '1'){
                this.modules.ui.popup(document, window);
            } else {
                alert('Type not specified, should be 0 for framed, 1 for popup');
            }
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
    /**
     * Used to optimize deep caching of worker (job progress) frame app
     * @member {String} CartFiller.Configuration#gruntBuildTimeStamp
     * @access public
     */
    config.gruntBuildTimeStamp='1459214763734';

    // if we are not launched through eval(), then we should fetch
    // parameters from data-* attributes of <script> tag
    if (!evaled){
        var scripts = document.getElementsByTagName('head')[0].getElementsByTagName('script');
        var i;
        for (i = 0 ; i < scripts.length; i ++) {
            var me = scripts[i];
            // let's identify our script by set of attributes for <script> element
            if (me.getAttribute('data-type') !== null &&
               me.getAttribute('data-base-url') !== null &&
               me.getAttribute('data-choose-job') !== null) {
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
                break;
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
     * @param {CartFillerPlugin~JobDetails} job contains full copy of job details
     * as passed by chooseJob frame
     * @param {Object} globals An object, whoes properties can be set at one step
     * and then reused in the other step
     * @return {Array} where even members are names of steps, and odd members
     * are either step functions or arrays of function + parameters object, e.g.
     * [
     *  'step 1',
     *  function(task,env){ ... },
     *  'step 2',
     *  [function(task,env){.. env.params.theParam ...}, {theParam: 2}],
     * ]
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
     * Used by {@link CartFiller.Api#each} when iterating through arrays
     * @callback CartFiller.Api.eachCallback
     * @param {integer} index
     * @param {Object} value
     * @return {boolean} false means stop iteration
     */

    /**
     * Another callback used by {@link CartFiller.Api#each} -- called when iterating through
     * array items was not interrupted
     * @callback CartFiller.Api.eachOtherwiseCallback
     */

    /**
     * Callback, that can be registered using api.registerOnloadCallback, and will be 
     * called after each page reload is detected. Result is ignored, but this function
     * may throw exception which is same as error result.
     * @callback CartFiller.Api.onloadEventCallback
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
         * function(){...}, ...]. If this array will contain arrays as elements
         * then these will be 'flattened'
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
         * @param {String|Object|undefined} response If there is anything meaninful,
         * that should be delivered back to ChooseJob frame - then put it here.
         * @access public
         * @return {CartFiller.Api} for chaining
         */
        result: function(message, recoverable, response){
            me.modules.dispatcher.submitWorkerResult(message, recoverable, response);
            return this;
        },
        /**
         * Tells that this task should be completely skipped, so cartFiller will
         * proceed with next task. After using this function you still have to call
         * api.result, and it is important to call api.skipTask first and 
         * api.result then. 
         * @function CartFiller.Api#skipTask
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        skipTask: function() {
            me.modules.dispatcher.manageTaskFlow('skipTask');
            return this;
        },
        /**
         * Tells that this task should be repeated, so cartFiller will
         * proceed with first step of this task. After using this function
         * you still have to call api.result, and it is important to call
         * api.skipTask first and api.result then.
         * @function CartFiller.Api#repeatTask
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        repeatTask: function() {
            me.modules.dispatcher.manageTaskFlow('repeatTask');
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
         * @param {CartFiller.Api.onloadCallback} cb Callback, if not specified
         *          then just api.result() will be ussued after page loads
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        onload: function(cb){
            if (undefined === cb) {
                cb = function() {
                    me.modules.api.result();
                };
            }
            me.modules.dispatcher.registerWorkerOnloadCallback(cb);
            return this;
        },
        /**
         * Waits for particular event, calling checkCallback time to time
         * to check whether event happened or not, and calling resultCallback 
         * once after event or timeout has happened
         * @function CartFiller.Api#waitFor
         * @param {CartFiller.Api.waitForCheckCallback} checkCallback
         * @param {CartFiller.Api.waitForResultCallback} resultCallback can be string or nothing.
         * If string is specified, then generic result callback will be there, submitting
         * string as error result. If nothing is specified, then just "timeout" will be submitted
         * in case of failure
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
            if (!resultCallback) {
                resultCallback = '';
            }
            if ('string' === typeof resultCallback) {
                resultCallback = (function(s){ 
                    return function(r) {
                        me.modules.api.result(r?'':(s.length ? s : 'timeout'));
                    };
                })(resultCallback);
            }
            var fn = function(){
                var result;
                try {
                    result = checkCallback();
                } catch (e) {
                    me.modules.dispatcher.reportErrorResult(e);
                    return;
                }
                if (false === me.modules.dispatcher.getWorkerCurrentStepIndex()){
                    return;
                } 
                if (result) {
                    try {
                        resultCallback(result);
                    } catch (e) {
                        me.modules.dispatcher.reportErrorResult(e);
                        return;
                    }
                } else {
                    counter --;
                    if (counter > 0){
                        me.modules.api.setTimeout(fn, period);
                    } else {
                        try {
                            resultCallback(false);
                        } catch (e) {
                            me.modules.dispatcher.reportErrorResult(e);
                            return;
                        }
                    }
                }
            };
            me.modules.api.setTimeout(fn, period);
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
            try {
                me.modules.ui.highlight(element, allElements);
                me.modules.dispatcher.setHighlightedElement(element);
            } catch (e) {}
            return this;
        },
        /**
         * Sames as {@link CartFiller.API#highlight}, but draws red overlay
         * arrows instead. This function does not try to scroll anything. This 
         * function is useful for those sites, that have various scrollable 
         * elements besides page itself. Parameters are same as 
         * {@link CartFiller.API#highlight}
         * 
         * @function CartFiller.API#arrow
         * @see CartFiller.API#highlight
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        arrow: function(element, allElements){
            try {
                me.modules.ui.arrowTo(element, allElements);
                me.modules.dispatcher.setHighlightedElement(element);
            } catch (e){}
            return this;
        },
        /**
         * Displays comment message over the overlay in the main frame
         * @function CartFiller.Api#say
         * @param {String} message
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        say: function(message){
            me.modules.ui.say(message);
            return this;
        },
        /**
         * Just another for-each implementation, jQuery style
         * @function CartFiller.Api#each
         * @param {Array} array Array to iterate through
         * @param {CartFiller.Api.eachCallback} fn Called for each item, if result === false
         *          then iteration will be interrupted
         * @param {CartFillerApi.eachOtherwiseCallback} otherwise Called if iteration was
         * not interrupted
         * @return {CartFiller.Api} for chaining
         * @return this for chaining 
         * @access public
         */
        each: function(array, fn, otherwise){
            var i;
            var breaked = false;
            if (array instanceof Array || array.constructor && array.constructor.name === 'HTMLCollection') {
                for (i = 0 ; i < array.length; i++ ) {
                    if (false === fn(i, array[i])) {
                        breaked = true;
                        break;
                    }
                }
            } else if (null !== array && 'object' === typeof array && 'string' === typeof array.jquery && undefined !== array.length && 'function' === typeof array.each) {
                array.each(function(i,el){
                    var r = fn(i,el);
                    if (false === r) {
                        breaked = true;
                    }
                    return r;
                });
            } else {
                for (i in array) {
                    if (array.hasOwnProperty(i)) {
                        if (false === fn(i, array[i])) {
                            breaked = true;
                            break;
                        }
                    }
                }
            }
            if (! breaked && otherwise instanceof Function) {
                otherwise();
            }
        },
        /**
         * Compare two strings, if they match return '', if they mismatch return full
         * dump showing exact position where they mismatch
         * @function CartFiller.Api#compare
         * @param {string} ethalon
         * @param {string} value
         * @return {string}
         * @access public
         */
        compare: function(ethalon, value) {
            ethalon = String(ethalon);
            value = String(value);
            if (ethalon === value) {
                return '';
            }
            var r = '[';
            for (var i = 0; i < Math.max(ethalon.length, value.length); i++) {
                if (ethalon.substr(i, 1) === value.substr(i, 1)) {
                    r += ethalon.substr(i, 1);
                } else {
                    r += '] <<< expected: [' + ethalon.substr(i) + '], have: [' + value.substr(i) + ']';
                    break;
                }
            }
            return r;
        },
        /**
         * Safe setTimeout, that registers handler in cartFiller, so, if 
         * timeout will happen earlier then this handler will be invoked
         * this handler will be cleared automatically
         * @function CartFiller.Api#setTimeout
         * @param {Function} fn same as normal JavaScript setTimeout
         * @param {integer} timeout  same as normal JavaScript setTimeout
         * @return {integer} same as normal JavaScript setTimeout
         * @access public
         */
        setTimeout: function(fn, timeout) {
            me.modules.dispatcher.registerWorkerSetTimeout(setTimeout(fn, timeout));
        },
        /**
         * Safe setInterval, that registers handler in cartFiller, so, if 
         * timeout will happen earlier then this handler will be invoked
         * this handler will be cleared automatically
         * @function CartFiller.Api#setTimeout
         * @param {Function} fn same as normal JavaScript setInterval
         * @param {integer} timeout  same as normal JavaScript setInterval
         * @return {integer} same as normal JavaScript setInterval
         * @access public
         */
        setInterval: function(fn, timeout) {
            me.modules.dispatcher.registerWorkerSetInterval(setInterval(fn, timeout));
        },
        /**
         * Helper function to construct workers - return array ['click', function(el){ el[0].click(); api.result; }]
         * @function CartFiller.Api#click
         * @param {Function} what to do after click
         * @return {Array}
         * @access public
         */
        click: function(whatNext) {
            return [
                'click', function(el){
                    if ('object' === typeof el && 'string' === typeof el.jquery && undefined !== el.length) {
                        el[0].click();
                    } else if (el instanceof Array) {
                        el[0].click();
                    } else {
                        el.click();
                    }
                    if (undefined === whatNext) {
                        me.modules.api.result();
                    } else {
                        whatNext();
                    }
                }
            ];
        },
        /**
         * Opens relay window. If url points to the cartFiller distribution
         * @function CartFiller.Api#openRelay
         * @param {string} url
         * @param {boolean} noFocus Experimental, looks like it does not work
         * @access public
         */
        openRelay: function(url, noFocus) {
            me.modules.dispatcher.openRelayOnTheTail(url, noFocus);
        },
        /**
         * Registers onload callback, that is called each time when new page
         * is loaded. Idea is that this function can verify if new page contains
         * critical application error, exception description, etc
         * @function CartFiller.Api#registerOnloadCallback
         * @param {string|CartFiller.Api.onloadEventCallback} aliasOrCallback alias or method if alias is not used
         * @param {CartFiller.Api.onloadEventCallback|undefined} callbackIfAliasIsUsed method if alias is used
         * @access public
         */
        registerOnloadCallback: function(aliasOrCallback, callbackIfAliasIsUsed){
            me.modules.dispatcher.registerEventCallback('onload', callbackIfAliasIsUsed ? aliasOrCallback : '', callbackIfAliasIsUsed ? callbackIfAliasIsUsed : aliasOrCallback);
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
                        postMessage(relay.isSlave ? window.opener : me.modules.ui.workerFrameWindow, message.cmd, message);
                    } else {
                        var fn = 'onMessage_' + message.cmd;
                        if (undefined !== dispatcher[fn] && dispatcher[fn] instanceof Function){
                            dispatcher[fn](message, event.source);
                        } else {
                            console.log('unknown message: ' + fn + ':' + event.data);
                        }
                    }
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
                for (url in workerSourceCodes) {
                    if (workerSourceCodes.hasOwnProperty(url)) {
                        relay.nextRelayQueue.push({cmd: 'loadWorker', url: url, code: workerSourceCodes[url]});
                    }
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
                throw('unknown job details package - should have either details or $cartFillerTestUpdate');
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
                eval(message.code); // jshint ignore:line
                if (relay.nextRelay) {
                    postMessage(relay.nextRelay, message.cmd, message);
                }

            } catch (e){
                alert(e);
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
                var env = {
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
                                env.params = workerFn[1];
                                workerFn = workerFn[0];
                            } else {
                                alert('invalid worker - function for ' + message.task + ' step ' + message.step + ' is not a function');
                                return;
                            }
                        }
                        // register watchdog
                        registerWorkerWatchdog();
                        if (message.debug) {
                            /* jshint ignore:start */
                            debugger;
                            /* jshint ignore:end */
                        }
                        workerFn(highlightedElement, env);
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
         * @access public
         */
        onMessage_refreshPage: function() {
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
         * @param {CartFiller.Api} api
         * @access public
         */
        registerWorker: function(cb, api){
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
            var thisWorker = cb(me.modules.ui.mainFrameWindow, undefined, api, workerCurrentTask, jobDetailsCache, workerGlobals);
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
            var status;
            if ((undefined === message) || ('' === message)) {
                status = 'ok';
            } else if ('string' === typeof message){
                status = recoverable ? 'skip' : 'error';
            } else {
                throw 'invalid message type ' + typeof(message);
            }
            removeWatchdogHandler();
            clearRegisteredTimeoutsAndIntervals();
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
     * Indicates, that ChooseJob frame is already loaded. ChooseJob frame
     * is loadeda after both main and worker frames are completely initialized. 
     * This is done to allow ChooseJob frame submit job immediately without user
     * interaction.
     * @member {boolean} CartFiller.UI~chooseJobFrameLoaded
     * @access private
     */
    var chooseJobFrameLoaded = false;
    /**
     * Structure, that keeps information about highlighted element
     * @class CartFiller.UI.ArrowToElement
     */
    /**
     * @member {HtmlElement} CartFiller.UI.ArrowToElement#element
     * @access public
     */
    /**
     * @member {integer} CartFiller.UI.ArrowToElement#left
     * @access public
     */
    /**
     * @member {integer} CartFiller.UI.ArrowToElement#top 
     * @access public
     */
    /**
     * @member {integer} CartFiller.UI.ArrowToElement#width
     * @access public
     */
    /**
     * @member {integer} CartFiller.UI.ArrowToElement#height
     * @access public
     */
    /**
     * Keeps list of highlighted elements, which we should draw marking arrows to
     * @member {CartFiller.UI.ArrowToElement} CartFiller.UI~arrowToElements
     * @access private
     */
    var arrowToElements = [];
    /**
     * Keeps list of elements, which we should highlight
     * @member {CartFiller.UI.ArrowToElement} CartFiller.UI~highlightedElements
     * @access private
     */
    var highlightedElements = [];
    /**
     * Keeps current message to say
     * @member {String} CartFiller.UI~messageToSay
     * @access private
     */
    var messageToSay = '';
    /**
     * Keeps current message that is already on the screen to trigger refresh
     * @member {String} CartFiller.UI~currentMessageOnScreen
     * @access private
     */
    var currentMessageOnScreen = '';
    /**
     * Keeps current remaining attempts to adjust message div to fit whole message 
     * on current viewport
     * @member {String} CartFiller.UI~messageAdjustmentRemainingAttempts
     * @access private
     */
    var messageAdjustmentRemainingAttempts = 0;
    /**
     * Keeps current message div width, which is adjusted (made wider) in
     * steps until message will fit in current viewport
     * @member {integer} CartFiller.UI~currentMessageDivWidth
     * @access private
     */
    var currentMessageDivWidth = false;
    /**
     * Is set to true if UI is working in framed mode
     * This lets us draw overlays in main window instead of main frame
     * @member {boolean} CartFiller.UI~isFramed
     * @access private
     */
    var isFramed = false;
    /**
     * Keeps current size of worker (job progress) frame, can be either 'small' or 'big'
     * @member {String} CartFiller.UI~currentWorkerFrameSize
     * @access private
     */
    var currentWorkerFrameSize = 'big';
    /**
     * If set to true then we'll report elements on which mouse pointer is right now
     * @member {boolean} CartFiller.UI~reportMousePointer
     * @access private
     */
    var reportMousePointer = false;
    /**
     * Returns window, that will be used to draw overlays
     * @function {Window} CartFiller.UI~overlayWindow
     * @access private
     */
    var overlayWindow = function(){
        return isFramed && 0 ? window : me.modules.ui.mainFrameWindow;
    };
    /**
     * Returns color for red overlay arrows
     * @function CartFiller.UI~getRedArrowColorDefinition
     * @return {String}
     * @access private
     */
    var getRedArrowColor = function(){
        return 'rgba(255,0,0,0.3)';
    };
    /**
     * Creates overlay div for red arrows
     * @function CartFiller.UI~getOverlayDiv2
     * @return {HtmlElement} div
     * @access private
     */
    var getOverlayDiv2 = function(){ 
        var div = overlayWindow().document.createElement('div');
        div.style.position = 'fixed';
        div.style.backgroundColor = getRedArrowColor();
        div.style.zIndex = getZIndexForOverlay();
        div.className = overlayClassName;
        div.onclick = function(){removeOverlay(true);};
        overlayWindow().document.getElementsByTagName('body')[0].appendChild(div);
        return div;
    };
    /**
     * Draws vertical arrow line
     * @function CartFiller.UI~verticalLineOverlay
     * @param {integer} left
     * @param {integer} top
     * @param {integer} height
     * @access private
     */
    var verticalLineOverlay = function(left, top, height){
        var div = getOverlayDiv2();
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = '20px';
        div.style.height = height + 'px';
    };
    /**
     * Draws horizontal overlay line
     * @function CartFiller.UI~horizontalLineOverlay
     * @param {integer} left
     * @param {integer} top
     * @param {integer} width
     * @access private
     */
    var horizontalLineOverlay = function(left, top, width) {
        var div = getOverlayDiv2();
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = width + 'px';
        div.style.height = '20px';
    };
    /**
     * Draws horizontal overlay arrow, direction = right
     * @function CartFiller.UI~horizontalArrowOverlayRight
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var horizontalArrowOverlayRight = function (left, top){
        var div = getOverlayDiv2();
        div.style.left = left + 'px';
        div.style.top = (top - 25) + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderTop = div.style.borderBottom = '25px solid transparent';
        div.style.borderLeft = '30px solid rgba(255,0,0,0.3)';
    };
    /**
     * Draws vertical overlay arrow, direction = down
     * @function CartFiller.UI~verticalArrowOverlayDown
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var verticalArrowOverlayDown = function(left, top){
        var div = getOverlayDiv2();
        div.style.left = (left - 25) + 'px';
        div.style.top = top + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderLeft = div.style.borderRight = '25px solid transparent';
        div.style.borderTop = '30px solid rgba(255,0,0,0.3)';
    };
    /**
     * Shifts client bounding rectangle if an element is inside frame(s)
     * @param {Object} rect Client bounding rect
     * @param {HtmlElement} el
     * @return {Object} rect
     * @access private
     */
    var shiftRectWithFrames = function(rect, el){
        if (undefined !== el.ownerDocument && undefined !== el.ownerDocument.defaultView && undefined !== el.ownerDocument.defaultView.parent && el.ownerDocument.defaultView.parent !== el.ownerDocument.defaultView) {
            var frames = [];
            try {
                frames = el.ownerDocument.defaultView.parent.document.getElementsByTagName('iframe');
            } catch (e) {}
            for (var i = frames.length - 1 ; i >= 0 ;i --){
                var frameDocument;
                try {
                    frameDocument = frames[i].contentDocument;
                } catch (e){}
                var frameWindow;
                try {
                    frameWindow = frames[i].contentWindow;
                } catch (e){}
                if (
                    (frameDocument === el.ownerDocument) ||
                    (el.ownerDocument !== undefined && el.ownerDocument.defaultView === frameWindow)
                ){
                    var frameRect = frames[i].getBoundingClientRect();
                    var newRect = {
                        top: rect.top + frameRect.top,
                        bottom: rect.bottom + frameRect.top,
                        left: rect.left + frameRect.left,
                        right: rect.right + frameRect.left,
                        width: rect.width,
                        height: rect.height
                    };
                    return shiftRectWithFrames(newRect, frames[i]);
                }
            }
        }
        return rect;
    };
    /**
     * Draws vertical overlay arrow, direction = up
     * @function CartFiller.UI~verticalArrowOverlayUp
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var verticalArrowOverlayUp = function(left, top){
        var div = getOverlayDiv2();
        div.style.left = (left - 25) + 'px';
        div.style.top = top + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderLeft = div.style.borderRight = '25px solid transparent';
        div.style.borderBottom = '30px solid rgba(255,0,0,0.3)';
    };
    var findChanges = function(elements){
        var rebuild = false, i, top, left, width, height, element, rect;
        // check whether positions of elements have changed
        for (i = elements.length - 1; i >= 0; i--){
            element = elements[i];
            rect = element.element.getBoundingClientRect();
            rect = shiftRectWithFrames(rect, element.element);
            if (rect.width > 0 || rect.height > 0 || rect.left > 0 || rect.top > 0) {
                top = Math.round(rect.top - 5);
                left = Math.round(rect.left - 5);
                height = Math.round(rect.height + 9);
                width = Math.round(rect.width + 9);
            } else {
                element.left = element.right = element.top = element.bottom = undefined;
            }
            if ((top !== element.top) ||
                (left !== element.left) ||
                (height !== element.height) ||
                (width !== element.width)){
                rebuild = true;
                element.top = top;
                element.left = left;
                element.height = height;
                element.width = width;
            }
        }
        return rebuild;
    };
    /**
     * Draws arrow overlay divs
     * @function CartFiller.UI~drawArrows
     * @access private
     */
    var drawArrows = function(){
        var i, top, left, bottom;
        for (i = arrowToElements.length - 1; i >= 0; i--){
            var el = arrowToElements[i];
            if (el.left === undefined) {
                continue;
            }
            var div = getOverlayDiv2();
            div.style.backgroundColor = 'transparent';
            div.style.borderLeft = div.style.borderTop = div.style.borderRight = div.style.borderBottom = '5px solid rgba(255,0,0,0.3)';
            div.style.left = el.left + 'px';
            div.style.top = el.top + 'px';
            div.style.width = el.width + 'px';
            div.style.height = el.height + 'px';
            div.style.boxSizing = 'border-box';
            if (el.left > 40) {
                top = el.top + Math.round(el.height/2);
                verticalLineOverlay(0, 0, top - 10);
                horizontalLineOverlay(0, top - 10, el.left - 30);
                horizontalArrowOverlayRight(el.left - 30, top);
            } else if (el.top > 40) {
                left = el.left + Math.min(30, Math.round(el.width / 2));
                horizontalLineOverlay(0, 0, left - 10);
                verticalLineOverlay(left - 10, 0, el.top - 30);
                verticalArrowOverlayDown(left, el.top - 30);
            } else {
                left = el.left + Math.min(30, Math.round(el.width / 2));
                bottom = el.top + el.height;
                horizontalLineOverlay(0, bottom + 60, left + 10);
                verticalLineOverlay(left - 10, bottom + 30, 30);
                verticalArrowOverlayUp(left, bottom);

            }
        }
    };
    /**
     * Finds max bounding rectange of elements
     * @function CartFiller.UI~findMaxRect
     * @param {CartFiller.UI.ArrowToElement[]} elements
     * @param {CartFiller.UI.ArrowToElement[]} moreElements
     * @access private
     */
    var findMaxRect = function(elements, moreElements){
        var src = [elements, moreElements];
        var i, j, left, top, right, bottom, el;
        for (j = src.length - 1 ; j >= 0; j--){
            if (undefined === src[j]) {
                continue;
            }
            for (i = src[j].length - 1; i >= 0; i--){
                el = src[j][i];
                left = undefined === left ? el.left : Math.min(left, el.left);
                right = undefined === right ? (el.left + el.width) : Math.max(right, (el.left + el.width));
                top = undefined === top ? el.top : Math.min(top, el.top);
                bottom = undefined === bottom ? (el.top + el.height) : Math.max(bottom, (el.top + el.height));
            }
        }
        return {left: left, right: right, top: top, bottom: bottom};
    };
    /**
     * Schedules redraw of overlay divs by clearing cached positions
     * @function CartFiller.UI~scheduleOverlayRedraw
     * @param {CartFiller.UI.ArrowToElement[]} elements
     * @access private
     */
    var scheduleOverlayRedraw = function(elements){
        var i;
        for (i = elements.length - 1 ; i >= 0; i --){
            elements[i].left = elements[i].top = elements[i].width = elements[i].height = undefined;
        }
    };
    /**
     * Draws highlighting overlay divs
     * @function CartFiller.UI~drawHighlights
     * @access private
     */
    var drawHighlights = function(){
        var rect = findMaxRect(highlightedElements);
        if (rect.left === undefined) {
            return;
        }
        var pageBottom = me.modules.ui.mainFrameWindow.innerHeight;
        var pageRight = me.modules.ui.mainFrameWindow.innerWidth;
        var border = 5;
        createOverlay(0, 0, Math.max(0, rect.left - border), pageBottom);
        createOverlay(Math.min(pageRight, rect.right + border), 0, pageRight, pageBottom);
        createOverlay(Math.max(0, rect.left - border), 0, Math.min(pageRight, rect.right + border), Math.min(pageBottom, rect.top - border));
        createOverlay(Math.max(0, rect.left - border), Math.max(0, rect.bottom + border), Math.min(pageRight, rect.right + border), pageBottom);
    };
    /**
     * Draws message div
     * @function CartFiller.UI~drawMessage
     * @access private
     */
    var drawMessage = function(){
        var rect = findMaxRect(arrowToElements, highlightedElements);
        if (rect.left === undefined) {
            rect = {top: 0, bottom: 0, left: 0, right: 0};
        }
        if (
            (('string' === typeof messageToSay) && (messageToSay.length > 0)) ||
            (('string' !== typeof messageToSay) && (undefined !== messageToSay) && (null !== messageToSay) && !isNaN(messageToSay))
        ){
            var messageDiv = overlayWindow().document.createElement('div');
            messageDiv.style.display = 'block';
            messageDiv.style.backgroundColor = '#fff';
            messageDiv.style.padding = '10px';
            messageDiv.style.fontSize = '20px;';
            messageDiv.style.zIndex = getZIndexForOverlay() + 1;
            messageDiv.style.border = '#bbb solid 10px';
            messageDiv.style.borderRadius = '20px';
            messageDiv.style.overflow = 'auto';
            messageDiv.style.opacity = '0';
            messageDiv.style.top = (rect.bottom + 5) + 'px';
            messageDiv.style.left = Math.max(0, (Math.round((rect.left + rect.right) / 2) - currentMessageDivWidth)) + 'px';
            messageDiv.style.width = currentMessageDivWidth + 'px';
            messageDiv.style.height = 'auto';
            messageDiv.style.position = 'fixed';
            messageDiv.style.fontSize = '20px';
            messageDiv.className = overlayClassName;
            messageDiv.textContent = messageToSay;
            messageDiv.onclick = function(){removeOverlay(true);};
            overlayWindow().document.getElementsByTagName('body')[0].appendChild(messageDiv);
            messageAdjustmentRemainingAttempts = 100;
            me.modules.ui.adjustMessageDiv(messageDiv);
            currentMessageOnScreen = messageToSay;
        }
    };
    /**
     * Function, that maintains arrows on screen, called time to time.
     * @function CartFiller.UI~arrowToFunction
     * @access private
     */
    var arrowToFunction = function(){
        try {
            var rebuildArrows = findChanges(arrowToElements);
            var rebuildHighlights = findChanges(highlightedElements);
            var rebuildMessage = currentMessageOnScreen !== messageToSay;
            if (rebuildArrows || rebuildHighlights || rebuildMessage){
                removeOverlay();
                drawArrows();
                drawHighlights();
                drawMessage();
            }

        } catch (e) {}
    };
    var currentWindowDimensions = {
        width: false,
        height: false,
        outerWidth: false,
        outerHeight: false,
        workerFrameSize: false,
    };
    /**
     * Function that checks whether dimensions of browser window have changed and 
     * adjusts frames coordinates accordingly
     * @function CartFiller.UI~adjustFrameCoordinates
     * @access private
     */
    var adjustFrameCoordinates = function(){
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight,
            outerWidth = isFramed ? false : window.outerWidth,
            outerHeight = isFramed ? false : window.outerHeight;

        if (me.modules.ui.mainFrameWindow && me.modules.ui.mainFrameWindow.location) {
            var url = false;
            try {
                url = me.modules.ui.mainFrameWindow.location.href;
            } catch (e) {
            }
            if (url) {
                me.modules.dispatcher.updateCurrentUrl(url);
            }
        }
        if (currentWindowDimensions.width !== windowWidth ||
            currentWindowDimensions.height !== windowHeight ||
            currentWindowDimensions.outerWidth !== outerWidth ||
            currentWindowDimensions.outerHeight !== outerHeight ||
            currentWindowDimensions.workerFrameSize !== currentWorkerFrameSize) {
            (function() {
                var mainFrameWidthBig = windowWidth * 0.8 - 1,
                    mainFrameWidthSmall = windowWidth * 0.2 - 1,
                    workerFrameWidthBig = windowWidth * 0.8 - 1,
                    workerFrameWidthSmall = windowWidth * 0.2 - 1,
                    framesHeight = windowHeight - 15,
                    chooseJobFrameLeft = 0.02 * windowWidth + (isFramed ? 0 : 200),
                    chooseJobFrameWidth = 0.76 * windowWidth - (isFramed ? 0 : 200),
                    chooseJobFrameTop = 0.02 * windowHeight,
                    chooseJobFrameHeight = 0.96 * windowHeight;

                    if (isFramed) {
                        me.modules.ui.mainFrame.style.height = framesHeight + 'px';
                    }
                    me.modules.ui.workerFrame.style.height = framesHeight + 'px';
                    me.modules.ui.chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
                    me.modules.ui.chooseJobFrame.style.top = chooseJobFrameTop + 'px';
                    me.modules.ui.chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
                    me.modules.ui.chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
                    if (currentWorkerFrameSize === 'big') {
                        if (isFramed) {
                            me.modules.ui.workerFrame.style.width = workerFrameWidthBig + 'px';
                            me.modules.ui.mainFrame.style.width = mainFrameWidthSmall + 'px';
                            me.modules.ui.workerFrame.style.left = mainFrameWidthSmall + 'px';
                        } else {
                            me.modules.ui.mainFrameWindow.resizeTo(1,1);
                            me.modules.ui.workerFrame.style.width = workerFrameWidthBig + 'px';
                            me.modules.ui.workerFrame.style.left = (windowWidth - workerFrameWidthBig - 5) + 'px';
                        }
                    } else if (currentWorkerFrameSize === 'small') {
                        if (isFramed) {
                            me.modules.ui.workerFrame.style.width = workerFrameWidthSmall + 'px';
                            me.modules.ui.mainFrame.style.width = mainFrameWidthBig + 'px';
                            me.modules.ui.workerFrame.style.left = mainFrameWidthBig + 'px';
                        } else {
                            me.modules.ui.mainFrameWindow.resizeTo(Math.round(outerWidth*0.8 - 10), Math.round(outerHeight));
                            me.modules.ui.workerFrame.style.width = workerFrameWidthSmall + 'px';
                            me.modules.ui.workerFrame.style.left = (windowWidth - workerFrameWidthSmall - 5) + 'px';
                        }
                    }
            })();
            currentWindowDimensions.width = windowWidth;
            currentWindowDimensions.height = windowHeight;
            currentWindowDimensions.outerWidth = outerWidth;
            currentWindowDimensions.outerHeight = outerHeight;
            currentWindowDimensions.workerFrameSize = currentWorkerFrameSize;
        }
    };
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
        div.style.position = 'fixed';
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = (right - left) + 'px';
        div.style.height = (bottom - top) + 'px';
        div.style.backgroundColor = 'rgba(0,0,0,0.3)';
        div.style.zIndex = getZIndexForOverlay();
        div.className = overlayClassName;
        div.onclick = function(){removeOverlay(true);};
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
    var scrollTo = function(elements){
        var rect;
        var bottom = me.modules.ui.mainFrameWindow.innerHeight;
        var right =  me.modules.ui.mainFrameWindow.innerWidth;
        var minLeft, maxLeft, newLeft;
        var minTop, maxTop, newTop;
        if (elements.length > 0){
            if ('function' === typeof elements[0].element.scrollIntoView){
                elements[0].element.scrollIntoView();
            }
        }
        for (var tries = 1000; tries; tries--){
            findChanges(elements);
            rect = findMaxRect(elements);
            newLeft = Math.round((rect.right + rect.left) / 2);
            newTop = Math.round((rect.bottom + rect.top) / 2);
            if ((undefined !== minLeft) && 
               (newLeft >= minLeft) && (newLeft <= maxLeft) &&
               (newTop >= minTop) && (newTop <= maxTop))
            {
                break;
            }
            minLeft = undefined === minLeft ? newLeft : Math.min(minLeft, newLeft);
            maxLeft = undefined === maxLeft ? newLeft : Math.max(maxLeft, newLeft);
            minTop = undefined === minTop ? newTop : Math.min(minTop, newTop);
            maxTop = undefined === maxTop ? newTop : Math.max(maxTop, newTop);
            me.modules.ui.mainFrameWindow.scrollBy(newLeft - Math.round(right/2), newTop - Math.round(bottom/2));
        }
        scheduleOverlayRedraw(elements);
    };
    /**
     * Removes overlay divs
     * @function CartFiller.UI~removeOverlay
     * @access private
     */
    var removeOverlay = function(forever){
        var i, divs = getDocument().getElementsByClassName(overlayClassName);
        for (i = divs.length - 1; i >= 0 ; i--){
            divs[i].parentNode.removeChild(divs[i]);
        }
        divs = overlayWindow().document.getElementsByClassName(overlayClassName);
        for (i = divs.length - 1; i >= 0 ; i--){
            divs[i].parentNode.removeChild(divs[i]);
        }
        if (true === forever) {
            arrowToElements = highlightedElements = [];
            messageToSay = '';
        }
    };

    /**
     * Returns src for worker (job progress) frame
     * @function CartFiller.UI~getWorkerFramSrc
     * @returns {String}
     * @access private
     */
    var getWorkerFrameSrc = function(){
        return me.baseUrl + '/index' + (me.concatenated ? '' : '.uncompressed') + '.html' + (me.gruntBuildTimeStamp ? ('?' + me.gruntBuildTimeStamp) : '');        
    };
    /**
     * Vertical position of top of highlighted element
     * @member {integer} CartFiller.UI~highlightedElementTop
     * @access private
     */
    var highlightedElementTop = false;
    /**
     * Vertical position of bottom of highlighted element
     * @member {integer} CartFiller.UI~highlightedElementBottom
     * @access private
     */
    var highlightedElementBottom = false;
    /**
     * Returns z-index for overlay divs. 
     * @function {integer} CartFiller.UI~getZIndexForOverlay
     * @access private
     */
    var getZIndexForOverlay = function(){
        return 10000000; // TBD look for max zIndex used in the main frame
    };
    // Launch arrowToFunction
    setInterval(arrowToFunction, 200);

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
            if (show && !chooseJobFrameLoaded) {
                // load choose job frame now
                this.chooseJobFrameWindow.location.href = me['data-choose-job'];
                chooseJobFrameLoaded = true;
            }
            this.chooseJobFrame.style.display = show ? 'block' : 'none';
            this.setSize(show ? 'big' : 'small');
        },
        /**
         * Closes popup window in case of popup UI
         * @function CartFiller.UI#closePopup
         * @access public
         */
        closePopup: function() {

        },
        /**
         * Pops up mainFrame window if it is popup UI, if possible.
         * Implementation depends on UI
         * @function CartFiller.Dispatcher#onMessage_focusMainWindow
         * @access public
         */
        focusMainFrameWindow: function(){},
        /**
         * Highlights element by drawing an overlay
         * @see CartFiller.Api#highlight
         * @function CartFiller.UI#highlight
         * @access public
         */
        highlight: function(element, allElements){
            messageToSay = '';
            var body = this.mainFrameWindow.document.getElementsByTagName('body')[0];
            var i;

            body.style.paddingBottom = this.mainFrameWindow.innerHeight + 'px';

            highlightedElements = [];
            if (null !== element && 'object' === typeof element && 'string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each){
                element.each(function(i,el){
                    highlightedElements.push({element: el}); 
                    if (!allElements) {
                        return false;
                    }
                });
            } else if (element instanceof Array) {
                for (i = element.length -1 ; i >= 0 ; i --){
                    highlightedElements.push({element: element[i]});
                    if (true !== allElements) {
                        break;
                    }
                }
            } else if (undefined !== element) {
                highlightedElements.push({element: element});
            }
            if (highlightedElements.length > 0) {
                setTimeout(function(){
                    scrollTo(highlightedElements);
                },0);
            }
        },
        /**
         * Draw arrow to element(s). 
         * Parameters are same as for {@link CartFiller.UI#highlight}
         * @function CartFiller.UI#arrowTo
         * @access public
         */
        arrowTo: function(element, allElements){
            arrowToElements = [];
            if (null !== element && 'object' === typeof element && 'string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each){
                element.each(function(i,el){
                    arrowToElements.push({element: el}); 
                    if (!allElements) {
                        return false;
                    }
                });
            } else if (element instanceof Array) {
                for (var i = 0; i < element.length; i++){
                    arrowToElements.push({element: element[i]});
                    if (!allElements) {
                        break;
                    }
                }
            } else if (undefined !== element) {
                arrowToElements.push({element: element});
            } else {
                arrowToElements = [];
                removeOverlay(true);
            }
            if (arrowToElements.length > 0) {
                setTimeout(function(){
                    scrollTo(arrowToElements);
                },0);
            }
        },
        /**
         * Displays comment message over the overlay in the main frame
         * @function CartFiller.UI#say
         * @param {String} text
         * @access public
         */
        say: function(text){
            messageToSay = undefined === text ? '' : text;
            currentMessageDivWidth = Math.max(100, Math.round(this.mainFrameWindow.innerWidth * 0.5));
            messageAdjustmentRemainingAttempts = 100;
        },
        /**
         * Finds appropriate position and size for message div
         * to make text fit on page if possible
         * @function CartFiller.UI#adjustMessageDiv
         * @param {HtmlElement} div message div
         * @access public
         */
        adjustMessageDiv: function(div){
            var ui = this;
            setTimeout(function(){
                var ok = true;
                if (messageAdjustmentRemainingAttempts > 0){
                    ok = false;
                    var rect = div.getBoundingClientRect();
                    if (rect.bottom > ui.mainFrameWindow.innerHeight){
                        if (rect.width > 0.95 * ui.mainFrameWindow.innerWidth){
                            // let's try scrolling down
                            if ((rect.top - (highlightedElementBottom - highlightedElementTop) - 10) < ui.mainFrameWindow.innerHeight * 0.05){
                                // no more scrolling available
                                ok = true;
                            } else {
                                ui.mainFrameWindow.scrollBy(0, Math.round(ui.mainFrameWindow.innerHeight * 0.05));
                            }
                        } else {
                            // let's make div wider
                            currentMessageDivWidth = Math.min(ui.mainFrameWindow.innerWidth, (parseInt(div.style.width.replace('px', '')) + Math.round(ui.mainFrameWindow.innerWidth * 0.04)));
                        }
                    } else {
                        // that's ok 
                        ok = true;
                    }
                    if (ok){
                        div.style.opacity = '1';
                        var p = div.parentNode;
                        if (p) {
                            p.removeChild(div);
                        }
                        overlayWindow().document.getElementsByTagName('body')[0].appendChild(div);
                        messageAdjustmentRemainingAttempts = 0;
                    } else {
                        messageAdjustmentRemainingAttempts --;
                        scheduleOverlayRedraw(arrowToElements);
                        scheduleOverlayRedraw(highlightedElements);
                    }
                }
            },0);
        },
        /**
         * Starts Popup type UI
         * @function CartFiller.UI#popup
         * @param {Document} document Document where we are at the moment of injecting
         * @param {Window} window Window, that we are at the moment of injecting
         * @access public
         */
        popup: function(document, window){
            me.modules.dispatcher.init();
            this.mainFrameWindow = window.open(window.location.href, '_blank', 'resizable=1, height=1, width=1, scrollbars=1');
            this.closePopup = function(){
                this.mainFrameWindow.close();
            };
            this.focusMainFrameWindow = function(){
                this.mainFrameWindow.focus();
            };
            me.modules.dispatcher.registerLoadWatcher();

            var body = window.document.getElementsByTagName('body')[0];
            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentWorkerFrameSize === 'big') ? 'small' : 'big';
                }
                currentWorkerFrameSize = size;
                adjustFrameCoordinates();
                if (size === 'small') {
                    this.mainFrameWindow.focus();
                }
            };

            this.workerFrame = window.document.createElement('iframe');
            this.workerFrame.setAttribute('name', workerFrameName);
            this.workerFrame.style.position='fixed';
            this.workerFrame.style.top = '0px';
            this.workerFrame.style.height = '100%';
            this.workerFrame.style.zIndex = '100000';
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();

            this.chooseJobFrame = window.document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.position='fixed';
            this.chooseJobFrame.style.height = '0px';
            this.chooseJobFrame.style.top = '0px';
            this.chooseJobFrame.style.left = '0px';
            this.chooseJobFrame.style.width = '0px';
            this.chooseJobFrame.style.zIndex = '10000002';
            this.chooseJobFrame.style.background = 'white';
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];
            this.setSize('big');
            // Launch adjustFrameCoordinates
            setInterval(adjustFrameCoordinates, 2000);
        },
        /**
         * Starts Framed type UI
         * @function CartFiller.UI#framed
         * @param {Document} document Document where we are at the moment of injecting
         * @param {Window} window Window, that we are at the moment of injecting
         * @access public
         */
        framed: function(document, window) {
            isFramed = true;
            me.modules.dispatcher.init();
            var body = document.getElementsByTagName('body')[0];
            var mainFrameSrc = window.location.href;

            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            this.mainFrame = document.createElement('iframe');
            this.mainFrame.setAttribute('name', mainFrameName);
            this.mainFrame.style.height = '0px';
            this.mainFrame.style.position = 'fixed';
            this.mainFrame.style.left = '0px';
            this.mainFrame.style.top = '0px';
            this.mainFrame.style.borderWidth = '0px';

            this.workerFrame = document.createElement('iframe');
            this.workerFrame.setAttribute('name', workerFrameName);
            this.workerFrame.style.height = '0px';
            this.workerFrame.style.position = 'fixed';
            this.workerFrame.style.top = '0px';

            this.chooseJobFrame = document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.display = 'none';
            this.chooseJobFrame.style.height = '0px';
            this.chooseJobFrame.style.top = '0px';
            this.chooseJobFrame.style.left = '0px';
            this.chooseJobFrame.style.width = '0px';
            this.chooseJobFrame.style.position = 'fixed';
            this.chooseJobFrame.style.background = 'white';
            this.chooseJobFrame.style.zIndex = '10000002';
            body.appendChild(this.mainFrame);
            this.mainFrameWindow = window.frames[mainFrameName];

            me.modules.dispatcher.registerLoadWatcher();
            this.mainFrameWindow.location.href=mainFrameSrc;
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentWorkerFrameSize === 'big') ? 'small' : 'big';
                }
                currentWorkerFrameSize = size;
                adjustFrameCoordinates();
            };

            this.setSize('big');
            // Launch adjustFrameCoordinates
            setInterval(adjustFrameCoordinates, 2000);
        },
        /**
         * Refreshes worker page
         * @function CartFiller.UI#refreshPage
         * @access public
         */
        refreshPage: function() {
            this.mainFrameWindow.location.reload();
        },
        /**
         * Starts reporting mouse pointer - on each mousemove dispatcher 
         * will send worker frame a message with details about element
         * over which mouse is now
         * @function CartFiller.UI#startReportingMousePointer
         * @access public
         */
        startReportingMousePointer: function() {
            if (! reportMousePointer) {
                var div = document.createElement('div');
                div.style.height = window.innerHeight + 'px';
                div.style.width = window.innerWidth + 'px';
                div.zindex = 1000;
                div.style.position = 'absolute';
                div.style.left = '0px';
                div.style.top = '0px';
                div.style.backgroundColor = 'transparent';
                document.getElementsByTagName('body')[0].appendChild(div);
                reportMousePointer = div;
                var x,y;
                div.addEventListener('mousemove', function(event) {
                    x = event.clientX;
                    y = event.clientY;
                },false);
                div.addEventListener('click', function(event) {
                    document.getElementsByTagName('body')[0].removeChild(reportMousePointer);
                    reportMousePointer = false;
                    var el = me.modules.ui.mainFrameWindow.document.elementFromPoint(x,y);
                    var stack = [];
                    var prev;
                    var i, n;
                    while (el && el.nodeName !== 'BODY' && el.nodeName !== 'HTML' && el !== document) {
                        var attrs = [];
                        for (i = el.attributes.length - 1 ; i >= 0 ; i -- ) {
                            n = el.attributes[i].name;
                            if (n === 'id' || n === 'class') {
                                continue;
                            }
                            attrs.push({n: n, v: el.attributes[i].value});
                        }
                        for (prev = el, i = 0; prev; prev = prev.previousElementSibling) {
                            if (prev.nodeName === el.nodeName) {
                                i++;
                            }
                        }
                        stack.unshift({element: el.nodeName.toLowerCase(), attrs: attrs, classes: el.className.split(' ').filter(function(v){return v;}), id: el.id, index: i, text: String(el.innerText).length < 200 ? String(el.innerText) : ''});
                        el = el.parentNode;
                    }
                    me.modules.dispatcher.postMessageToWorker('mousePointer', {x: event.clientX, y: event.clientY, stack: stack});
                });
            }
        },
        /**
         * Sets and resets time to time handler for onbeforeunload
         * @function CartFiller.UI#preventPageReload
         * @access public
         */
        preventPageReload: function(){
            setInterval(function() {
                window.onbeforeunload=function() {
                    setTimeout(function(){
                        me.modules.ui.mainFrameWindow.location.reload();
                    },0);
                    return 'This will cause CartFiller to reload. Choose not to reload if you want just to refresh the main frame.';
                };
            },2000);
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
