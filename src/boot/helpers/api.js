/**
 * Represents the API interface used by worker. 
 * For worker example see {@link CartFiller.Api#registerWorker}
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
     * @param {Document} document undefined will be passed here, to prevent
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
     * @return {CartFiller.Api.WorkerTasks} 
     * @see CartFiller.SampleWorker~registerCallback
     */

    /**
     * Contains worker code, each property is a task, property name is task name, 
     * and property value is Array of type CartFiller.Api.WorkerTask
     * @class CartFiller.Api.WorkerTasks
     * @see CartFiller.Api.WorkerTask
     * @example
     *  {
     *      openHomepage: [
     *          'open homepage', function() { 
     *              window.location.href = '...'; api.onload() 
     *          }
     *      ],
     *      navigateToLogin: [
     *          'find navbar', function() { 
     *              var navbar = ... ;
     *              api.arrow(navbar).result(navbar.length?'':'no navbar');
     *          },
     *          'find login link', function(navbar) {
     *              var link = ...';
     *              api.arrow(link).result(link.length?'':'no login link');
     *          },
     *          api.click(),
     *      ]
     *  }
     */
    /**
     * @member {CartFiller.Api.WorkerTask} CartFiller.Api.WorkerTasks#openHomepage
     * This is just an example
     * @access public
     */
    /**
     * @member {CartFiller.Api.WorkerTask} CartFiller.Api.WorkerTasks#navigateToLogin
     * This is just an example
     * @access public
     */
    /** 
     * Contains worker code for particular worker task, as array
     * where even members are names of steps, and odd members
     * are either step functions or arrays of function + parameters object, see example below
     * where el is any value set using api.highlight or api.arrow in previous step
     * Array can contain subarrays itself, in this case of course number of non-array
     * elements should be even.
     * Each function must be of {CartFiller.Api.WorkerTask.workerStepFunction} type
     * @class CartFiller.Api.WorkerTask
     * @see {CartFiller.Api.WorkerTask.workerStepFunction}
     * @example
     *  [
     *      'step 1', function(el,env){ ... },
     *      'step 2', [function(el,env){.. env.params.theParam ...}, {theParam: 2}],
     *      [   
     *          'step 3', function() { ... },
     *          'step 4', function() { ... }
     *      ]
     *  ]
     */
    /**
     * Performs particular step of the task. Each callback must finally, 
     * immediately or asynchronously call either {@link CartFiller.Api#result}
     * or {@link CartFiller.Api#nop} function. You may skip parameters if you don't 
     * need them. 
     * Funny thing about these functions is that their parameter names are sometimes
     * meaningful and result in some magic. For example having any parameter named 
     * repeatN where N is integer (e.g. function(repeat10) {... or 
     * function(el, env, repeat15) { ... ) will result in repeating this step N times 
     * if it fails, until it succeeds, with interval of 1 second.
     * 
     * @callback CartFiller.Api.WorkerTask.workerStepFunction
     * @param {jQuery|HtmlElement|Array|undefined} highlightedElement Most recently 
     * highlighted element is passed back to this callback. Value is same as 
     * was used in most recent call to api.array() or api.highlight()
     * @param {CartFiller.Api.StepEnvironment} env Environment utility object
     * @param {undefined} repeatN Specifies to repeat call N times if it fails, so
     * parameter name should be e.g. repeat5 or repeat 10
     * @example
     * [
     *      'step name', function(el, env) { ... },
     *      'step name', function(el, repeat10) { ... },
     *      'step name', function(repeat5) { ... },
     *      'step name', function() { ... },
     *      'step name', function(el, env, repeat10) { ... }
     * ]
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
     * Used by {@link CartFiller.Api#each} when iterating through arrays
     * @callback CartFiller.Api.mapCallback
     * @param {integer} index
     * @param {Object} value
     * @param {Function} push Call this function to output value. Function has one parameter
     * -- the value for output, and can be called multiple times
     * @param {Function} unshift Call this function to put value to the beginning of output.
     * Function has one parameter -- the value for output, and can be called multiple times
     * @return {boolean} false means stop iteration
     */

    /**
     * Another callback used by {@link CartFiller.Api#each} -- called when iterating through
     * array items was not interrupted
     * @callback CartFiller.Api.eachOtherwiseCallback
     */

    /**
     * Another callback used by {@link CartFiller.Api#each} -- called when iterating through
     * array items was not interrupted
     * @callback CartFiller.Api.mapOtherwiseCallback
     * @param {Function} push Call this function to output value. Function has one parameter
     * -- the value for output, and can be called multiple times
     * @param {Function} unshift Call this function to put value to the beginning of output.
     * Function has one parameter -- the value for output, and can be called multiple times
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
    var cleanText = function(value) {
        return value.replace(/\s+/g, ' ').trim().toLowerCase();
    };
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
         * <textarea readonly cols="100" rows="7" onclick="this.select();">
         * (function(undefined) {
         *     cartFillerAPI().registerWorker(function(window, document, api, task, job, globals){
         *         return {
         *         };
         *     });
         * })();
         * </textarea>
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
            me.modules.dispatcher.registerWorker(cb);
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
         * Tells that next n steps should be skipped. After using this function you 
         * still have to call api.result, and it is important to call api.skipTask first 
         * and api.result then. 
         * @function CartFiller.Api#skipStep
         * @param {integer} n default = 1
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        skipStep: function(n) {
            if ('undefined' === typeof n) {
                n = 1;
            }
            me.modules.dispatcher.manageTaskFlow('skipStep,' + n);
            return this;
        },
        /**
         * Tells that this task should be repeated, so cartFiller will
         * proceed with first step of this task. After using this function
         * you still have to call api.result, and it is important to call
         * api.repeatTask first and api.result then.
         * @function CartFiller.Api#repeatTask
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        repeatTask: function() {
            me.modules.dispatcher.manageTaskFlow('repeatTask');
            return this;
        },
        /**
         * Tells that this step should be repeated. After using this function
         * you still have to call api.result, and it is important to call
         * api.repeatStep first and api.result then
         * @function CartFiller.Api#repeatStep
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        repeatStep: function() {
            me.modules.dispatcher.manageTaskFlow('repeatStep');
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
         * to [next step handler]{@link CartFiller.Api.WorkerTask.workerStepFunction}
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
         * @param {boolean} pre Preserve formatting (if set to true then message will be wrapped
         * with &lt;pre&gt; tag)
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        say: function(message, pre){
            me.modules.ui.say(message, pre);
            return this;
        },
        /**
         * Just another for-each implementation, jQuery style
         * @function CartFiller.Api#each
         * @param {Array|Object|HtmlCollection} array Array to iterate through
         * @param {CartFiller.Api.eachCallback} fn Called for each item, if result === false
         *          then iteration will be interrupted
         * @param {CartFillerApi.eachOtherwiseCallback} otherwise Called if iteration was
         * not interrupted
         * @return {CartFiller.Api} for chaining
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        each: function(array, fn, otherwise){
            var i;
            var breaked = false;
            var resultMeansWeShouldStop = function(r) {
                return r === false || r === 0 || r === me.modules.api;
            };
            if (
                array instanceof Array || 
                (
                    array.constructor && 
                    (
                        array.constructor.name === 'HTMLCollection' ||
                        String(array.constructor) === '[object HTMLCollection]' ||
                        array.constructor.name === 'NodeListConstructor' ||
                        String(array.constructor) === '[object NodeListConstructor]'
                    )
                ) ||
                String(array) === '[object NodeList]'
            ) {
                for (i = 0 ; i < array.length; i++ ) {
                    if (resultMeansWeShouldStop(fn(i, array[i]))) {
                        breaked = true;
                        break;
                    }
                }
            } else if (null !== array && 'object' === typeof array && 'string' === typeof array.jquery && undefined !== array.length && 'function' === typeof array.each) {
                array.each(function(i,el){
                    if (resultMeansWeShouldStop(fn(i,el))) {
                        breaked = true;
                        return false;
                    }
                });
            } else {
                for (i in array) {
                    if (array.hasOwnProperty(i)) {
                        if (resultMeansWeShouldStop(fn(i, array[i]))) {
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
         * Unusual combination of map and filter functions, can do both and more of that
         * can map one input entry to multiple output entries
         * @function CartFiller.Api#map
         * @param {Array|Object|HtmlCollection} 
         * @param {CartFiller.Api.mapCallback} 
         * @param {CartFillerApi.mapOtherwiseCallback} 
         * @return {Array} which has same map method as well
         * @see CartFiller.Api#each for parameter description
         */
        map: function(array, fn, otherwise) {
            var r = [];
            r.map = function(fn, otherwise) {
                return me.modules.api.map(r, fn, otherwise);
            };
            var p = function(v) { r.push(v); };
            var u = function(v) { r.unshift(v); };
            me.modules.api.each(array, function(i,v) {
                return fn(i, v, p, u);
            }, otherwise ? function() {
                return otherwise(p, u);
            } : undefined);
            return r;
        }, 
        /**
         * Compare two strings, if they match return '', if they mismatch return full
         * dump showing exact position where they mismatch. Usage: 
         * api.result(api.compare(task.value, el.text().trim()));
         * @function CartFiller.Api#compare
         * @param {string} expected
         * @param {string} value
         * @return {string} '' if values match, error description otherwise
         * @access public
         */
        compare: function(expected, value) {
            expected = String(expected);
            value = String(value);
            if (expected === value) {
                return '';
            }
            var r = '[';
            for (var i = 0; i < Math.max(expected.length, value.length); i++) {
                if (expected.substr(i, 1) === value.substr(i, 1)) {
                    r += expected.substr(i, 1);
                } else {
                    r += '] <<< expected: [' + expected.substr(i) + '], have: [' + value.substr(i) + ']';
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
            me.modules.dispatcher.registerWorkerSetTimeout(setTimeout(me.modules.api.applier(fn), timeout));
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
            me.modules.dispatcher.registerWorkerSetInterval(setInterval(me.modules.api.applier(fn), timeout));
        },
        /**
         * Helper function to construct workers - return array ['click', function(el){ el[0].click(); api.result; }]
         * @function CartFiller.Api#click
         * @param {Function} what to do after click, gets same parameters as normal
         *          worker functions////
         * @return {Array} ready for putting into step list
         * @access public
         */
        click: function(whatNext) {
            return [
                'click', function(el, env){
                    if (! el) {
                        // do nothing
                        return me.modules.api.result();
                    } else if ('object' === typeof el && 'string' === typeof el.jquery && undefined !== el.length) {
                        el[0].click();
                    } else if (el instanceof Array) {
                        el[0].click();
                    } else {
                        el.click();
                    }
                    if (undefined === whatNext || whatNext === me.modules.api.result) {
                        me.modules.api.result();
                    } else if (whatNext === me.modules.api.onload) {
                        me.modules.api.onload();
                    } else {
                        whatNext(el, env);
                    }
                }
            ];
        },
        /**
         * Opens relay window. If url points to the cartFiller distribution
         * @function CartFiller.Api#openRelay
         * @param {string} url
         * @param {boolean} noFocus Experimental, looks like it does not work
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        openRelay: function(url, noFocus) {
            me.modules.dispatcher.openRelayOnTheTail(url, noFocus);
            return this;
        },
        /**
         * Registers onload callback, that is called each time when new page
         * is loaded. Idea is that this function can verify if new page contains
         * critical application error, exception description, etc
         * @function CartFiller.Api#registerOnloadCallback
         * @param {string|CartFiller.Api.onloadEventCallback} aliasOrCallback alias or method if alias is not used
         * @param {CartFiller.Api.onloadEventCallback|undefined} callbackIfAliasIsUsed method if alias is used
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        registerOnloadCallback: function(aliasOrCallback, callbackIfAliasIsUsed){
            me.modules.dispatcher.registerEventCallback('onload', callbackIfAliasIsUsed ? aliasOrCallback : '', callbackIfAliasIsUsed ? callbackIfAliasIsUsed : aliasOrCallback);
            return this;
        },
        /**
         * Types a string into currently highlighted/arrowed element by issuing multiple keydown/keypress/keyup events. See example below.
         * @example
         *   'some steps of your worker', function() {
         *     .... 
         *     api.arrow(something) // something is the element we're going to
         *        .result();        // type into
         *   },
         *   api.type('name', function(input) { // this means - look for 
         *                                      // task.name or globals.name 
         *                                      // and put its value to 
         *                                      // "something" variable. After
         *                                      // type will be done our
         *                                      // callback will be called and 
         *                                      // "input" parameter will 
         *                                      // contain "something" element
         *
         *      api.result(                 // for example verify, that
         *          api.compare(            // various onkeypress handlers 
         *              task.name,          // did not change input value
         *              input.val().trim()
         *          )
         *      );
         * @function CartFiller.Api#type
         * @param {string|Function} value or callback to get value
         * @param {Function} whatNext callback after this task is 
         * @param {boolean} dontClear by default this function will clear input before typing
         * @param {ignoreErrors} set to true to ignore errors during attempts to set keyCode and charCode values
         * @return {Array} ready for putting into worker array
         * @access public
         */
        type: function(value, whatNext, dontClear, ignoreErrors) {
            var r = [
                'type key sequence',
                function(el, env) {
                    var finish = function() {
                        if (undefined === whatNext || whatNext === me.modules.api.result) {
                            me.modules.api.result();
                        } else if (whatNext === me.modules.api.onload) {
                            me.modules.api.onload();
                        } else {
                            whatNext(el, env);
                        }
                    };
                    var elementNode;
                    if (! el) {
                        // do nothing
                        return me.modules.api.result();
                    } else if ('object' === typeof el && 'string' === typeof el.jquery && undefined !== el.length) {
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
                        me.modules.api.result('Value to type [' + value + '] not found neither in the task properties nor in globals');
                        return;
                    }
                    text = String(text);
                    if (! dontClear) {
                        try {
                            elementNode.value = '';
                        } catch (e) {}
                    }
                    var document = elementNode.ownerDocument;
                    var fn = function(text, elementNode, whatNext) {
                        var char = text.substr(0, 1);
                        var charCode = char.charCodeAt(0);
                        var nextText = text.substr(1);
                        var charCodeGetter = {get : function() { return charCode; }};
                        var metaKeyGetter = {get : function() { return false; }};
                        var doKeyPress = true;
                        var dispatchEventResult;
                        for (var eventName in {keydown: 0, keypress: 0, input: 0, keyup: 0}) {
                            if ('keypress' === eventName && ! doKeyPress) {
                                continue;
                            }
                            if (! char.length && 'keypress' === eventName) {
                                continue;
                            }
                            var e = false;
                            var invalidEvent = false;
                            if (eventName === 'input') {
                                try {
                                    e = new elementNode.ownerDocument.defaultView.Event('input');
                                } catch (e) {}
                                if (! e) {
                                    try {
                                        e = elementNode.createEvent('UIEvent');
                                        e.initUIEvent('input');
                                    } catch (e) {}
                                }
                                if (! e) {
                                    continue;
                                }
                            } else {
                                e = elementNode.ownerDocument.createEvent('KeyboardEvent');
                                try { Object.defineProperty(e, 'keyCode', charCodeGetter); } catch (e) { invalidEvent = true; }
                                try { Object.defineProperty(e, 'charCode', charCodeGetter); } catch (e) { invalidEvent = true; }
                                try { Object.defineProperty(e, 'metaKey', metaKeyGetter); } catch (e) { invalidEvent = true; }
                                try { Object.defineProperty(e, 'which', charCodeGetter); } catch (e) { invalidEvent = true; }
                                if (e.initKeyboardEvent) {
                                    e.initKeyboardEvent(eventName, true, true, document.defaultView, false, false, false, false, charCode, charCode);
                                } else {
                                    e.initKeyEvent(eventName, true, true, document.defaultView, false, false, false, false, charCode, charCode);
                                }
                                if ((! ignoreErrors) && (e.keyCode !== charCode || e.charCode !== charCode)) {
                                    me.modules.api.result('could not set correct keyCode or charCode for ' + eventName + ': keyCode returns [' + e.keyCode + '] , charCode returns [' + e.charCode + '] instead of [' + charCode + ']');
                                    return false;
                                }
                                if ((! ignoreErrors) && e.metaKey) {
                                    me.modules.api.result('could not set metaKey to false');
                                    return false;
                                }
                            }
                            dispatchEventResult = true;
                            try {
                                dispatchEventResult = elementNode.dispatchEvent(e);
                            } catch (e) {}
                            if (! dispatchEventResult && 'keydown' === eventName) {
                                // do not send keypress event if keydown event returned false
                                doKeyPress = false;
                            }
                            if ((invalidEvent || dispatchEventResult) && 'keypress' === eventName) {
                                elementNode.value = elementNode.value + char;
                            }
                        }
                        if (0 === nextText.length) {
                            try {
                                var event = new elementNode.ownerDocument.defaultView.Event('change');
                                elementNode.dispatchEvent(event);
                            } catch (e) {}
                            me.modules.api.arrow(el);
                            finish();
                        } else {
                            me.modules.api.setTimeout(function() { fn(nextText, elementNode, whatNext); }, 0);
                        }
                    };
                    fn(text, elementNode, whatNext);
                }
            ];
            r[1].cartFillerParameterList = [value];
            return r;
        },
        /**
         * Wrapper function for asynchronous things - catches exceptions and fires negative result
         * @function CartFiller.Api#apply
         * @param {Function} fn
         * @param {mixed} arbitrary parameters will be passed to fn
         * @access public
         */
        apply: function(fn) {
            try {
                var args = [];
                for (var i = 1; i < arguments.length; i ++) {
                    args.push(arguments[i]);
                }
                fn.apply(me.modules.dispatcher.getWorker(), args);
            } catch (err) {
                me.modules.dispatcher.reportErrorResult(err);
                throw err;
            }
        },
        /**
         * Returns method, that, when called, will call api.apply against supplied fn
         * @function CartFiller.Api#applier
         * @param {Function} fn
         * @access public
         */
        applier: function(fn) {
            return function() {
                var args = [fn];
                for (var i = 0; i < arguments.length; i ++) {
                    args.push(arguments[i]);
                }
                me.modules.api.apply.apply(me.modules.api, args);
            };
        },
        /**
         * Define shared worker function - which can be used in other workers
         * @function CartFiller.Api#define
         * @param {string|Function} name either name of function or function itself, 
         * then name will be deduced from function code (it should be named function)
         * @param {Function} fn
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        define: function(name, fn){
            if (name instanceof Function) {
                var p = /^\s*function\s+([^(]+)\(/;
                if (! p.test(name.toString())) {
                    var err = 'invalid shared function definition, if name is not specified as first parameter of api.define() call, then function should be named';
                    alert(err);
                    throw new Error(err);
                }
                var m = p.exec(name.toString());
                fn = name;
                name = m[1];
            }
            me.modules.dispatcher.defineSharedWorkerFunction(name, fn);
            return this;
        },
        /** 
         * Defines time to sleep after this step in slow mode. Default is 1 second. 
         * Another way of specifying this time is via magic parameters like sleep250
         * @function CartFiller.Api#sleep
         * @param {integer|undefined} time (ms). If undefined, then sleep will be proportional
         * to length of message said by api.say()
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        sleep: function(time) {
            if ('undefined' === typeof time) {
                var messageToSay = me.modules.ui.getMessageToSay();
                if ('undefined' === messageToSay) {
                    time = 0;
                } else {
                    time = 1000 + Math.floor(String(messageToSay).length * 20); // 50 chars per second
                }
            }
            me.modules.dispatcher.setSleepAfterThisStep(time);
        },
        /**
         * ////
         */
        drill: function() {
            var originalPath = me.modules.dispatcher.getFrameToDrill();
            var path = originalPath.filter(function(){return 1;});
            var frame = me.modules.ui.mainFrameWindow;
            var level = path.length;
            while (path.length) {
                frame = frame.frames[path.shift()];
            }
            var result = arguments[level](frame);
            if (result) {
                // drill further
                for (var i = 0; i < frame.frames.length; i ++) {
                    if (result === frame.frames[i]){
                        var elements = frame.document.getElementsByTagName('iframe');
                        for (var j = 0 ; j < elements.length; j++){
                            if (elements[j].contentWindow === result) {
                                me.modules.ui.addElementToTrack('iframe', elements[j], true, [j]);
                            }
                        }
                        return me.modules.dispatcher.drill(i);
                    }
                }
            }
        },
        compareCleanText: function(a, b) {
            return cleanText(a) === cleanText(b);
        },
        suspendRequests: function(cb) {
            me.modules.dispatcher.onMessage_toggleEditorMode({enable: false, cb: cb});
        }
    });
}).call(this, document, window);
