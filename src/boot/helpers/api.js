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
        },
        /**
         * Types a string into currently highlighted/arrowed element by issuing multiple keydown/keypress/keyup events
         * @function CartFiller.Api#type
         * @param {string|Function} value or callback to get value
         * @param {Function} whatNext callback after this task is done
         * @access public
         */
        type: function(value, whatNext) {
            return [
                'type key sequence',
                function(el) {
                    var elementNode;
                    if ('object' === typeof el && 'string' === typeof el.jquery && undefined !== el.length) {
                        elementNode = el[0];
                    } else if (el instanceof Array) {
                        elementNode = el[0];
                    } else {
                        elementNode = el;
                    }
                    elementNode.focus();
                    var text;
                    if (value instanceof Function) {
                        text = value();
                    } else if (undefined !== me.modules.dispatcher.getWorkerTask()[value]) {
                        text = me.modules.dispatcher.getWorkerTask()[value];
                    } else if (undefined !== me.modules.dispatcher.getWorkerGlobals()[value]) {
                        text = me.modules.dispatcher.getWorkerGlobals()[value];
                    } else {
                        me.modules.api.result('Value ty type [' + value + '] not found neither in the task properties nor in globals');
                        return;
                    }
                    var document = me.modules.ui.mainFrameWindow.document;
                    me.modules.api.each(text.split(''), function(i,char) {
                        var charCode = char.charCodeAt(0);
                        var charCodeGetter = {get : function() { return charCode; }};
                        var metaKeyGetter = {get : function() { return false; }};
                        for (var eventName in {keydown: 0, keypress: 0, keyup: 0}) {
                            var e = document.createEvent('KeyboardEvent');
                            Object.defineProperty(e, 'keyCode', charCodeGetter);
                            Object.defineProperty(e, 'charCode', charCodeGetter);
                            Object.defineProperty(e, 'metaKey', metaKeyGetter);
                            Object.defineProperty(e, 'which', charCodeGetter);
                            if (e.initKeyboardEvent) {
                                e.initKeyboardEvent(eventName, true, true, document.defaultView, false, false, false, false, charCode, charCode);
                            } else {
                                e.initKeyEvent(eventName, true, true, document.defaultView, false, false, false, false, charCode, charCode);
                            }
                            if (e.keyCode !== charCode || e.charCode !== charCode) {
                                me.modules.api.result('could not set correct keyCode or charCode for ' + eventName + ': keyCode returns [' + e.keyCode + '] , charCode returns [' + e.charCode + '] instead of [' + charCode + ']');
                                return false;
                            }
                            if (e.metaKey) {
                                me.modules.api.result('could not set metaKey to false');
                                return false;
                            }
                            if (elementNode.dispatchEvent(e) && 'keypress' === eventName) {
                                elementNode.value = elementNode.value + char;
                            }
                        }
                    }, function() {
                        me.modules.api.arrow(el);
                        if (undefined === whatNext) {
                            me.modules.api.result('');
                        } else {
                            whatNext(el);
                        }
                    });
                }
            ];
        }
    });
}).call(this, document, window);
