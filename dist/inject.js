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
(function concatenatedInjectFunction(){(function(){
/* jshint ignore:end */

/**
 * @namespace CartFiller
 */
/**
 * @class CartFiller.Injector
 */
(function injectFunction(document, window, undefined){
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

    if (window.cartFillerAPI) {
        window.postMessage(
            'cartFillerMessage:' + 
            JSON.stringify({cmd: 'reinitialize'}),
            '*'
        );
        throw new Error('preventing duplicate launch on [' + window.location.href + ']');
    }
    
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
     * Used for launching from filesystem
     * @member {String} CartFiller.Configuration#localIndexHtml
     * @access public
     */
    config.localIndexHtml = '';
    /**
     * Used to launch slaves from filesystem
     * @member {String} CartFiller.Configuration#localInjectJs
     * @access public
     */
    config.localInjectJs = '';
    /**
     * Array of scripts (modules) of cartFiller, that were loaded
     * See {@link CartFiller.Loader}
     * @member CartFiller.Configuration#scripts
     * @access public
     */
    config.scripts = [];
    /**
     * Prevents multiple UI launches
     * @member CartFiller.Configuration#uiLaunched
     * @access public
     */
    config.uiLaunched = false;

    /**
     * Launches the {@link CartFiller.UI}
     * 
     * @function CartFiller.Configuration#launch
     * @param {boolean} ignoreOpener
     * @access public
     */
    config.launch = function(ignoreOpener){
        console.log('');
        if (document.getElementsByTagName('body')[0].getAttribute('data-old-cartfiller-version-detected')) {
            return; // no launch
        }
        if (((! ignoreOpener) && window.opener && window.opener !== window && String(config['data-type']) !== '2') || (window.parent && /\#?\/?launchSlaveInFrame$/.test(window.location.hash))) {
            this.modules.dispatcher.startSlaveMode();
        } else if ((! ignoreOpener) && String(config['data-type']) === '2' && config.localIndexHtml) {
            // this is 'serve from filesystem' in clean mode. There are two options: 
            // 1. there is already a service tab with local.html opened 
            // 2. there is no service tab and we should open one
            if (window.opener && window.opener !== window && window.opener.opener && window.opener.opener !== window.opener) {
                this.modules.dispatcher.startSlaveMode(window.opener.opener);
            } else {
                alert('to be done');
            }
        } else {
            if (! config.uiLaunched) {
                config.uiLaunched = true;
                if (String(config['data-type']) === '0') {
                    this.modules.ui.framed(document, window);
                } else if (String(config['data-type']) === '1'){
                    this.modules.ui.popup(document, window);
                } else if (String(config['data-type']) === '2'){
                    this.modules.ui.clean(document, window);
                } else {
                    alert('Type not specified, should be 0 for framed, 1 for popup');
                }
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

    config.log = function() {
        if (false) {
            try {
                var d = new Date();
                var e = new Error();
                var stack = (e.stack ? e.stack.replace(/[\r\n]/g, ' ') : '') || '';
                var srcPattern = /([a-zA-Z0-9.?]*:\d+:\d+)(.*)$/;
                var fnPattern = /at\s+([a-zA-Z0-9.]+)(.*)$/;
                var preSrc = srcPattern.exec(stack);
                var src = preSrc ? srcPattern.exec(preSrc[2])[1] : '';
                var preFn = fnPattern.exec(stack);
                var fn = preFn ? fnPattern.exec(preFn[2])[1] : '';
                console.log(('0' + d.getUTCMinutes()).substr(-2) + ':' + ('0' + d.getSeconds()).substr(-2) + '.' + ('000' + d.getMilliseconds()).substr(-3) + ' (' + window.document.domain + '): ' + src + ': ' + fn + ': ');
                for (var i = 0 ; i < arguments.length; i ++ ) {
                    try {
                        console.log(JSON.stringify(arguments[i], null, 4));
                    } catch (e) {
                        console.log('cant serialize argument ' + i);
                    }
                }
            } catch (e) {
                console.log('cant log');
                console.log(e);
            }
        }
    };
    
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
    config.gruntBuildTimeStamp='1521328125034';

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
        config['data-wfu'] = this.cartFillerEval[5];
        config.localInjectJs = this.cartFillerEval[6];
    }
    var cartFillerEvalForInjectFunction = [
        config.baseUrl,
        config['data-type'],
        config['data-choose-job'],
        config['data-debug'],
        config['data-worker'],
        config['data-wfu']
    ];
    if (concatenated) {
        config.injectFunction = '(' + concatenatedInjectFunction.toString() + ').call(' + JSON.stringify(this) + ');';
    } else {
        config.injectFunction = '(' + injectFunction.toString() + ').call({cartFillerEval: ' + JSON.stringify(cartFillerEvalForInjectFunction) + '}, document, window);';
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
     * @param {CartFiller.Api.LibFactory} lib A way to share snippets within worker or across several workers. 
     * You can assign values to lib straightaway lib.foo = ['find input', function() {}] and use them in another worker places
     * by calling lib('foo')
     * @return {CartFiller.Api.WorkerTasks} 
     * @see CartFiller.SampleWorker~registerCallback
     */


    /**
     * This function has three completely different ways of usage and scenarios of usage. 
     * <p>If you just want to share steps, you can do lib.foo = whatever, and then use it. It
     * will be shared across workers. But mind execution time - you never know order of workers to 
     * load. To feel safe use lib.foo = ['find foo', function() {...}...] to declare and then
     * lib('foo') to use when building steps.
     * <p>If you want to parametrize your factory - do 
     * lib('foo', 1, 2)(function(p1, p2) { p1 === 1 and p2 === 2 in the task where
     * you declare it}) to declare, and then lib('foo', 3, 4) in another task. </p>
     * <p>And finally you may need to share small snippets, that are called from within steps. 
     * These are declared using lib(function foo() {}) again right inside your task. Then use it just
     * as lib.foo().</p>
     * <p>See /samples/worker.js for examples, just search for 'lib' there.</p>
     * @callback CartFiller.Api.LibFactory
     * @param {Function|string}
     * @return {Function|Array}
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
     * Contains worker code for particular worker task, as array of steps or
     * subarrays (nested steps). All subarrays are just flattened. Each step
     * is 2 array items - a string (name or comment) and a function. Optionally
     * function can be replaced with an array of [function(){}, parameters]
     * Each function must be of {CartFiller.Api.WorkerTask.workerStepFunction} type
     * As you can see on the example - results of all previous steps are passed as parameters
     * in a reverse order. Usually you need to use only result of previous step, but
     * sometimes you need to find multiple elements on page and then do something 
     * with all of them. 
     * 
     * To return result of a step use api.return(...) function. Two UI methods: 
     * api.highlight(...) and api.arrow(...) imply api.return(). Note, that only one
     * returned result is kept in memory, so, if you do api.return(1).return(2), then 2
     * will be the result. 
     * 
     * @class CartFiller.Api.WorkerTask
     * @see {CartFiller.Api.WorkerTask.workerStepFunction}
     * @example
     *  [
     *      'step 1', function(){ ... },
     *      'step 2', [function(resultOfStep1){.. api.env.params.theParam ...}, {theParam: 2}],
     *      [   
     *          'step 3', function(resultOfStep2, resultOfStep1) { ... },
     *          'step 4', function(resultOfStep3, resultOfStep2, resultOfStep1) { ... }
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
     * function(el, repeat15) { ... ) will result in repeating this step N times 
     * if it fails, until it succeeds, with interval of 1 second.
     * 
     * @callback CartFiller.Api.WorkerTask.workerStepFunction
     * @param {mixed} result of previous step
     * @param {undefined} magic repeatN Specifies to repeat call N times if it fails, so
     * parameter name should be e.g. repeat5 or repeat 10. sleepN means sleep N ms
     * which only happens in slow mode.
     * @example
     * [
     *      'step name', function(el) { ... },
     *      'step name', function(el, repeat10) { ... },
     *      'step name', function(repeat5) { ... },
     *      'step name', function() { ... },
     *      'step name', function(el, repeat10) { ... }
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
        return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
    };
    var copyArguments = function(args) {
        var result = [];
        for (var i = 0; i < args.length ; i ++) {
            result.push(args[i]);
        }
        return result;
    };

    var getDocument = function() {
        var doc;
        try {
            doc = me.modules.ui.mainFrameWindow.document;
        } catch (e) {}
        return doc;
    };

    var selectorPattern = /^(([^\:\[.# ]+)|(\#[^\:\[.# ]+)|(\.[^\:\[.# ]+)|(\[([^\]"]|("[^"]*"))*\])|(\:([^\:\[.#" \()]|("[^"]*")|\([^)]+\))+))(.*)$/;
    var selectorStepPattern = /^((([^\:\[.# ]+)|(\#[^\:\[.# ]+)|(\.[^\:\[.# ]+)|(\[([^\]"]|("[^"]*"))*\])|(\:([^\:\[.#" \(]|("[^"]*")|\([^)]+\))+))+)(\s(.*))?$/;
    var parseAttributeSelector = function(expression) {
        var m = /^([^\^\$=]+)(\^=|\$=|=)"([^"]*)"$/.exec(expression);
        if (! m) {
            throw new Error('unable to parse attribute selector: [' + expression + ']');
        }
        return {attribute: m[1], equals: m[2], value: m[3]};
    };
    var Selector = function(elementList, description, self) {
        if (self === undefined) {
            throw new Error('self should not be undefined');
        }
        this.self = self || undefined;
        if (elementList) {
            this.length = elementList.length;
            this.description = description || ('[' + elementList.length + ']');
            for (var i = 0; i < elementList.length; i ++) {
                this[i] = elementList[i];
            }
        } else {
            this.length = 0;
            this.description = '';
        }
    };
    Selector.prototype = Object.create({});
    Selector.prototype.find = function(selector) {
        if ('object' === typeof selector) {
            if (selector.nodeName) {
                return new Selector([selector], this.description + ' [' + selector.nodeName + ']', [this, 'find', selector]);
            } 
            if (selector.hasOwnProperty('length')) {
                return new Selector(selector, undefined, [this, 'find', selector]);
            }
        }
        var match = selectorStepPattern.exec(me.modules.dispatcher.interpolateText(selector.trim()));
        if (! match) { 
            throw new Error('invalid selector: [' + selector + ']');
        }
        var firstSelector = match[1];
        var remainder = match[13];
        var firstResult = new Selector([], this.description + ' ' + firstSelector, null);
        this.each(function(i,e) {
            firstResult = firstResult.add(getElementsBySelector(e, firstSelector));
        });
        var finalResult;
        if (remainder) {
            finalResult = firstResult.find(remainder);
        } else {
            finalResult = firstResult;
        }
        return new Selector(finalResult, this.description + ' ' + selector, [this, 'find', selector]);
    };
    var getElementsBySelectorSecondStepFilter = function(el) {
        return function(criterion) {
            return getElementsBySelectorSecondStepMatch(el, criterion);
        };
    };
    Selector.prototype.css = function(property, value) {
        for (var i = 0; i < this.length; i ++) {
            this[i].style[property] = value;
        }
        return this;
    };
    Selector.prototype.closest = function(selector) {
        var parsed = parseSelector(selector);
        var description = this.description + ' closest(' + selector + ')';
        if (this.length) {
            var result = [];
            for (var i = 0; i < this.length; i ++) {
                for (var el = this[i].parentNode; el; el = el.parentNode) {
                    if (parsed.length === parsed.filter(getElementsBySelectorSecondStepFilter(el)).length) {
                        result.push(el);
                        break;
                    }
                }
            }
            return new Selector(result, description, [this, 'closest', selector]);
        }
        return new Selector([], description, [this, 'closest', selector]);
    };
    Selector.prototype.parent = function() {
        return new Selector(this.length ? [this[0].parentNode] : [], 'parent', [this, 'parent']);
    };
    Selector.prototype.text = function() {
        if (this.length) {
            return String(this[0].textContent);
        }
        return '';
    };
    Selector.prototype.is = function(selector) {
        if (this.length) {
            var parsed = parseSelector(selector);
            return parsed.length === parsed.filter(getElementsBySelectorSecondStepFilter(this[0])).length;
        }
    };
    Selector.prototype.index = function() {
        if (this.length) {
            var el = this[0].previousSibling;
            for (var i = 0; el; el = el.previousSibling) {
                i += el.nodeName === this[0].nodeName ? 1 : 0;
            }
            return i;
        }
    };
    Selector.prototype.val = function() {
        if (this.length) {
            if (arguments.length) {
                this[0].value = me.modules.dispatcher.interpolateText(arguments[0]);
                return this;
            } else {
                return this[0].value;
            }
        }
    };
    Selector.prototype.attr = function(name, value) {
        if (arguments.length === 1) {
            if (this.length) {
                return this[0].getAttribute(name);
            }
        } else if (arguments.length === 2) {
            for (var i = 0; i < this.length; i ++) {
                this[i].setAttribute(name, value);
            }
        } else {
            throw new Error('incorrect use of .attr - should have 1 or 2 arguments');
        }
        return this;
    };
    Selector.prototype.add = function(anotherSelectorOrElement) {
        var i;
        if ((anotherSelectorOrElement instanceof Selector) || (anotherSelectorOrElement instanceof Array) || ('string' === typeof anotherSelectorOrElement)) {
            var newElements = [];
            for (i = 0; i < this.length; i ++ ) {
                newElements.push(this[i]);
            }
            if ('string' === typeof anotherSelectorOrElement) {
                anotherSelectorOrElement = me.modules.api.find(anotherSelectorOrElement);
            }
            var description = this.description + ' + ' + ((anotherSelectorOrElement instanceof Selector) ? anotherSelectorOrElement.description : ('[' + anotherSelectorOrElement.length + ']'));
            for (i = 0; i < anotherSelectorOrElement.length; i ++) {
                if (-1 === newElements.indexOf(anotherSelectorOrElement[i])) {
                    newElements.push(anotherSelectorOrElement[i]);
                }
            }
            return new Selector(newElements, description, [this, 'add', anotherSelectorOrElement]);
        } else {
            for (i = this.length; i >= 0 ; i --) {
                if (this[i] === anotherSelectorOrElement) {
                    return this;
                }
            }
            this[this.length] = anotherSelectorOrElement;
            this.length ++;
        }
        return this;
    };
    Selector.prototype.filter = function(fn) {
        var result = [];
        for (var i = 0; i < this.length; i ++) {
            if (fn.apply(getDocument(), [i, this[i]])) {
                result.push(this[i]);
            }
        }
        return new Selector(result, this.description + ' filter(' + fn.toString() + ')', [this, 'filter', fn]);
    };
    Selector.prototype.each = function(fn) {
        for (var i = 0; i < this.length; i ++) {
            var result = fn(i, this[i]);
            if (result === false || result === me.modules.api) {
                break;
            }
        }
        return this;
    };
    Selector.prototype.map = function(fn) {
        var s = [];
        this.each(function(i, e) {
            var result = fn(i, me.modules.api.find(e));
            if (result instanceof Selector) {
                result.each(function(i, e) {
                    s.push(e);
                });
            } else if (result) {
                s.push(result);
            }
        });
        return me.modules.api.find(s);
    };
    Selector.prototype.arrow = function(all) {
        me.modules.api.arrow(this, all);
        return this;
    };
    Selector.prototype.exists = function(comment) {
        if (undefined === comment) {
            comment = 'element(s) not found: ' + this.description;
        }
        me.modules.api.arrow(this, true).result(this.length > 0 ? '' : comment);
        return this;
    };
    Selector.prototype.exactly = function(number, comment) {
        if (undefined === comment) {
            comment = 'element(s) not found: ' + this.description;
        }
        me.modules.api.arrow(this, true).result(this.length === parseInt(number) ? '' : comment);
        return this;
    };
    Selector.prototype.absent = function(comment) {
        if (undefined === comment) {
            comment = 'element(s) should not exist, but they are: ' + this.description;
        }
        me.modules.api.arrow(this, true).result(this.length > 0 ? comment : '');
        return this;
    };
    Selector.prototype.say = function(message, pre, nextButton) {
        me.modules.api.say(message, pre, nextButton);
        return this;
    };
    Selector.prototype.change = function() {
        if (this.length) {
            var event = document.createEvent('HTMLEvents');
            event.initEvent('change', false, true);
            this[0].dispatchEvent(event);
        }
    };
    Selector.prototype.next = function(selector) {
        if (selector !== undefined) {
            throw new Error('not implemented');
        }
        var description = this.description + ' next(' + selector + ')';
        if (this.length) {
            var next = this[0].nextElementSibling;
            if (! next) {
                return new Selector([], description, [this, 'next', selector]);
            }
            return new Selector([next], description, [this, 'next', selector]);
        } else {
            return new Selector([], description, [this, 'next', selector]);
        }
    };
    Selector.prototype.first = function() {
        return new Selector(this.length ? [this[0]] : [], this.description + ' first()', [this, 'first']);
    };
    Selector.prototype.last = function() {
        return new Selector(this.length ? [this[this.length - 1]] : [], this.description + ' last()', [this, 'last']);
    };
    Selector.prototype.nthOfType = function(n) {
        if ('string' === typeof n) {
            n = parseInt(me.modules.dispatcher.interpolateText(String(n)));
        }
        return this.filter(function(i,el){ 
            var c = 0; 
            for (var x = el.previousSibling; x; x = x.previousSibling) {
                c += x.nodeName === el.nodeName ? 1 : 0;
            } 
            return c === n;
        });
    };
    Selector.prototype.select = function() {
        if (this.length && this[0].nodeName === 'OPTION') {
            this.parent().val(this.attr('value')).change();
        } else {
            throw new Error('Invalid use of select() - selector should be not empty and OPTION should be first element');
        }
    };
    var getTextOfElement = function(el, noChildren) {
        if (! noChildren) {
            return el.textContent;
        } else {
            var pc = [];
            for (var i = 0; i < el.childNodes.length; i ++) {
                var node = el.childNodes[i];
                if (node.nodeType === 3) {
                    pc.push(node.textContent);
                }
            }
            return pc.join('');
        }
    };
    Selector.prototype.withText = function(text, ignoreCase, noChildren) {
        if (! (text instanceof RegExp)) {
            text = me.modules.dispatcher.interpolateText(text);
            if (ignoreCase) {
                text = text.toLowerCase();
            }
            return this.filter(function(i,el){
                return me.modules.api.compareCleanText(text, ignoreCase ? getTextOfElement(el, noChildren).toLowerCase() : getTextOfElement(el, noChildren));
            });
        } else {
            var flags = text.flags || '';
            if (ignoreCase && -1 === flags.indexOf('i')) {
                flags += 'i';
            }
            text = new RegExp(me.modules.dispatcher.interpolateText(text.source), flags);
            return this.filter(function(i,el){
                return text.test(getTextOfElement(el, noChildren).trim());
            });
        }
    };
    Selector.prototype.reevaluate = function() {
        var i;
        if (this.self) {
            var reevaluated;
            if ('function' === typeof this.self) {
                reevaluated = this.self();
            } else {
                if (this.self[0]) {
                    this.self[0].reevaluate();
                }
                if (this.self[1] === 'add') {
                    if (this.self[2] instanceof Selector) {
                        this.self[2].reevaluate();
                    }
                }
                reevaluated = this.self[0][this.self[1]].apply(this.self[0], this.self.slice(2));
            }
            for (i = 0; i < reevaluated.length; i ++) {
                this[i] = reevaluated[i];
            }
            for (i = reevaluated.length ; i < this.length ; i ++ ) {
                delete this[i];
            }
            this.length = reevaluated.length;
        }
        return this;
    };
    ['result', 'nop', 'skipStep', 'skipTask', 'repeatStep', 'repeatTask', 'repeatJob', 'skipJob', 'stop'].filter(function(name) {
        Selector.prototype[name] = function(){
            me.modules.api[name].apply(me.modules.api, arguments);
            return this;
        };
    });
    var parseSelector = function(selector) {
        var result = [];
        while (selector.length) {
            var match = selectorPattern.exec(selector);
            if (! match) {
                throw new Error('invalid selector: [' + selector + ']');
            }
            if (match[2]) {
                result.push(['nodeName', match[2]]);
            } else if (match[3]) {
                result.push(['id', match[3].substr(1)]);
            } else if (match[4]) {
                result.push(['class', match[4].substr(1)]);
            } else if (match[5]) {
                result.push(['attribute', parseAttributeSelector(match[5].substr(1, match[5].length - 2))]);
            } else if (match[8]) {
                var notMatch = /^:not\((.*)\)$/.exec(match[8]);
                if (notMatch) {
                    result.push(['not', parseSelector(notMatch[1])]);
                } else {
                    result.push(['modifier', match[8].substr(1)]);
                }
            } else {
                throw new Error('bad selector: [' + selector + ']');
            }
            selector = match[11];
        }
        return result;
    };
    var getElementsBySelectorFirstStep = function(root, criterion) {
        switch (criterion[0]) {
            case 'nodeName': 
                return new Selector(root.getElementsByTagName(criterion[1]), undefined, null);
            case 'id': 
                if ('#document' === root.nodeName) {
                    var e = root.getElementById(criterion[1]);
                    return new Selector(e ? [e] : [], undefined, null);
                } 
                return getElementsBySelectorSecondStep(new Selector(root.getElementsByTagName('*'), undefined, null), criterion);
            case 'class': 
                return new Selector(root.getElementsByClassName(criterion[1]), undefined, null);
            case 'attribute': 
            case 'modifier': 
            case 'not':
                return getElementsBySelectorSecondStep(new Selector(root.getElementsByTagName('*'), undefined, null), criterion);
            default: 
                throw new Error('unknown or invalid criterion type for first step: [' + criterion[0] + ']');
        }
    };
    var isVisible = function(element, recursive) {
        if (! element) {
            return true;
        }
        if (! recursive && 'function' === typeof element.getBoundingClientRect) {
            var rect = element.getBoundingClientRect();
            if (! (rect.width > 0 && rect.height > 0)) {
                return false;
            }
        }
        return (! element.style) || (element.style.display !== 'none' && element.style.visibility !== 'hidden' && (element.style.opacity === '' || parseFloat(element.style.opacity) > 0) && isVisible(element.parentNode, true));
    };
    var coundLeftSiblingElements = function(element) {
        for (var i = 0; i < element.parentNode.childElementCount; i ++) {
            if (element === element.parentNode.children[i]) {
                return i + 1;
            }
        }
        throw new Error('something went wrong, element is not a child of its parent???');
    };
    var isChecked = function(element) {
        switch (element.nodeName) {
            case 'OPTION': return element.selected;
            case 'INPUT': 
                switch (element.getAttribute('type').toLowerCase()) {
                    case 'checkbox':
                    case 'radio':
                        return element.checked;
                }
                break;
        }
    };

    var matchModifier = function(modifier, element) {
        var match;
        if (modifier === 'visible') {
            return isVisible(element);
        } else if (modifier === 'checked') {
            return isChecked(element);
        } else if (match = /^contains\(\"(.*)"\)$/.exec(modifier)) {
            return -1 !== element.textContent.toLowerCase().indexOf(match[1].toLowerCase());
        } else if (match = /^nth-child\((\d+)\)$/.exec(modifier)) {
            return parseInt(match[1]) === coundLeftSiblingElements(element);
        } else {
            throw new Error('unknown modifier: [' + modifier + ']');
        }
    };
    var getElementsBySelectorSecondStepMatch = function(element, criterion) {
        switch (criterion[0]) {
            case 'id': return element.id === criterion[1];
            case 'nodeName': return element.nodeName.toLowerCase() === criterion[1].toLowerCase();
            case 'class': return (' ' + element.className + ' ').indexOf(' ' + criterion[1] + ' ') !== -1;
            case 'attribute': 
                var attributeValue = String(element.getAttribute(criterion[1].attribute));
                switch (criterion[1].equals) {
                    case '=': return attributeValue === criterion[1].value;
                    case '^=': return 0 === attributeValue.indexOf(criterion[1].value);
                    case '$=': return attributeValue.substr(attributeValue.length - criterion[1].value.length) === criterion[1].value;
                    default: throw new Error('unknown equality expression: [' + criterion[1].equals + ']');
                }
                break;
            case 'modifier': return matchModifier(criterion[1], element);
            case 'not': 
                return 0 === criterion[1].filter(function(notCriterion) { 
                    return getElementsBySelectorSecondStepMatch(element, notCriterion);
                }).length;
            default: throw new Error('unknown criterion type: [' + criterion[0] + ']');
        }
    };
    var getElementsBySelectorSecondStep = function(selector, criterion) {
        return selector.filter(function(index, element) {
            return getElementsBySelectorSecondStepMatch(element, criterion);
        });
    };
    var getElementsBySelector = function(root, selector) {
        var parsed = parseSelector(selector);
        if (parsed.length === 0) {
            throw new Error('wrong selector: [' + selector + ']');
        }
        var result = getElementsBySelectorFirstStep(root, parsed.shift());
        parsed.filter(function(criterion) {
            result = getElementsBySelectorSecondStep(result, criterion);
        });
        return result;
    };
    var currentDrillDepth = 0;

    var getAbsolutePosition = function(el, recursive) {
        var rect = el.getBoundingClientRect();
        var pos = {x: rect.left + recursive ? 0 : Math.floor(rect.width / 2), y: rect.top + recursive ? 0 : Math.floor(rect.height / 2)};
        // it is likely possible to do this, because in PhantomJS we normally have
        // cross origin security turned off
        if (el.ownerDocument.defaultView !== el.ownerDocument.defaultView.parent) {
            var frames = el.ownerDocument.defaultView.parent.document.getElementsByTagName('iframe');
            for (var i = 0; i < frames.length ; i ++) {
                if (frames[i].contentWindow === el.ownerDocument.defaultView) {
                    var shift = getAbsolutePosition(frames[i], true);
                    pos.x += shift.x;
                    pos.y += shift.y;
                }
            }
        }
        return pos;
    };

    var triggerMouseEvent = function(el, eventType) {
        var event;
        if (0 /* not yet, seems not reliable enough */ && window.callPhantom) {
            var pos = getAbsolutePosition(el);
            window.callPhantom({mouseEvent: eventType, pos: pos});
        } else if (el.ownerDocument.createEvent) {
            event = el.ownerDocument.createEvent('MouseEvents');
            if (event.initMouseEvent) {
                event.initMouseEvent(eventType, true, true, el.ownerDocument.defaultView, 0, 1, 1, 1, 1, false, false, false, false, 0, null);
            } else if (event.initEvent) {
                event.initEvent(eventType, true, true);
            } else {
                throw new Error('cant init MouseEvent');
            }
            el.dispatchEvent(event);
        } else if (el.ownerDocument && el.ownerDocument.defaultView && el.ownerDocument.defaultView.MouseEvent) {
            event = new el.ownerDocument.defaultView.MouseEvent(eventType);
            el.dispatchEvent(event);
        } 
    };

    var simulateClick = function(el) {
        try {
            triggerMouseEvent (el, 'mouseover');
        } catch (e) {}
        try {
            triggerMouseEvent (el, 'mousedown');
        } catch (e) {}
        try {
            triggerMouseEvent (el, 'mouseup');
        } catch (e) {}
        try {
            triggerMouseEvent (el, 'click');
        } catch (e) {}
    };

    var createInputEvent = function(elementNode) {
        try {
            return new elementNode.ownerDocument.defaultView.InputEvent('input', {bubbles: true});
        } catch (e) {}
        try {
            return new elementNode.ownerDocument.defaultView.Event('input', {bubbles: true});
        } catch (e) {}
        try {
            var event = elementNode.createEvent('UIEvent');
            event.initUIEvent('input');
            return event;
        } catch (e) {}
    };

    me.scripts.push({
        /**
         * @property {CartFiller.Api.StepEnvironment} CartFiller.Api#env
         */
        env: {},
        debug: false,
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
         * @param {integer} number defaults to 1
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        skipTask: function(number) {
            number = number || 1;
            me.modules.dispatcher.manageTaskFlow('skipTask,' + number);
            return this;
        },
        switchTestSuite: function(params) {
            me.modules.dispatcher.manageTaskFlow({switchTestSuite: params});
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
        stop: function() {
            me.modules.dispatcher.manageTaskFlow('stop');
            return this;
        },
        closeCartFiller: function() {
            me.modules.ui.closeCartFiller();
            return this;
        },
        /**
         * Tells, that this job should be skipped altogether
         * @function CartFiller.Api#skipJob
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        skipJob: function() {
            me.modules.dispatcher.manageTaskFlow('skipJob');
            return this;
        },
        /**
         * Tells that this task should be repeated, so cartFiller will
         * proceed with first step of this task. After using this function
         * you still have to call api.result, and it is important to call
         * api.repeatTask first and api.result then.
         * @function CartFiller.Api#repeatTask
         * @param {integer} number defaults to 1
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        repeatTask: function(number) {
            number = number || 1;
            me.modules.dispatcher.manageTaskFlow('repeatTask,' + number);
            return this;
        },
        /**
         * Tells to repeat whole job from start
         * @function CartFiller.Api#repeatJob
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        repeatJob: function() {
            me.modules.dispatcher.manageTaskFlow('repeatJob');
            return this;
        },
        /**
         * Tells that this step should be repeated. After using this function
         * you still have to call api.result, and it is important to call
         * api.repeatStep first and api.result then
         * @function CartFiller.Api#repeatStep
         * @param {integer} n default = 1 means repeat current step
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        repeatStep: function(n) {
            if (undefined === n) {
                n = 1;
            }
            me.modules.dispatcher.manageTaskFlow('repeatStep,' + String(n));
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
         * @param {boolean} recoverPreviousStepState Normally you should make page navigation
         *          or reload and then call api.onload in the same step. But if you did not -
         *          you can still call api.onload in next step, but set this parameter
         *          to true
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        onload: function(cb, recoverPreviousStepState){
            if (undefined === cb) {
                cb = function() {
                    me.modules.api.result();
                };
            }
            me.modules.dispatcher.registerWorkerOnloadCallback(cb, recoverPreviousStepState);
            return this;
        },
        /**
         * Waits for particular event, calling checkCallback time to time
         * to check whether event happened or not, and calling resultCallback 
         * once after event or timeout has happened
         * @function CartFiller.Api#waitFor
         * @param {CartFiller.Api.waitForCheckCallback} checkCallback
         * @param {CartFiller.Api.waitForResultCallback|String|undefined} resultCallback can be a callback or 
         * string or nothing.
         * If string is specified, then generic result callback will be there, submitting
         * string as error result. If nothing is specified, then just "timeout" will be submitted
         * in case of failure
         * @param {integer} timeout Measured in milliseconds. Default value
         * (if timeout is undefined) 20000 ms
         * @param {integer} period Poll period, measured in milliseconds, 
         * @param {Array} args Arguments to be passed to checkCallback and resultCalback
         * default value (if undefined) is 200 ms
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        waitFor: function(checkCallback, resultCallback, timeout, period, args){
            args = args || [];
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
                    result = checkCallback.apply(getDocument(), args);
                } catch (e) {
                    me.modules.dispatcher.reportErrorResult(e);
                    return;
                }
                if (false === me.modules.dispatcher.getWorkerCurrentStepIndex()){
                    return;
                } 
                if (result) {
                    try {
                        args.unshift(result);
                        resultCallback.apply(getDocument(), args);
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
                            args.unshift(false);
                            resultCallback.apply(getDocument(), args);
                        } catch (e) {
                            me.modules.dispatcher.reportErrorResult(e);
                            return;
                        }
                    }
                }
            };
            me.modules.api.setTimeout(fn, 0);
            return this;
        },
        /**
         * Factory for api.waitFor
         * @function CartFiller.Api#waiter
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        waiter: function(checkCallback, resultCallback, timeout, period){
            return function() {
                me.modules.api.waitFor(checkCallback, resultCallback, timeout, period, copyArguments(arguments));
            };
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
         * @param {boolean|undefined} noScroll set to true to avoid scrolling to this element
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        highlight: function(element, allElements, noScroll){
            try {
                me.modules.ui.highlight(element, allElements, noScroll);
                me.modules.dispatcher.setReturnedValueOfStep(element, true);
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
        arrow: function(element, allElements, noScroll){
            try {
                me.modules.ui.arrowTo(element, allElements, noScroll);
                me.modules.dispatcher.setReturnedValueOfStep(element, true);
            } catch (e){}
            return this;
        },
        /**
         * remember result. 
         * @function CartFiller.API#return
         * @param {mixed} value
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        return: function(value) {
            me.modules.dispatcher.setReturnedValueOfStep(value, false);
            return this;
        },
        /**
         * Displays comment message over the overlay in the main frame
         * @function CartFiller.Api#say
         * @param {String} message
         * @param {boolean} pre Preserve formatting (if set to true then message will be wrapped
         * with &lt;pre&gt; tag)
         * @param {String} nextButton If used, then button with this name will appear below the message
         * In this case you should not do api.result() as this will be done when user clicks this button.
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        say: function(message, pre, nextButton){
            me.modules.ui.say((message === undefined || message === null) ? message : String(message), pre, nextButton);
            return this;
        },
        /**
         * Simple way to interact with user
         * @function CartFiller.Api#modal
         * @param {String} html
         * @param {Function} callback being called when modal is constructed from html, so, that
         * you can put some data and set event handlers. Callback will receive wrapper div html
         * element as a parameter
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        modal: function(html, callback) {
            me.modules.ui.say(html, undefined, undefined, true, callback);
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
                    if (resultMeansWeShouldStop(fn.call(getDocument(), i, array[i]))) {
                        breaked = true;
                        break;
                    }
                }
            } else if (null !== array && 'object' === typeof array && 'string' === typeof array.jquery && undefined !== array.length && 'function' === typeof array.each) {
                array.each(function(i,el){
                    if (resultMeansWeShouldStop(fn.call(getDocument(), i,el))) {
                        breaked = true;
                        return false;
                    }
                });
            } else {
                for (i in array) {
                    if (array.hasOwnProperty(i)) {
                        if (resultMeansWeShouldStop(fn.call(getDocument(), i, array[i]))) {
                            breaked = true;
                            break;
                        }
                    }
                }
            }
            if (! breaked && otherwise instanceof Function) {
                otherwise.call(getDocument());
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
                return fn.apply(r, [i, v, p, u]);
            }, otherwise ? function() {
                return otherwise.apply(r, [p, u]);
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
        compare: function(expected, value, comment) {
            expected = String(expected);
            value = String(value);
            if (expected === value) {
                return '';
            }
            var r = (comment ? (comment + ': ') : '') + '[';
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
         * Will be deprecated, use api.clicker()
         * 
         * @function CartFiller.Api#click
         */
        click: function(whatNext) {
            return me.modules.api.clicker(whatNext);
        },
        /**
         * Helper function to construct workers - return array ['click', function(el){ el[0].click(); api.result; }]
         * @function CartFiller.Api#clicker
         * @param {Function} what to do after click, gets same parameters as normal
         *          worker functions////
         * @param {Function} what to do before click, useful to replace window.prompt and window.confirm
         * @return {Array} ready for putting into step list
         * @access public
         */
        clicker: function(whatNext, whatBefore) {
            return [
                'click', function(el){
                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                        debugger; // jshint ignore:line
                    }
                    if (whatBefore) {
                        whatBefore.apply(getDocument(), arguments);
                    }
                    if (! el) {
                        // do nothing
                        return me.modules.api.result();
                    } else if ('object' === typeof el && 'string' === typeof el.jquery && undefined !== el.length) {
                        simulateClick(el[0]);
                    } else if ((el instanceof Array) || (el instanceof Selector)) {
                        simulateClick(el[0]);
                    } else {
                        simulateClick(el);
                    }
                    // if result was already submitted (as a handler of click) - then do not call whatNext
                    if (me.modules.dispatcher.getWorkerCurrentStepIndex() !== false) {
                        if (undefined === whatNext || whatNext === me.modules.api.result) {
                            me.modules.api.result();
                        } else if (whatNext === me.modules.api.onload) {
                            me.modules.api.onload();
                        } else {
                            whatNext.apply(getDocument(), arguments);
                        }
                    }
                }
            ];
        },
        confirmer: function(cb, shouldAgree, expectedMessageOrRegExp) {
            return ['confirm', function() {
                me.modules.api.confirm('function' === typeof cb ? cb : cb[1], shouldAgree, expectedMessageOrRegExp, arguments);
            }];
        },
        confirm: function(cb, shouldAgree, expectedMessageOrRegExp, args) {
            // to be done properly
            if(me.modules.api.debug && me.modules.api.debug.stop) {
                debugger; // jshint ignore:line
            }
            var oldConfirm = me.modules.ui.mainFrameWindow.confirm;
            var confirmCalled = false;
            var match = false;
            var confirmMessage; 
            me.modules.ui.mainFrameWindow.confirm = function(msg) {
                confirmCalled = true;
                confirmMessage = msg;
                if ('undefined' !== typeof expectedMessageOrRegExp) {
                    if ('object' === typeof expectedMessageOrRegExp) {
                        match = expectedMessageOrRegExp.test(msg);
                    } else {
                        match = String(expectedMessageOrRegExp) === String(msg);
                    }
                } else {
                    match = true;
                }
                me.modules.ui.mainFrameWindow.confirm = oldConfirm;
                return (shouldAgree || ('undefined' === typeof shouldAgree));
            };
            cb.apply(getDocument(), args);
        },
        /**
         * Opens relay window. If url points to the cartFiller distribution
         * @function CartFiller.Api#openRelay
         * @param {string} url
         * @param {boolean} noFocus if set to true, it will make an 
         * alert on main window when slave will be registered to 
         * bring focus back to the dashboard
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
         * Will be deprecated, use typer
         * 
         * @function CartFiller.Api#type
         */
        type: function(value, whatNext, dontClear, failOnErrors) {
            return me.modules.api.typer(value, whatNext, dontClear, failOnErrors);
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
         * @function CartFiller.Api#typer
         * @param {string|Function} value or callback to get value
         * @param {Function} whatNext callback after this task is 
         * @param {boolean} dontClear by default this function will clear input before typing
         * @param {boolean} failOnErrors set to true to fail on errors during attempts to set keyCode and charCode values
         * @param {boolean} paste set to true not to simulate each separate key press, but
         * simulate Paste action
         * @return {Array} ready for putting into worker array
         * @access public
         */
        typer: function(value, whatNext, dontClear, failOnErrors, paste) {
            var r = [
                paste ? 'paste value' : 'type key sequence',
                function(el) {
                    var args = arguments;
                    if (me.modules.api.debug && me.modules.api.debug.stop) {
                        debugger; // jshint ignore:line
                    }
                    var finish = function() {
                        if (undefined === whatNext || whatNext === me.modules.api.result) {
                            me.modules.api.result();
                        } else if (whatNext === me.modules.api.onload) {
                            me.modules.api.onload();
                        } else {
                            whatNext.apply(getDocument(), args);
                        }
                    };
                    var elementNode;
                    if (! el) {
                        // do nothing
                        return me.modules.api.result();
                    } else if ('object' === typeof el && 'string' === typeof el.jquery && undefined !== el.length) {
                        elementNode = el[0];
                    } else if ((el instanceof Array) || (el instanceof Selector)) {
                        elementNode = el[0];
                    } else {
                        elementNode = el;
                    }
                    elementNode.focus();
                    var text;
                    if (value instanceof Function) {
                        text = value.apply(getDocument(), args);
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
                        var char = paste ? 'v' : text.substr(0, 1);
                        var charCode = char.charCodeAt(0);
                        if (charCode === 13) {
                            charCode = 0;
                        }
                        var keyCode = char.charCodeAt(0);
                        var nextText = paste ? '' : text.substr(1);
                        var charCodeGetter = {get : function() { return charCode; }};
                        var keyCodeGetter = {get : function() { return keyCode; }};
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
                                e = createInputEvent(elementNode);
                                if (! e) {
                                    continue;
                                }
                            } else {
                                if (window.callPhantom) {
                                    window.callPhantom({
                                        keyboardEvent: eventName,
                                        char: char
                                    });
                                    continue;
                                }
                                e = elementNode.ownerDocument.createEvent('KeyboardEvent');
                                try { Object.defineProperty(e, 'keyCode', keyCodeGetter); } catch (e) { invalidEvent = true; }
                                try { Object.defineProperty(e, 'charCode', charCodeGetter); } catch (e) { invalidEvent = true; }
                                try { Object.defineProperty(e, 'metaKey', metaKeyGetter); } catch (e) { invalidEvent = true; }
                                try { Object.defineProperty(e, 'which', charCodeGetter); } catch (e) { invalidEvent = true; }
                                if (e.initKeyboardEvent) {
                                    e.initKeyboardEvent(eventName, true, true, document.defaultView, false, false, false, false, charCode, keyCode);
                                } else {
                                    e.initKeyEvent(eventName, true, true, document.defaultView, false, false, false, false, keyCode, charCode);
                                }
                                if ((failOnErrors) && (e.keyCode !== keyCode || e.charCode !== charCode)) {
                                    me.modules.api.result('could not set correct keyCode or charCode for ' + eventName + ': keyCode returns [' + e.keyCode + '] instead of [' + keyCode + '], charCode returns [' + e.charCode + '] instead of [' + charCode + ']');
                                    return false;
                                }
                                if ((failOnErrors) && e.metaKey) {
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
                                var newValue = elementNode.value + (paste ? text : char);
                                var descriptorOk = false;
                                try {
                                    if (Object.getOwnPropertyDescriptor && 'function' === typeof Object.getOwnPropertyDescriptor) {
                                        var descriptor = Object.getOwnPropertyDescriptor(elementNode.constructor.prototype, 'value');
                                        if (descriptor && descriptor.set && 'function' === typeof descriptor.set) {
                                            descriptor.set.apply(elementNode, [newValue]);
                                            descriptorOk = true;
                                        }
                                    }
                                } catch (e) {
                                }
                                if (! descriptorOk) {
                                    elementNode.value = newValue;
                                }
                            }
                        }
                        if (0 === nextText.length) {
                            try {
                                var event = new elementNode.ownerDocument.defaultView.Event('change', {bubbles: true});
                                elementNode.dispatchEvent(event);
                            } catch (e) {}
                            try {
                                var inputEvent = createInputEvent(elementNode);
                                if (inputEvent) {
                                    elementNode.dispatchEvent(inputEvent);
                                }
                            } catch (e) {}
                            try {
                                if ('function' === typeof elementNode.ownerDocument.defaultView.jQuery) {
                                    elementNode.ownerDocument.defaultView.jQuery(elementNode).change();
                                }
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
            var params = {};
            [value, whatNext].filter(function(v) {
                if ('function' === typeof v) {
                    me.modules.dispatcher.discoverTaskParameters(v, params);
                } else if (undefined !== v) {
                    params[v] = true;
                }
            });
            r[1].cartFillerParameterList = [];
            for (var i in params) {
                r[1].cartFillerParameterList.push(i);
            }
            return r;
        },
        /**
         * Sames as typer but pastes in one step
         * @function CartFiller.Api#paster
         * @param {string|Function} value see api.typer()
         * @param {Function} whatNext see api.typer()
         * @param {boolean} dontClear see api.typer()
         * @param {boolean} failOnErrors see api.typer()
         * @return {Array} ready for putting into worker array
         * @access public
         */
        paster: function(value, whatNext, dontClear, failOnErrors) {
            return this.typer(value, whatNext, dontClear, failOnErrors, true);
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
            return this;
        },
        window: function() {
            var window = me.modules.ui.getMainFrameWindow();
            me.modules.dispatcher.getFrameToDrill().filter(function(pathStep) {
                window = window.frames[pathStep];
            });
            return window;
        },
        document: function() {
            return me.modules.ui.getMainFrameWindowDocument(this.window());
        },
        /**
         * @function CartFiller.Api#drill
         * @param {Function} cb This function should return iframe's contentWindow object if needed to 
         * drill further, otherwise do its job and return nothing. This function will get
         * frame's window as first parameter
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        drill: function(chooseFrameFunction, insideFrameFunction) {
            var frame = this.window();
            var level = me.modules.dispatcher.getFrameToDrill().length;
            currentDrillDepth ++;
            try {
                if (level >= currentDrillDepth) {
                    insideFrameFunction.apply(frame.document);
                } else {
                    var choosenFrame = chooseFrameFunction.apply(frame.document);
                    if (! choosenFrame) {
                        throw new Error('frame was not selected for drill function');
                    }
                    // drill further
                    for (var i = 0; i < frame.frames.length; i ++) {
                        if (choosenFrame === frame.frames[i]){
                            var elements = frame.document.getElementsByTagName('iframe');
                            for (var j = 0 ; j < elements.length; j++){
                                if (elements[j].contentWindow === choosenFrame) {
                                    me.log('adding iframe to track');
                                    me.modules.ui.addElementToTrack('iframe', elements[j], true, [j]);
                                }
                            }
                            return me.modules.dispatcher.drill(i);
                        }
                    }
                }
            } catch (e) {
                currentDrillDepth --;
                throw e;
            }
            currentDrillDepth --;
            return this;
        },
        compareCleanText: function(a, b) {
            return cleanText(a) === cleanText(b);
        },
        containsCleanText: function(a, b) {
            return -1 !== cleanText(a).indexOf(cleanText(b));
        },
        suspendRequests: function(cb) {
            me.modules.dispatcher.onMessage_toggleEditorMode({enable: false, cb: cb});
        },
        /**
         * @function CartFiller.Api#setAdditionalWindows
         * @param {Object[]} descriptors Array of window descriptors, each item is an object
         * having two keys: 'url' and 'slave', where 'slave' points to cartFiller distribution
         * that will act as slave. 
         * This function will call api.result as soon as all windows will be loaded, slaves
         * initialized, etc
         * This only works in framed mode
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        setAdditionalWindows: function(descriptors) {
            descriptors = descriptors || [];
            me.modules.dispatcher.setAdditionalWindows(descriptors);
            return this;
        },
        /**
         * @function CartFiller.Api#switchToWindow
         * @param {integer} index Window to be set as active (0-based, 0 is default window, 1 is
         * first additional window)
         * @return {CartFiller.Api} for chaining
         * @access public
         */
        switchToWindow: function(index) {
            me.modules.dispatcher.switchToWindow(index);
            return this;
        },
        find: function(selector, alternativeDocument) {
            if (undefined === selector || '' === selector) {
                return new Selector([], undefined, function() { return []; });
            } else {
                return new Selector([alternativeDocument || this.document()], undefined, function(){ return [alternativeDocument || me.modules.api.document()]; }).find(selector);
            }
        },
        getSelectorClass: function() {
            return Selector;
        },
        openUrl: function(url) {
            if (! url) {
                throw new Error('empty url specified for api.openUrl');
            }
            var existingUrl = me.modules.ui.mainFrameWindow.location.href.split('#')[0];
            me.modules.ui.mainFrameWindow.location.href = url;
            if (url.split('#')[0] === existingUrl) {
                me.modules.ui.mainFrameWindow.location.reload();
            }
            return this;
        },
        isRelayRegistered: function(url) {
            return me.modules.dispatcher.isRelayRegistered(url);
        },
        getDocument: function() { return getDocument(); },
        internalDebugger: function() { 
            if(this.debug && this.debug.stop) {
                debugger;  // jshint ignore:line
            }
            return this;
        },
        resetDrillDepth: function() { currentDrillDepth = 0; },
        /**
         * @param data {Array} array of objects, keys are field names
         * @param filename {String} name of file to download
         * @param fields {Array} optional array of strings to enforce field order
         * @param mimeType {String} optional mime type to use, 'text/csv' by default
         */
        exportCsv: function(data, filename, fields, mimeType) {
            mimeType = mimeType || 'text/csv';
            fields = fields || [];
            var knownFields = {};
            var toString = function(v) {
                return (v === undefined || v === null) ? '' : String(v);
            };
            fields.filter(function(v) { 
                knownFields[v] = v;
            });
            data.filter(function(v) {
                for (var i in v) {
                    if (! knownFields[i]) {
                        knownFields[i] = i;
                        fields.push(i);
                    }
                }
            });
            var length = 0;
            data.unshift(knownFields);
            
            data.filter(function(v){ 
                length += 2;
                fields.filter(function(f) {
                    length += toString(v[f]).length + 3;
                });
            });
            var buf = new ArrayBuffer(length*2+2);
            var bufView = new Uint16Array(buf);
            bufView[0] = 0xfe * 256 + 0xff;
            var i = 1;
            data.filter(function(row) {
                (fields.map(function(f) {
                    return '"' + toString(row[f]).replace(/"/g, '""') + '"';
                }).join('\t') + '\r\n')
                .split('').filter(function(c) {
                    bufView[i++] = c.charCodeAt(0);
                });
            });
            var arrayBuffer = bufView.buffer;
            var blob = new Blob(
                [arrayBuffer],
                {type : mimeType}
            );
            var a = window.document.createElement('a');
            a.setAttribute('href', window.URL.createObjectURL(blob));
            a.setAttribute('download', filename);
            window.document.getElementsByTagName('body')[0].appendChild(a);
            a.click();
            a.parentNode.removeChild(a);
            return this;
        }
    });
}).call(this, document, window);

/**
 * see playground/todoMvcWorker.js
 */
(function(document, window, undefined){
    'use strict';
    
    var me = this.cartFillerConfiguration;
    var i;
    var api = function(method, args) { 
        return me.modules.api[method].apply(me.modules.api, args);
    };
    // during build - things are more specific
    var Wrapper;
    var Runtime;
    var niceArgs = function(args) {
        return JSON.stringify(args.map(function(arg){
            if (arg instanceof RegExp) {
                return String(arg);
            } else {
                return arg;
            }
        })).replace(/^\[/, '(').replace(/\]$/, ')');
    };
    var copyArguments = function(src) {
        var args = [];
        for (var argIndex = 0; argIndex < src.length; argIndex ++ ) {
            args.push(src[argIndex]);
        }
        return args;
    };
    var cutSince = function(arr, name) {
        for (var i = 0; i < arr.length; i ++) {
            if (arr[i][0] === 'name' && arr[i][1][0] === name) {
                return arr.slice(i);
            }
        }
        throw new Error('when trying to do .since("' + name + '") the preceding .name("' + name + '") was not found');
    };
    var flattenAndReplaceName = function(arr, name) {
        var flatten = me.modules.dispatcher.recursivelyCollectSteps(arr);
        if (name && (flatten instanceof Array) && (flatten.length > 0) && ('string' === typeof flatten[0])) {
            flatten[0] = name;
        }
        return flatten;
    };
    var findStepIndexByName = function(name, steps) {
        for (var i = steps.length - 2; i >= 0; i -= 2) {
            if (steps[i] === name) {
                return i / 2;
            }
        }
        throw new Error('step not found: [' + name + ']');
    };
    var actualWrapper = false;
    var addMakePauseBeforeStepToFirstStep = function(steps) {
        if ('function' === typeof steps[1]) {
            steps[1].cartFillerMakePauseBeforeStep = true;
        }
        return steps;
    };
    var makeConstantConditionSteps = function(arg) {
        if (true === arg) {
            return ['return true', function() { api('nop'); }];
        } else if (false === arg) {
            return ['return false', function() { api('result', ['false']); }];
        } else if ('string' === typeof arg) {
            return ['check string: ' + arg, function() {
                if(me.modules.api.debug && me.modules.api.debug.stop) {
                    debugger; // jshint ignore:line
                }
                api('result', [me.modules.dispatcher.interpolateText(arg).length ? '' : 'empty string']);
            }];
        }
    };
    var makeBreakStep = function(args, stepsToSkip) {
        var fn = function() { 
            if(me.modules.api.debug && me.modules.api.debug.stop) {
                debugger; // jshint ignore:line
            }
            if (stepsToSkip) {
                api('skipStep', [stepsToSkip]);
            }
            api('nop');
        };
        fn.cartFillerBreakFactor = args.length === 0 ? 1 : args[0];
        return ['break: ' + niceArgs(args), fn];
    };
    var makeFlavor = function(old, add) {
        var result = {};
        for (var i in old) {
            result[i] = old[i];
        }
        for (i in add) {
            result[i] = add[i];
        }
        return result;
    };
    var onLoaded = function() {
        Runtime = function() {

        };
        Runtime.prototype = Object.create({});
        // during runtime most methods are just proxying to api
        ['find', 'result', 'say', 'onload', 'nop'].filter(function(method) {
            Runtime.prototype[method] = function() { return api(method, arguments); };
        });

        Wrapper = function(){
            this.mode = 0;
            this.tasks = {};
            this.shares = {};
            this.lib = {};
            this.unexportedTasks = {};
            var wrapper = this;
            actualWrapper = this;
            this.runtime = new Runtime();
            var LibReferencePromise = this.LibReferencePromise = function(name) {
                this.name = name;
            };
            var BuilderPromise = this.BuilderPromise = function(method, args, prev) {
                this.arr = ((prev.length === 1 && prev[0][0] === '') ? [] : prev.slice()).concat(method ? [[method, args]] : []);
                var taskNames = prev.filter(function(v) { return v[0] === 'task'; });
                if (taskNames.length) {
                    wrapper.unexportedTasks[taskNames[taskNames.length - 1][1][0]] = this.arr;
                }
            };
            var decodeLibReferences = function(arr) {
                if (arr[0][0] === 'get' && arr[0][1][0] instanceof LibReferencePromise) {
                    return wrapper.lib[arr[0][1][0].name].arr.concat(arr.slice(1));
                } else if (arr[0][0] === 'lib' || arr[0][0] === 'uselib') {
                    return wrapper.lib[arr[0][1][0]].arr.concat(arr.slice(1));
                }
                return arr;
            };
            var wrapSelectorBuilderPromise = this.wrapSelectorBuilderPromise = function(arr) {
                arr = decodeLibReferences(arr);
                if (arr.length === 1) {
                    if (arr[0][0] !== 'get') {
                        throw new Error('only get is allowed as first step of selector promise, we have [' + arr[0][0] + '] instead');
                    }
                    if (arr[0][1][0] instanceof BuilderPromise) {
                        return wrapSelectorBuilderPromise(arr[0][1][0].arr);
                    } else {
                        return me.modules.dispatcher.injectTaskParameters(function(){ return api('find', arr[0][1]); }, [arr[0][1]]);
                    }
                } else {
                    var prev = arr.slice();
                    var step = prev.pop();
                    var prevBuilderPromise = wrapSelectorBuilderPromise(prev);
                    return me.modules.dispatcher.injectTaskParameters(function(){
                        var prevResult = prevBuilderPromise();
                        return prevResult[step[0]].apply(prevResult, step[1]);
                    }, [prevBuilderPromise].concat(step[1]));
                }
            };
            BuilderPromise.prototype = Object.create({});
            BuilderPromise.prototype.export = function(name) {
                if (! name) {
                    if (this.arr[0][0] === 'task') {
                        name = this.arr[0][1][0];
                    }
                    if (! name) {
                        throw new Error('When using export without parameters, you should name task at the very beginning using cf.task(\'thename\')');
                    }
                }
                if (wrapper.tasks[name] || wrapper.shares[name]) {
                    throw new Error('task or share or generator [' + name + '] already exists, looks like you try to overwrite it by cf.export() another time');
                }
                wrapper.tasks[name] = this.$since ? cutSince(this.arr, this.$since[0]) : this.arr;
                return this;
            };
            BuilderPromise.prototype.lib = function(name, body) {
                if (wrapper.lib[name]) {
                    throw new Error('lib [' + name + '] is already defined, you are trying to redefined it');
                }
                if (('function' === typeof body) || (body instanceof BuilderPromise)) {
                    wrapper.lib[name] = body;
                }
                return new BuilderPromise('lib', [name], this.arr);
            };
            BuilderPromise.prototype.const = function(value) {
                return function() { return value; };
            };
            BuilderPromise.prototype.share = function(name) {
                if (wrapper.tasks[name] || wrapper.shares[name]) {
                    throw new Error('task or share or generator [' + name + '] already exists, looks like you try to overwrite it by cf.share() another time');
                }
                wrapper.shares[name] = this.$since ? cutSince(this.arr, this.$since[0]) : this.arr;
                return this;
            };
            BuilderPromise.prototype.generator = function(name, fn) {
                if (wrapper.tasks[name] || wrapper.shares[name]) {
                    throw new Error('task or share or generator [' + name + '] already exists, looks like you try to overwrite it by cf.generator() another time');
                }
                wrapper.shares[name] = fn;
                return this;
            };
            ['since'].filter(function(f) {
                BuilderPromise.prototype[f] = function() {
                    var p = new BuilderPromise(undefined, undefined, this.arr);
                    p['$' + f] = copyArguments(arguments);
                    return p;
                };
            });
            this.cf = new BuilderPromise('', [], []); // the root
            if (! this.cf) {
                console.log('no this.cf, checking BuilderPromise');
                console.log(BuilderPromise);
                console.log(typeof BuilderPromise);
                console.log(BuilderPromise.prototype);
                console.log(typeof BuilderPromise.prototype);
                throw new Error('unable to use declarative mode - probably browser incompatibility');
            }

            var Builder = this.Builder = function() {
                this.namedResults = {};
            };
            Builder.prototype = Object.create({});
            Builder.prototype.uselib = function(args, offset, flavor) {
                if (args[0] instanceof BuilderPromise || args[0] instanceof LibReferencePromise) {
                    if (args[0] instanceof BuilderPromise) {
                        if (args[0].arr[0][0] === 'lib') {
                            return this.build(wrapper.lib[args[0].arr[0][1][0]].arr, [], offset, flavor);
                        } else {
                            return this.build(args[0].arr, [], offset, flavor);
                        }
                    } else { //args[0] instanceof LibReferencePromise
                        return this.build(wrapper.lib[args[0].name].arr, offset, flavor);
                    }
                } else {
                    if (! wrapper.lib[args[0]]) {
                        throw new Error('lib entry \'' + args[0] + '\' is not defined');
                    }
                    var steps = this.build(wrapper.lib[args[0]].arr).map(function(v, index) {
                        if (index % 2 === 0) {
                            return 'uselib(\'' + args[0] + '\')->' + v;
                        } else {
                            return v;
                        }
                    });
                    return steps;
                }
            };
            Builder.prototype.clear = function(){
                return ['remove all arrows', function() {
                    api('arrow'); 
                    api('nop');
                }];
            };
            Builder.prototype.set = function(args) {
                if (args.length !== 2) {
                    throw new Error('cf.set only makes sense with 2 arguments - global variable name and value');
                }
                var ref = args[0];
                var value = args[1];
                return ['set global variable [' + ref + '] to [' + value + ']', function() {
                    me.modules.dispatcher.getWorkerGlobals()[ref] = me.modules.dispatcher.interpolateText(value);
                    api('nop');
                }];
            };
            Builder.prototype.inc = function(args) {
                if (args.length !== 1) {
                    throw new Error('cf.inc only makes sense with 1 argument - global variable name to increment');
                }
                var ref = args[0];
                return ['inc global variable [' + ref + ']', function() {
                    me.modules.dispatcher.getWorkerGlobals()[ref] ++;
                    api('nop');
                }];
            };
            Builder.prototype.asglobal = Builder.prototype.asGlobal = function(args) {
                if (args.length !== 1) {
                    throw new Error('cf.asglobals only makes sense with 1 argument - global variable name');
                }
                var ref = args[0];
                return ['set global variable [' + ref + ']', function(val) {
                    if (val instanceof me.modules.api.getSelectorClass()) {
                        throw new Error('.asglobal is only applicable to scalars');
                    }
                    me.modules.dispatcher.getWorkerGlobals()[ref] = val;
                    api('nop');
                }];
            };
            Builder.prototype.stop = function() {
                return ['stop letting user interact', function() {
                    api('stop').result();
                }];
            };
            Builder.prototype.closeCartfiller = function() {
                return ['exit CartFiller', function() {
                    api('closeCartFiller').result();
                }];
            };
            Builder.prototype.get = function(args, offset, flavor) {
                if (args[0] instanceof BuilderPromise || args[0] instanceof LibReferencePromise) {
                    if (args[0] instanceof BuilderPromise) {
                        if (args[0].arr[0][0] === 'lib') {
                            return this.build(wrapper.lib[args[0].arr[0][1][0]].arr, [], offset, flavor);
                        } else {
                            return this.build(args[0].arr, [], offset, flavor);
                        }
                    } else { //args[0] instanceof LibReferencePromise
                        return this.build(wrapper.lib[args[0].name].arr, offset, flavor);
                    }
                } else {
                    return ['get' + niceArgs(args), function() { 
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        api('find', args).arrow(1).nop(); 
                    }];
                }
            };
            Builder.prototype.as = function(args, index) {
                this.namedResults[args[0]] = index;
                return [];                
            };
            var withFactory = function(name, argumentOffset) { 
                return ['with("' + name + '")', function() { 
                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                        debugger; // jshint ignore:line
                    }
                    if (arguments[argumentOffset] instanceof me.modules.api.getSelectorClass()) {
                        arguments[argumentOffset].arrow().nop(); 
                    } else {
                        api('return', [arguments[argumentOffset]]).nop();
                    }
                }];
            };
            Builder.prototype.with = function(args, index) {
                var result = [];
                var extraOffset = 0;
                for (var i = args.length - 1; i >= 0 ; i -- ){
                    result.push.apply(result, withFactory(args[i], extraOffset + index - this.namedResults[args[i]]));
                    extraOffset ++;
                }
                return result;
            };
            var wrapIntoImplicitSelectorWaitForWrapperIf = function(condition, fn, msg, afterWait, timeout) {
                return condition ? 
                    implicitSelectorWaitForWrapper(fn, msg, afterWait, timeout) : 
                    function(p) {
                        if (! timeout) {
                            // no wait, just check
                            if(me.modules.api.debug && me.modules.api.debug.stop) {
                                debugger; // jshint ignore:line
                            }
                            p.reevaluate().arrow();
                            api('result', [fn(p) ? '' : msg]);
                        } else {
                            api('waitFor', [function() {
                                if(me.modules.api.debug && me.modules.api.debug.stop) {
                                    debugger; // jshint ignore:line
                                }
                                p.reevaluate();
                                return fn(p);
                            }, afterWait || function() {
                                p.arrow(1).result(fn(p) ? '' : msg, true);
                            }, timeout || undefined, undefined, [p]]);
                        }
                    };
            };
            var implicitSelectorWaitForWrapper = function(fn, msg, afterWait, timeout) {
                return me.modules.dispatcher.injectTaskParameters(function(p) {
                    api('waitFor', [function() {
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        p.reevaluate();
                        return fn(p);
                    }, afterWait || function(r) {
                        p.arrow(1).result(r ? '' : msg);
                    }, timeout || undefined, undefined, [p]]);
                }, [fn, msg, afterWait]);
            };
            var buildProxyFunction = function(name, rename, afterWait) {
                return function(args, coords, flavor) {
                    var builder = this;
                    if (name === 'exists' || name === 'absent' || name === 'exactly') {
                        if (flavor.condition && rename) {
                            throw new Error('You shouldn\'t use ' + rename + ' within evaluation block of if/ifNot/while/whileNot');
                        }
                        return [
                            (rename || name) + niceArgs(args),
                            wrapIntoImplicitSelectorWaitForWrapperIf(
                                ! flavor.condition,
                                function(p) {
                                    if (name === 'exists') {
                                        return p.length;
                                    } else if (name === 'exactly') {
                                        return p.length === parseInt(me.modules.dispatcher.interpolateText(args[0]));
                                    } else {
                                        return ! p.length;
                                    }
                                },
                                name === 'exists' ? 'element did not appear within timeout' : 'element did not disappear within timeout',
                                afterWait,
                                name === 'exactly' ? args[1] : args[0]
                            )
                        ];
                    } else if (name === 'add') {
                        if (args.length !== 1) {
                            throw new Error('add can only have 1 argument');
                        }
                        var selectorSteps = builder.get([args[0]], coords, flavor);
                        return selectorSteps.concat([
                            (rename || name) + niceArgs(args), 
                            me.modules.dispatcher.injectTaskParameters(function() {
                                if(me.modules.api.debug && me.modules.api.debug.stop) {
                                    debugger; // jshint ignore:line
                                }
                                var base = arguments[selectorSteps.length / 2];
                                var s = base.add(arguments[0]);
                                s.arrow(1).nop();
                            }, args)]);
                    } else if (name === 'is' || name === 'isNot') {
                        return [
                            (rename || name) + niceArgs(args),
                            wrapIntoImplicitSelectorWaitForWrapperIf(
                                ! flavor.condition,
                                function(p) {
                                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                                        debugger; // jshint ignore:line
                                    }
                                    if (name === 'is') {
                                        return p.arrow(1).is(args[0]);
                                    } else {
                                        return ! p.arrow(1).is(args[0]);
                                    }
                                },
                                name === 'is' ? ('element.is(\'' + args[0] + '\') is not true') : ('element.is(\'' + args[0] + '\') is true but should not be'),
                                afterWait,
                                args[1]
                            )
                        ];
                    } else {
                        if (name === 'val' && args.length > 1) {
                            throw new Error('cf.val at build stage only makes sense with one argument to set element.value or with no arguments to get element value');
                        }
                        if (name === 'attr' && (args.length > 2 || args.length < 1)) {
                            throw new Error('cf.attr at build stage only makes sense with two arguments to set element attribute to or one argument to get attribute value');
                        }
                        return [(rename || name) + niceArgs(args), me.modules.dispatcher.injectTaskParameters(function(p) {
                            if(me.modules.api.debug && me.modules.api.debug.stop) {
                                debugger; // jshint ignore:line
                            }
                            var s = p[name].apply(p, args);
                            if (name === 'val' && args.length > 0) {
                                // otherwise return value
                                s = p;
                            }
                            if (s instanceof me.modules.api.getSelectorClass()) {
                                s.arrow(1).nop();
                            } else {
                                api('return', [s]).nop();
                            }
                        }, args)];
                    }
                };
            };
            for (i in me.modules.api.getSelectorClass().prototype) {
                if (i !== 'arrow' && i !== 'highlight' && i !== 'result' && i !== 'nop' && i !== 'stop') {
                    Builder.prototype[i] = buildProxyFunction(i);
                }
            }
            ['say', 'repeatTask', 'repeatStep', 'skipTask', 'skipStep', 'repeatJob', 'skipJob', 'openUrl', 'sleep'].filter(function(fn) {
                wrapper.Builder.prototype[fn] = function(args, index) {
                    return [fn + niceArgs(args), function(p) {
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        var tweakedArgs;
                        if (fn === 'repeatStep' || fn === 'skipStep') {
                            var target = findStepIndexByName(args[0], me.modules.api.env.taskSteps);
                            tweakedArgs = [fn === 'repeatStep' ? (index - target + 1) : (target - index + 1)].concat(args.slice(1));
                        } else {
                            tweakedArgs = args.slice();
                        }
                        var submitResult = true;
                        if (fn === 'say') {
                            tweakedArgs[0] = me.modules.dispatcher.interpolateText(tweakedArgs[0]);
                            if (tweakedArgs[2]) {
                                submitResult = false;
                            }
                        } else if (fn === 'openUrl') {
                            tweakedArgs[0] = me.modules.dispatcher.interpolateText(tweakedArgs[0]);
                        }
                        var apiOrElement;
                        if (fn === 'say' && p instanceof me.modules.api.getSelectorClass()) {
                            apiOrElement = p[fn].apply(p, tweakedArgs);
                        } else {
                            apiOrElement = api(fn, tweakedArgs);
                        }
                        if (fn === 'say' && ! tweakedArgs[2]) {
                            api('sleep');
                            if (submitResult) {
                                api('waitFor', [function() {
                                    return me.modules.ui.isMessageStable();
                                }]);
                                return;
                            }
                        }
                        if (fn === 'openUrl') {
                            api('onload');
                        } else if (submitResult) {
                            apiOrElement.result();
                        }
                    }];
                };
            });
            Builder.prototype.pause = function(args) {
                var ms = args[0];
                return ['pause for [' + ms + '] ms', function(){
                    api('setTimeout', [function(){
                        api('result');
                    }, ms]);
                }];
            };
            Builder.prototype.nop = function() {
                return ['nop', function(){ 
                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                        debugger; // jshint ignore:line
                    }
                    api('nop'); 
                }];
            };
            /**
             * wait for element, ms
             */
            Builder.prototype.click = function(args, offset, flavor) {
                return addMakePauseBeforeStepToFirstStep(
                    buildProxyFunction('exists', 'click', function(r, p) {
                        if (r) {
                            api('clicker')[1](p.arrow(1));
                        } else {
                            p.result('element did not appear within timeout');
                        }
                    })(args, offset, flavor)
                );
            };
            Builder.prototype.isNot = function(args, offset, flavor) {
                return buildProxyFunction('isNot')(args, offset, flavor);
            };
            Builder.prototype.ready = function() {
                return ['wait for readyState become complete', function() {
                    api('waitFor', [function() {
                        return api('getDocument').readyState === 'complete';
                    }]);
                }];
            };
            /**
             * string text to type
             * boolean dont clear text before typing
             */
            Builder.prototype.type = function(args, offset, flavor) {
                return addMakePauseBeforeStepToFirstStep(
                    buildProxyFunction('exists', 'type', function(r, p) {
                        if (r) {
                            api('typer', [
                                function() {
                                    return me.modules.dispatcher.interpolateText(args[0]);
                                },
                                undefined,
                                args[1]
                            ])[1](p.arrow(1));
                        } else {
                            p.result('element did not appear within timeout');
                        }
                    })([], offset, flavor)
                );
            };
            Builder.prototype.paste = function(args, offset, flavor) {
                return addMakePauseBeforeStepToFirstStep(
                    buildProxyFunction('exists', 'type', function(r, p) {
                        if (r) {
                            api('paster', [
                                function() {
                                    return me.modules.dispatcher.interpolateText(args[0]);
                                },
                                undefined,
                                args[1]
                            ])[1](p.arrow(1));
                        } else {
                            p.result('element did not appear within timeout');
                        }
                    })([], offset, flavor)
                );
            };
            Builder.prototype.enter = function(args, offset, flavor) {
                return addMakePauseBeforeStepToFirstStep(
                    buildProxyFunction('exists', 'enter', function(r, p) {
                        if (r) {
                            api('typer', [
                                function() {
                                    return '\r';
                                },
                                undefined,
                                true
                            ])[1](p.arrow(1));
                        } else {
                            p.result('element did not appear within timeout');
                        }
                    })([], offset, flavor)
                );
            };
            Builder.prototype.then = function(args) {
                return ['then(' +niceArgs(args) + ')', me.modules.dispatcher.injectTaskParameters(args[0], args)];
            };
            Builder.prototype.onload = function(args) {
                return ['onload(' +niceArgs(args) + ')', me.modules.dispatcher.injectTaskParameters(function() {
                    api('onload', [args[0], true]);
                }, args)];
            };
            Builder.prototype.tbd = function(args) {
                return ['tbd(' +niceArgs(args) + ')', me.modules.dispatcher.injectTaskParameters(function() {
                    api('result', ['tbd']);
                }, args)];
            };
            Builder.prototype.use = function(args) {
                if ('string' === typeof args[0]) {
                    var name = args[0];
                    var steps = wrapper.tasks[name] || wrapper.shares[name];
                    if (! steps) { 
                        throw new Error('share or task or generator [' + name + '] is not defined');
                    }
                    if (steps instanceof Function) {
                        // generator
                        steps = steps.apply(null, args.slice(1)).arr;
                    }
                    return this.build(steps);
                } else if (args[0] instanceof BuilderPromise) {
                    return this.build(args[0].arr);
                }
            };
            Builder.prototype.useIf = function(args) {
                return args[0] ? this.use(args.slice(1)) : [];
            };
            Builder.prototype.useIfNot = function(args) {
                return args[0] ? [] : this.use(args.slice(1));
            };
            Builder.prototype.name = function() { return []; };
            var generateIfOrIfNotSteps = function(args, builder, ifNot, isWhile, offset, flavor) {
                var condition = args[0];
                var action = args[1];
                var elseAction = isWhile ? undefined : args[2];
                var conditionSteps = makeConstantConditionSteps(args[0]) || builder.build(condition.arr, [], makeFlavor(flavor, {condition: true}), offset);
                var conditionStepsLen = conditionSteps.length / 2;
                var actionSteps = action ? builder.build(action.arr, [], undefined, offset + conditionStepsLen + 1) : [];
                var actionStepsLen = actionSteps.length / 2;
                var elseSteps = elseAction ? builder.build(elseAction.arr, [], undefined, offset + conditionStepsLen + 1 + actionStepsLen + 1) : [];
                var elseStepsLen = elseSteps.length / 2;
                var hasElse = elseSteps.length ? true : false;
                if (isWhile) {
                    actionStepsLen ++;
                    actionSteps.push('repeat', function() {
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        api('repeatStep', [actionStepsLen + conditionStepsLen + 1]);
                        api('nop');
                    });
                    // fix break steps
                    actionSteps = actionSteps.map(function(step, index) {
                        if (index % 2) {
                            if (step.cartFillerBreakFactor) {
                                return makeBreakStep([step.cartFillerBreakFactor - 1], actionStepsLen - index / 2)[1];
                            }
                        }
                        return step;
                    });
                }
                if (hasElse) {
                    actionStepsLen ++;
                    actionSteps.push('skip else section', function() {
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        api('skipStep', [elseStepsLen]);
                        api('nop');
                    });
                }
                conditionSteps.filter(function(step, i) { 
                    if (i % 2) {
                        step.cartFillerCaptureResult = conditionStepsLen - (i - 1) / 2;
                    }
                });
                conditionSteps.push((isWhile ? 'while' : 'if') + (ifNot ? 'Not' : '') + ' - check condition evaluation result', function(result) {
                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                        debugger; // jshint ignore:line
                    }
                    if (result[2]) {
                        api('arrow', [result[1], 1]);
                    } else {
                        api('return', [result[1]]);
                    }
                    // result is notnull if evaluation failed
                    if ((! ifNot && result[0]) || // if used with if/whilie, then we skip if evaluation failed
                        (ifNot && ! result[0])) // if used with ifNot/whileNot, then we skip if evaluation succeeded
                    {
                        api('skipStep', [actionStepsLen]);
                    }
                    api('nop');
                });
                return conditionSteps.concat(actionSteps).concat(elseSteps);
            };
            Builder.prototype.inside = function(args, offset, flavor) {
                var steps = this.build(args[0].arr, [], makeFlavor(flavor, {inside: true}), offset);
                return steps.map(function(step, index) {
                    if (index % 2) {
                        var f = function() {
                            if(me.modules.api.debug && me.modules.api.debug.stop) {
                                debugger; // jshint ignore:line
                            }
                            var prev = arguments[(index - 1) / 2];
                            var args = copyArguments(arguments);
                            api('drill', [
                                function() {
                                    return prev[0].contentWindow;
                                },
                                function() {
                                    step.apply(this, args);
                                }
                            ]);
                        };
                        if (step.cartFillerCaptureResult) {
                            f.cartFillerCaptureResult = step.cartFillerCaptureResult;
                        }
                        return f;
                    } else {
                        return step;
                    }
                });
            };
            Builder.prototype.if = function(args, offset, flavor) { 
                return generateIfOrIfNotSteps(args, this, false, false, offset, flavor);
            };
            Builder.prototype.ifNot = function(args, offset, flavor) { 
                return generateIfOrIfNotSteps(args, this, true, false, offset, flavor);
            };
            Builder.prototype.while = function(args, offset, flavor) { 
                return generateIfOrIfNotSteps(args, this, false, true, offset, flavor);
            };
            Builder.prototype.whileNot = function(args, offset, flavor) { 
                return generateIfOrIfNotSteps(args, this, true, true, offset, flavor);
            };
            Builder.prototype.break = function(args) {
                return makeBreakStep(args);
            };
            Builder.prototype.task = function() {
                // just declare task name
                return [];
            };
            var promiseProxyFactory = function(name){
                return function() { 
                    if (wrapper.mode) {
                        return this.runtime[name].apply(this.runtime, arguments);
                    } else {
                        return new BuilderPromise(name, copyArguments(arguments), this.arr); 
                    }
                };
            };
            for (i in Builder.prototype) {
                if (Builder.prototype.hasOwnProperty(i)) {
                    BuilderPromise.prototype[i] = promiseProxyFactory(i);
                }
            }
            Builder.prototype.build = function(steps, prev, flavor, offset) {
                flavor = flavor || {};
                offset = offset || 0;
                var result = (prev || []).slice();
                var builder = this;
                var rememberedName;
                steps.filter(function(step) {
                    if (step[0] === 'lib') {
                        return;
                    }
                    if (! builder[step[0]]) {
                        throw new Error('step [' + step[0] + '] is not known to builder');
                    }
                    result.push.apply(result, flattenAndReplaceName(builder[step[0]](step[1], result.length / 2 + offset, flavor), rememberedName));
                    rememberedName = step[0] === 'name' ? (rememberedName ? rememberedName : step[1][0]) : undefined;
                });
                return result;
            };
        };
        Wrapper.prototype = Object.create({});
        Wrapper.prototype.switchMode = function() {
            this.mode = 1;
        };
        Wrapper.prototype.getCf = function() {
            return this.cf;
        };
        Wrapper.prototype.libFunction = function(){
            var name = arguments[0];
            if (this.mode === 0) {
                if (name instanceof this.BuilderPromise) {
                    var libElement = name.arr.filter(function(v) { return v[0] === 'lib'; });
                    if (libElement.length) {
                        name = libElement[0][1][0];
                    }
                }
                // tbd this is wrong, we should return promise that
                // will anyway be resolved later at runtime
                if ('function' === typeof this.lib[name]) {
                    throw new Error('this is not implemented');
                } else if (this.lib[name] instanceof this.BuilderPromise) {
                    return this.lib[name];
                } else {
                    return new this.LibReferencePromise(name);
                }
            } else {
                throw new Error('lib is not available in runtime');
            }
        };
        Wrapper.prototype.getLib = function() {
            var wrapper = this;
            return function(){ 
                return wrapper.libFunction.apply(wrapper, arguments);
            };
        };
        Wrapper.prototype.buildTasks = function(existingTasks) {
            var i;
            for (i in this.unexportedTasks) {
                if (! this.tasks[i]) {
                    this.tasks[i] = this.unexportedTasks[i];
                }
            }
            var result = existingTasks || {};
            // build shared steps and generators
            for (i in this.tasks) {
                result[i] = this.buildTask(this.tasks[i]);
            }
            return result;
        };
        Wrapper.prototype.buildTask = function(steps) {
            var builder = new this.Builder();
            return builder.build(steps, []);
        };
    };

    me.scripts.push({
        getName: function(){ return 'cf'; },
        onLoaded: function() {
            onLoaded();
        },
        create: function() {
          return new Wrapper();
        },
        getlib: function(name) {
            return actualWrapper ? actualWrapper.wrapSelectorBuilderPromise(actualWrapper.lib[name].arr)() : me.modules.api.find();
        },
        getLibSelectors: function() {
            var result = {};
            if (actualWrapper) {
                for (var i in actualWrapper.lib) {
                    if (actualWrapper.lib[i] instanceof actualWrapper.BuilderPromise) {
                        try {
                            var selector = actualWrapper.wrapSelectorBuilderPromise(actualWrapper.lib[i].arr)();
                            if (selector.length) {
                                result[i] = selector;
                            }
                        } catch (e) {}
                    }
                }
            }
            return result;
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
    var postMessageFromWindowToWindow = function(cmd, details, from, to) {
        from.tmpReference1892049810jf10jfa = to;
        details.cmd = cmd;
        var payload = 'cartFillerMessage:' + JSON.stringify(details);
        from.eval('tmpReference1892049810jf10jfa.postMessage(' + JSON.stringify(payload) + ', "*");');
    };
    var evaluatedCssSelectorElements = [];
    var reinitializeWorker = function() {
        var task = workerCurrentTask;
        var api = me.modules.api;
        var getStack = function() {
            return (workerGlobals['_foreach stack'] || '').split('|');
        };
        var setStack = function(pc) {
            workerGlobals['_foreach stack'] = pc.join('|');
        };
        var _set = ['set [ref] to [value]', function() { api.internalDebugger(); task.ref = task.value; api.result(); }];
        worker = {
            '_set': _set,
            '^global variable ${ref} has value ${value}$': _set,
            '^current url is ${url}$': ['open url', function() {
                me.modules.ui.mainFrameWindow.location.href = task.url;
                api.onload();
            }],
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
            ],
            '_closeCartFiller':[
                'close CartFiller, only for \'clean\' injection mode', function() {
                    api.internalDebugger();
                    api.closeCartFiller().result();
                }
            ],
            '_stop': [
                'stop letting user to interact', function() {
                    api.internalDebugger();
                    api.stop().result();
                }
            ]
        };
    };
    var INTERPOLATE_PATTERN = /(^|[^\\])\$\{([^${}}]+)}/g;
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
     * used for specific case, when api.onload is called in next step after actual 
     * page refresh happens. This is used when e.g. cf.onload is used. 
     * Since invokeWorker resets onLoadHappened at the beginning, this is a way to 
     * recover its state
     */
    var shadowedOnLoadHappened = false;
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
            result = returnRefKey ? 
                value : 
                (
                    value === '_random' ? 
                    (String(new Date().getTime()) + String(Math.floor(1000 * Math.random()))) :
                    (
                        value === '_timestamp' ?
                        (String(new Date().getTime())) :
                        workerGlobals[value]
                    )
                );
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
        reinitializeWorker();
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
                    hashUrl: me['data-choose-job'].split('#')[1] || window.location.hash,
                    urlOnBoot: me.modules.ui.mainFrameWindow.location.href
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
                shadowedOnLoadHappened = onLoadHappened;
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
                elements = eval('(function(window, document, api, cf, task){return ' + ('uselib(' === details.selector.substr(0, 7) ? 'cf.' : 'api.find') + details.selector + ';})(me.modules.ui.mainFrameWindow, me.modules.ui.mainFrameWindow.document, me.modules.api, me.modules.cf, ' + JSON.stringify(details.taskDetails) + ');'); // jshint ignore:line
            } catch (e) {
                elements = [];
            }
            for (var i = 0; i < elements.length && i < 16 ; i ++ ) {
                arrow.push(elements[i]);
            }
            if (details.initial || arrow.length !== evaluatedCssSelectorElements.length || arrow.filter(function(e) { return -1 === evaluatedCssSelectorElements.indexOf(e); }).length) {
                evaluatedCssSelectorElements = arrow;
                me.modules.ui.clearOverlays();
                me.modules.ui.arrowTo(arrow, true, true);
            }
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
                cf: currentCf.getCf(),
                oldlib: workerLibOfThisWorker
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
         * @param {boolean} registerWorkerOnloadCallback see api.onload()
         * @access public
         */
        registerWorkerOnloadCallback: function(cb, registerWorkerOnloadCallback){
            if (onLoadHappened || (registerWorkerOnloadCallback && shadowedOnLoadHappened)) {
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
            var newText = text;
            var replaceFn = function(m, g1, g2) {
                if (storeDiscoveredParametersHere) {
                    storeDiscoveredParametersHere[g2] = true;
                }
                var value = workerCurrentTask[g2];
                if (undefined === value) {
                    value = workerGlobals[g2];
                }
                return g1 + ((undefined === value || null === value) ? '' : String(value));
            };
            do {
                text = newText;
                newText = text.replace(INTERPOLATE_PATTERN, replaceFn);
            } while (newText !== text);
            return text.replace(/\\\$/g, '$');
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
        'api',
        'cf'
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
        for (var scriptName in me.cartFillerConfiguration.modules) {
            if (me.cartFillerConfiguration.modules[scriptName].onLoaded) {
                me.cartFillerConfiguration.modules[scriptName].onLoaded();
            }
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
    /////
    var elementsToTrack = [];
    /////
    var elementsToDrawByPath = {};

    var trackedIframes = {};
    /**
     * Keeps current message to say
     * @member {String} CartFiller.UI~messageToSay
     * @access private
     */
    var messageToSay = '';
    var messageToSayOptions = {};
    var messageToDraw = '';
    /**
     * Whether to wrap messageToSay with &lt;pre&gt;
     * @member {boolean} CartFiller.UI~wrapMessageToSayWithPre
     * @access private
     */
    var wrapMessageToSayWithPre = false;
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
     * Keeps current message div top divisor from default value which is 
     * adjusted until message will fit in current viewport
     * @member {integer} CartFiller.UI~currentMessageDivTopShift
     * @access private
     */
    var currentMessageDivTopShift = 0;
    /**
     * Is set to true if UI is working in framed mode
     * This lets us draw overlays in main window instead of main frame
     * @member {string} CartFiller.UI~uiType can be 'clean', 'framed', 'popup'
     * @access private
     */
    var uiType = 'framed';
    var cleanUIRootWindowSize;
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
    var prepareToClearOverlays = false;
    var adjustMessageDivTimeout = false;
    /**
     * Returns window, that will be used to draw overlays
     * @function {Window} CartFiller.UI~overlayWindow
     * @access private
     */
    var overlayWindow = function(){
        return me.modules.ui.mainFrameWindow;
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
     * @param {String} type
     * @return {HtmlElement} div
     * @access private
     */
    var getOverlayDiv2 = function(type){ 
        var div = overlayWindow().document.createElement('div');
        div.style.position = 'fixed';
        div.style.backgroundColor = getRedArrowColor();
        div.style.zIndex = getZIndexForOverlay();
        div.className = overlayClassName + ' ' + overlayClassName + type;
        div.onclick = function(){me.modules.ui.clearOverlaysAndReflect();};
        // this adds flickering to let user still interact with underlying page elements
        div.addEventListener('mousemove', function() {
            div.style.display = 'none';
            setTimeout(function() {
                div.style.display = 'block';
            }, 100);
        });
        var body = overlayWindow().document.getElementsByTagName('body')[0];
        if (body) {
            var messageDiv = body.getElementsByClassName('cartFillerOverlayDivmessage');
            if (messageDiv.length) {
                body.insertBefore(div, messageDiv[0]);
            } else {
                body.appendChild(div);
            }
        }
        return div;
    };
    var deleteOverlaysOfType = function(type) {
        var divs = overlayWindow().document.getElementsByClassName(overlayClassName + (type ? type : ''));
        for (var i = divs.length - 1; i >= 0; i --) {
            divs[i].parentNode.removeChild(divs[i]);
        }
        divs = overlayWindow().document.getElementsByClassName(overlayClassName + ' ' + overlayClassName + (type ? type : ''));
        for ( i = divs.length - 1; i >= 0; i --) {
            divs[i].parentNode.removeChild(divs[i]);
        }
    };
    /**
     * Draws vertical arrow line
     * @function CartFiller.UI~verticalLineOverlay
     * @param {integer} left
     * @param {integer} top
     * @param {integer} height
     * @access private
     */
    var verticalLineOverlay = function(type, left, top, height, width){
        width = String(width || 20) + 'px';
        var div = getOverlayDiv2(type);
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = width;
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
    var horizontalLineOverlay = function(type, left, top, width, height) {
        height = String(height || 20) + 'px';
        var div = getOverlayDiv2(type);
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = width + 'px';
        div.style.height = height;
    };
    /**
     * Draws horizontal overlay arrow, direction = right
     * @function CartFiller.UI~horizontalArrowOverlayRight
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var horizontalArrowOverlayRight = function (type, left, top){
        var div = getOverlayDiv2(type);
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
    var verticalArrowOverlayDown = function(type, left, top){
        var div = getOverlayDiv2(type);
        div.style.left = (left - 25) + 'px';
        div.style.top = top + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderLeft = div.style.borderRight = '25px solid transparent';
        div.style.borderTop = '30px solid rgba(255,0,0,0.3)';
    };
    /**
     * Draws vertical overlay arrow, direction = up
     * @function CartFiller.UI~verticalArrowOverlayUp
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var verticalArrowOverlayUp = function(type, left, top){
        var div = getOverlayDiv2(type);
        div.style.left = (left - 25) + 'px';
        div.style.top = top + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderLeft = div.style.borderRight = '25px solid transparent';
        div.style.borderBottom = '30px solid rgba(255,0,0,0.3)';
    };
    var findChanges = function(elements){
        var rebuild = {}, i, top, left, width, height, element, rect;
        if (! (elements instanceof Array)) {
            var thearray = []; 
            for (i in elements) {
                thearray.push(elements[i]);
            }
            elements = thearray;
        }
        // check whether positions of elements have changed
        for (i = elements.length - 1; i >= 0; i--){
            element = elements[i];
            if (! element || ! element.element) {
                continue;
            }
            rect = element.element.getBoundingClientRect();
            var plusLeft = 0, plusTop = 0;
            if (element.type === 'iframe') {
                try {
                    var style = element.element.ownerDocument.defaultView.getComputedStyle(element.element);
                    plusTop = parseInt(style.borderTopWidth.replace(/[^0-9]/g, ''));
                    plusLeft = parseInt(style.borderLeftWidth.replace(/[^0-9]/g, ''));
                } catch (e) {}
            }
            if (rect.width > 0 || rect.height > 0 || rect.left > 0 || rect.top > 0) {
                top = Math.round(rect.top - 5);
                left = Math.round(rect.left - 5);
                height = Math.round(rect.height + 9);
                width = Math.round(rect.width + 9);
            } else {
                me.log(element);
                rebuild.any = true;
                if (element.type) {
                    rebuild[element.type] = true;
                }
                me.log(rebuild);
                element.deleted = true;
                element.element = null;
                continue;   
            }
            if ((top !== element.top) ||
                (left !== element.left) ||
                (height !== element.height) ||
                (width !== element.width)){
                me.log(element);
                rebuild.any = true;
                if (element.type) {
                    rebuild[element.type] = true;
                }
                me.log(rebuild);
                element.top = top;
                element.left = left;
                element.height = height;
                element.width = width;
                element.right = left + width;
                element.bottom = top + height;
                element.self = {
                    top: rect.top + plusTop,
                    left: rect.left + plusLeft,
                    right: rect.right + plusLeft,
                    bottom: rect.bottom + plusTop,
                    width: rect.width,
                    height: rect.height
                };
            }
        }
        return rebuild;
    };
    var addFrameCoordinatesMap = function(element) {
        me.log(element);
        if (! element.path || ! element.path.length) {
            return element;
        }
        var rect = {
            left: element.rect.left,
            top: element.rect.top,
            width: element.rect.width,
            height: element.rect.height,
            originalElement: element
        };
        for (var i = element.path.length - 1; i >= 0 ; i --) {
            var path = element.path.slice(0,i+1).join('/');
            var iframe = trackedIframes[path];
            if (iframe) {
                rect.left += iframe.rect.left;
                rect.top += iframe.rect.top;
            }
        }
        me.log(rect);
        return {rect: rect};
    };
    var sendScrollToPhantom = function(mapped) {
        window.callPhantom({scroll: mapped});
        me.modules.dispatcher.postMessageToWorker('phantomScroll', {scroll: mapped});
    };
    var knownScrollTs = 0;
    var scrollIfNecessary = function() {
        var scrollPretendent, scrollPretendentTs;
        var findScrollPretendent = function(el) {
            if (el.scroll && (el.ts > knownScrollTs)) {
                if (el.ts > scrollPretendentTs || ! scrollPretendentTs) {
                    scrollPretendent = el;
                    scrollPretendentTs = el.ts;
                }
            }
        };
        var currentMainFrameWindowFilter = function(el) { return el.currentMainFrameWindow === me.modules.dispatcher.getFrameWindowIndex(); };
        for (var path in elementsToDrawByPath) {
            elementsToDrawByPath[path]
                .filter(currentMainFrameWindowFilter)
                .filter(findScrollPretendent);
        }
        if (! scrollPretendent && window.callPhantom && currentMessageOnScreen) {
            var messageDiv = overlayWindow().document.getElementsByClassName(overlayClassName + 'message');
            if (messageDiv.length) {
                sendScrollToPhantom({rect: messageDiv[0].getBoundingClientRect()});
            }
        } 
        if (scrollPretendent) {
            knownScrollTs = scrollPretendentTs;
            if (window.callPhantom && (window.callPhantom instanceof Function)) {
                var mapped = addFrameCoordinatesMap(scrollPretendent);
                sendScrollToPhantom(mapped);
            } else {
                var border = 0.25;
                var scroll = [
                    scrollPretendent.rect.left - (getInnerWidth() * border),
                    scrollPretendent.rect.top - (getInnerHeight() * border)
                ];
                for (var i = 0 ; i < 2 ; i ++ ) {
                    if (scroll[i] < 0) {
                        // we need to scroll up/left - that's ok
                    } else {
                        // we need to scroll down/right -- only if element does not fit
                        // to the 20...80 % rect
                        scroll[i] = Math.min(scroll[i], Math.max(0, scrollPretendent.rect[i ? 'bottom' : 'right'] - (i ? getInnerHeight() : getInnerWidth()) * (1 - border)));
                    }
                }
                me.modules.ui.mainFrameWindow.addEventListener('scroll', arrowToFunction);
                me.modules.ui.mainFrameWindow.scrollBy(scroll[0], scroll[1]);
            }
            return true;
        }
    };
    var deferredDrawArrows = false;
    var drawArrowsDeferred = function() {
        drawArrows(true);
    };
    /**
     * Draws arrow overlay divs
     * @function CartFiller.UI~drawArrows
     * @access private
     */
    var drawArrows = function(deferred){
        var count = 0;
        if (deferred) {
            deferredDrawArrows = false;
        } else if (deferredDrawArrows) {
            clearTimeout(deferredDrawArrows);
            deferredDrawArrows = false;
        }
        var path;
        if (! deferred) {
            for (path in elementsToDrawByPath) {
                count += elementsToDrawByPath[path].length;
                if (count > 1) {
                    deferredDrawArrows = setTimeout(drawArrowsDeferred, 200);
                    return;
                }
            }
        }
        me.log();
        scrollIfNecessary();
        deleteOverlaysOfType('arrow');
        for (path in elementsToDrawByPath) {
            drawArrowsForPath(elementsToDrawByPath[path]);
        }
    };
    var drawArrowsForPath = function(elements) {
        me.log(elements);
        var top, left, bottom;
        elements
        .filter(function(el) { return 'arrow' === el.type && ! el.deleted; })
        .filter(function(el) { return el.currentMainFrameWindow === me.modules.dispatcher.getFrameWindowIndex(); })
        .map(addFrameCoordinatesMap)
        .filter(function(el, i) {
            if (i > 50) {
                return;
            }
            var border = 5;
            horizontalLineOverlay('arrow', el.rect.left - border, el.rect.top - border, el.rect.width + border * 2, border);
            horizontalLineOverlay('arrow', el.rect.left - border, el.rect.bottom, el.rect.width + border * 2, border);
            verticalLineOverlay('arrow', el.rect.left - border, el.rect.top, el.rect.height, border);
            verticalLineOverlay('arrow', el.rect.right, el.rect.top, el.rect.height, border);
            if (el.rect.left > 40) {
                top = el.rect.top + Math.round(el.rect.height/2);
                verticalLineOverlay('arrow', 0, 0, top - 10);
                horizontalLineOverlay('arrow', 0, top - 10, el.rect.left - 30);
                horizontalArrowOverlayRight('arrow', el.rect.left - 30, top);
            } else if (el.rect.top > 40) {
                left = el.rect.left + Math.min(30 + i * 30, Math.round(el.rect.width / 2));
                horizontalLineOverlay('arrow', 0, 0, left - 10);
                verticalLineOverlay('arrow', left - 10, 0, el.rect.top - 30);
                verticalArrowOverlayDown('arrow', left, el.rect.top - 30);
            } else {
                left = el.rect.left + Math.min(30, Math.round(el.rect.width / 2));
                bottom = el.rect.top + el.rect.height;
                horizontalLineOverlay('arrow', 0, bottom + 60, left + 10);
                verticalLineOverlay('arrow', left - 10, bottom + 30, 30);
                verticalArrowOverlayUp('arrow', left, bottom);
            }
        });
    };
    /**
     * Finds max bounding rectange of elements
     * @function CartFiller.UI~findMaxRect
     * @param {Object} what
     * @access private
     */
    var findMaxRect = function(what){
        var left, top, right, bottom;
        var filter = function(el) {
            return ('undefined' === typeof what ||
                what[el.type]) && 
                ! el.deleted;
        };
        var calc = function(el) {
            left = undefined === left ? el.rect.left : Math.min(left, el.rect.left);
            right = undefined === right ? (el.rect.left + el.rect.width) : Math.max(right, (el.rect.left + el.rect.width));
            top = undefined === top ? el.rect.top : Math.min(top, el.rect.top);
            bottom = undefined === bottom ? (el.rect.top + el.rect.height) : Math.max(bottom, (el.rect.top + el.rect.height));
        };
        var currentMainFrameWindowFilter = function(el) { return el.currentMainFrameWindow === me.modules.dispatcher.getFrameWindowIndex(); };
        for (var path in elementsToDrawByPath) {
            elementsToDrawByPath[path]
            .filter(filter)
            .filter(currentMainFrameWindowFilter)
            .map(addFrameCoordinatesMap)
            .filter(calc);
        }
        return {left: left, right: right, top: top, bottom: bottom};
    };
    var getInnerHeight = function() {
        try {
            if (parent.callPhantom) {
                return 600;
            }
        } catch (e) {}
        return me.modules.ui.mainFrameWindow.innerHeight;
    };
    var getInnerWidth = function() {
        return me.modules.ui.mainFrameWindow.innerWidth;
    };
    /**
     * Draws highlighting overlay divs
     * @function CartFiller.UI~drawHighlights
     * @access private
     */
    var drawHighlights = function(){
        scrollIfNecessary();
        deleteOverlaysOfType('highlight');
        var rect = findMaxRect({highlight: true});
        if (rect.left === undefined) {
            return;
        }
        var pageBottom = getInnerHeight();
        var pageRight = getInnerWidth();
        var border = 5;
        createOverlay(0, 0, Math.max(0, rect.left - border), pageBottom);
        createOverlay(Math.min(pageRight, rect.right + border), 0, pageRight, pageBottom);
        createOverlay(Math.max(0, rect.left - border), 0, Math.min(pageRight, rect.right + border), Math.min(pageBottom, rect.top - border));
        createOverlay(Math.max(0, rect.left - border), Math.max(0, rect.bottom + border), Math.min(pageRight, rect.right + border), pageBottom);
    };
    var getDomain = function(url) {
        return url.split('/').slice(0, 3).join('/');
    };
    /**
     * Draws message div
     * @function CartFiller.UI~drawMessage
     * @access private
     */
    var drawMessage = function(){
        deleteOverlaysOfType('message');
        var rect = findMaxRect({highlight: true, arrow: true});
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
            messageDiv.style.zIndex = getZIndexForOverlay();
            messageDiv.style.border = '#bbb solid 10px';
            messageDiv.style.borderRadius = '20px';
            messageDiv.style.overflow = 'auto';
            messageDiv.style.opacity = '0';
            messageDiv.style.top = Math.min(getInnerHeight() - 100, rect.bottom + 5 - currentMessageDivTopShift) + 'px';
            messageDiv.style.left = Math.max(0, (Math.round((rect.left + rect.right) / 2) - currentMessageDivWidth)) + 'px';
            messageDiv.style.width = currentMessageDivWidth + 'px';
            messageDiv.style.height = 'auto';
            messageDiv.style.maxHeight = '100%';
            messageDiv.style.position = 'fixed';
            messageDiv.style.fontSize = '20px';
            messageDiv.style.lineHeight = '1.4';
            messageDiv.className = overlayClassName + ' ' + overlayClassName + 'message';

            var innerDiv = overlayWindow().document.createElement(wrapMessageToSayWithPre ? 'pre' : 'div');
            messageDiv.appendChild(innerDiv);
            if (messageToSayOptions.html) {
                innerDiv.innerHTML = messageToSay;
            } else if (wrapMessageToSayWithPre) {
                innerDiv.style.fontSize = '14px';
                innerDiv.textContent = messageToSay;
                innerDiv.style.whiteSpace = 'pre';
                messageDiv.style.left = '3px';
                messageDiv.style.width = (getInnerWidth() - 60) + 'px';
            } else {
                messageToSay.split('\n').filter(function(lineToSay, i) {
                    if (i) {
                        var br = overlayWindow().document.createElement('br');
                        innerDiv.appendChild(br);
                    }
                    var span = overlayWindow().document.createElement('span');
                    span.textContent = lineToSay;
                    innerDiv.appendChild(span);
                });
            }
            innerDiv.style.backgroundColor = '#fff';
            innerDiv.style.border = 'none';
            innerDiv.onclick = function(e) { e.stopPropagation(); return false; };
            var closeButton = overlayWindow().document.createElement('button');
            messageDiv.appendChild(closeButton);
            closeButton.textContent = messageToSayOptions.nextButton || 'Close (spacebar)';
            closeButton.style.borderRadius = '4px';
            closeButton.style.fontSize = '14px';
            closeButton.style.float = 'right';
            closeButton.style.borderColor = '#bbb';
            closeButton.style.padding = '2px 6px';
            closeButton.style.borderWidth = '2px';
            closeButton.style.backgroundColor = '#fff';
            closeButton.style.borderStyle = 'outset';
            if (messageToSayOptions.nextButton) {
                if (me.modules.dispatcher.running === true) {
                    setTimeout(function() {
                        me.modules.ui.clearOverlaysAndReflect();
                    },0);
                } else {
                    closeButton.onclick = function(e) { 
                        e.stopPropagation(); 
                        me.modules.ui.clearOverlaysAndReflect();
                        me.modules.dispatcher.postMessageToWorker('messageCloseClicked', {});
                        return false;
                    };
                }
            }
            messageDiv.onclick = function(){
                me.modules.ui.clearOverlaysAndReflect();
                me.modules.dispatcher.postMessageToWorker('messageCloseClicked', {});
            };
            overlayWindow().document.getElementsByTagName('body')[0].appendChild(messageDiv);
            closeButton.focus();
            messageAdjustmentRemainingAttempts = 100;
            me.modules.ui.adjustMessageDiv(messageDiv);
            if (messageToSayOptions.callback) {
                messageToSayOptions.callback.apply(getDocument(), [messageDiv]);
            }
        }
        currentMessageOnScreen = messageToSay;
    };
    /**
     * Function, that maintains arrows on screen, called time to time.
     * @function CartFiller.UI~arrowToFunction
     * @access private
     */
    var arrowToFunction = function(){
        var serialize = function(what) {
            var map = function(e) {
                var src = e.type === 'iframe' ? e.self : e;
                return {
                    rect: {
                        left: src.left,
                        top: src.top,
                        width: src.width,
                        height: src.height,
                        right: src.right,
                        bottom: src.bottom,
                        url: e.element ? e.element.ownerDocument.defaultView.location.href : false
                    },
                    type: e.type,
                    path: e.path,
                    scroll: e.scroll,
                    ts: e.ts,
                    deleted: e.deleted,
                    currentMainFrameWindow: e.currentMainFrameWindow
                };
            };
            var r = {};
            elementsToTrack
                .filter(function(e){ 
                    return what[e.type]; 
                })
                .filter(function(e){ 
                    r[e.path.join('/')] = []; 
                    return true; 
                })
                .map(map)
                .filter(function(e) { 
                    if (! e.discard) {
                        r[e.path.join('/')].push(e);
                    }
                });
            return r;
        };
        try {
            var rebuildElements = findChanges(elementsToTrack);
            var rebuildMessage = currentMessageOnScreen !== messageToSay;
            if (rebuildElements.arrow || rebuildElements.highlight || rebuildMessage || rebuildElements.iframe) {
                // that's real things to draw, let's do that
                var details = {
                    elementsByPath: serialize({arrow: rebuildElements.arrow, highlight: rebuildElements.highlight}),
                    rebuild: rebuildElements,
                    iframesByPath: {}
                };
                if (rebuildMessage) {
                    details.messageToSay = messageToSay;
                    details.rebuild.message = true;
                }
                if (rebuildElements.iframe) {
                    details.iframesByPath = serialize({iframe: true});
                }
                me.modules.ui.drawOverlaysAndReflect(details);
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
    var adjustFrameCoordinates = function(forceRedraw){
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight,
            outerWidth = uiType === 'framed' ? false : window.outerWidth,
            outerHeight = uiType === 'framed' ? false : window.outerHeight;

        me.modules.ui.checkAndUpdateCurrentUrl();
        if (currentWindowDimensions.width !== windowWidth ||
            currentWindowDimensions.height !== windowHeight ||
            currentWindowDimensions.outerWidth !== outerWidth ||
            currentWindowDimensions.outerHeight !== outerHeight ||
            currentWindowDimensions.workerFrameSize !== currentWorkerFrameSize ||
            (uiType === 'framed' && me.modules.ui.currentMainFrameWindow !== me.modules.ui.drawnMainFrameWindow) ||
            forceRedraw) {
            (function() {
                var mainFrameWidthBig = windowWidth * 0.8 - 1,
                    mainFrameWidthSmall = windowWidth * 0.2 - 1,
                    workerFrameWidthBig = windowWidth * 0.8 - 1,
                    workerFrameWidthSmall = windowWidth * 0.2 - 1,
                    slaveFramesHeight = 20,
                    mainFramesHeight = Math.floor(
                        (windowHeight - 15 - (uiType === 'framed' ? ((me.modules.ui.mainFrames.length - 1) * slaveFramesHeight) : 0)) / (uiType === 'framed' ? me.modules.ui.mainFrames.length : 1)
                    ),
                    workerFrameHeight = windowHeight - 15,
                    chooseJobFrameLeft = uiType === 'clean' ? (0.02 * cleanUIRootWindowSize.width) : (0.02 * windowWidth + (uiType === 'framed' ? 0 : 200)),
                    chooseJobFrameWidth = uiType === 'clean' ? (0.76 * cleanUIRootWindowSize.width) : (0.76 * windowWidth - (uiType === 'framed' ? 0 : 200)),
                    chooseJobFrameTop = 0.02 * (uiType === 'clean' ? 0 : windowHeight),
                    chooseJobFrameHeight = 0.96 * (uiType === 'clean' ? (cleanUIRootWindowSize.height - 50) : windowHeight);

                    var frameHeights = [];

                    if (uiType === 'framed') {
                        me.modules.ui.mainFrames.filter(function(mainFrame, index) {
                            frameHeights[index] = Math.floor(mainFramesHeight * (me.modules.ui.mainFrames.length === 1 ? 1 : (index === me.modules.ui.currentMainFrameWindow ? (0.3 + 0.7 * me.modules.ui.mainFrames.length) : 0.3)));
                            mainFrame.style.height =  frameHeights[index] + 'px';
                            if (index > 0 && me.modules.ui.slaveFrames[index]) {
                                me.modules.ui.slaveFrames[index].style.height = slaveFramesHeight + 'px';
                            }
                        });
                    }
                    if (uiType !== 'clean') {
                        try {
                            me.modules.ui.workerFrame.style.height = workerFrameHeight + 'px';
                        } catch (e) {}
                    }
                    try {
                        me.modules.ui.chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
                        me.modules.ui.chooseJobFrame.style.top = chooseJobFrameTop + 'px';
                        me.modules.ui.chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
                        me.modules.ui.chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
                    } catch (e) {}
                    if (uiType === 'framed') {
                        me.modules.ui.mainFrames.filter(function(mainFrame, index) {
                            try {
                                var mainFrameTop = frameHeights.slice(0, index).reduce(function(acc, v) { return acc + v + slaveFramesHeight; }, 0);
                                mainFrame.style.top = mainFrameTop + 'px';
                                if (index > 0 && me.modules.ui.slaveFrames[index]) {
                                    me.modules.ui.slaveFrames[index].style.top = (mainFrameTop - slaveFramesHeight) + 'px';
                                }
                            } catch (e) {}
                        });
                    }

                    if (currentWorkerFrameSize === 'big') {
                        if (uiType === 'framed') {
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthBig + 'px';
                                me.modules.ui.workerFrame.style.left = mainFrameWidthSmall + 'px';
                            } catch (e) {}
                            me.modules.ui.mainFrames.filter(function(mainFrame, index) {
                                try {
                                    mainFrame.style.width = mainFrameWidthSmall + 'px';

                                    if (index > 0 && me.modules.ui.slaveFrames[index]) {
                                        me.modules.ui.slaveFrames[index].style.width = mainFrameWidthSmall + 'px';
                                    }
                                } catch (e) {}
                            });
                        } else if (uiType === 'popup') {
                            try {
                                me.modules.ui.mainFrameWindow.resizeTo(1,1);
                            } catch (e) {}
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthBig + 'px';
                                me.modules.ui.workerFrame.style.left = (windowWidth - workerFrameWidthBig - 5) + 'px';
                            } catch (e) {}
                        } else if (uiType === 'clean') {
                            try {
                                window.resizeTo(cleanUIRootWindowSize.width,cleanUIRootWindowSize.height);
                                window.moveTo(0, 0);
                            } catch (e) {}
                        }
                    } else if (currentWorkerFrameSize === 'small') {
                        if (uiType === 'framed') {
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthSmall + 'px';
                                me.modules.ui.workerFrame.style.left = mainFrameWidthBig + 'px';
                            } catch (e) {}
                            me.modules.ui.mainFrames.filter(function(mainFrame, index) {
                                try {
                                    mainFrame.style.width = mainFrameWidthBig + 'px';
                                    if (index > 0 && me.modules.ui.slaveFrames[index]) {
                                        me.modules.ui.slaveFrames[index].style.width = mainFrameWidthBig + 'px';
                                    }
                                } catch (e) {}
                            });
                        } else if (uiType === 'popup') {
                            try {
                                me.modules.ui.mainFrameWindow.resizeTo(Math.round(outerWidth*0.8 - 10), Math.round(outerHeight));
                            } catch (e) {}
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthSmall + 'px';
                                me.modules.ui.workerFrame.style.left = (windowWidth - workerFrameWidthSmall - 5) + 'px';
                            } catch (e) {}
                        } else {
                            try {
                                window.resizeTo(Math.floor(cleanUIRootWindowSize.width * 0.2), cleanUIRootWindowSize.height);
                                window.moveTo(Math.floor(cleanUIRootWindowSize.width * 0.8), 0);
                            } catch (e) {}
                        }
                    }
            })();
            currentWindowDimensions.width = windowWidth;
            currentWindowDimensions.height = windowHeight;
            currentWindowDimensions.outerWidth = outerWidth;
            currentWindowDimensions.outerHeight = outerHeight;
            currentWindowDimensions.workerFrameSize = currentWorkerFrameSize;
            me.modules.ui.drawnMainFrameWindow = me.modules.ui.currentMainFrameWindow;
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
        div.className = overlayClassName + ' ' + overlayClassName + 'highlight';
        div.onclick = function(){me.modules.ui.clearOverlaysAndReflect();};
        var messageDiv = getDocument().getElementsByClassName('cartFillerOverlayDivmessage');
        if (messageDiv.length) {
            getDocument().getElementsByTagName('body')[0].insertBefore(div, messageDiv[0]);
        } else {
            getDocument().getElementsByTagName('body')[0].appendChild(div);
        }

    };

    /**
     * Returns src for worker (job progress) frame
     * @function CartFiller.UI~getWorkerFramSrc
     * @returns {String}
     * @access private
     */
    var getWorkerFrameSrc = function(){
        return me['data-wfu'] ? me['data-wfu'] : (me.baseUrl + '/index' + (me.concatenated ? '' : (/\/src$/.test(me.baseUrl) ? '' : '.uncompressed')) + '.html' + (me.gruntBuildTimeStamp ? ('?' + me.gruntBuildTimeStamp) : ''));
    };
    /**
     * Returns z-index for overlay divs. 
     * @function {integer} CartFiller.UI~getZIndexForOverlay
     * @access private
     */
    var getZIndexForOverlay = function(){
        return 2147483647; // TBD look for max zIndex used in the main frame
    };
    // Launch arrowToFunction
    setInterval(arrowToFunction, 200);
    var discoverPathForElement = function(window, soFar) {
        soFar = soFar || [];
        if (window === me.modules.ui.mainFrameWindow) {
            return soFar;
        }
        var parent = window.parent;
        for (var i = 0; i < parent.frames.length && window !== parent.frames[i]; i ++) {}
        soFar.unshift(i);
        discoverPathForElement(parent, soFar);
        // let's see if we should track iframe ourselves
        try {
            parent.location.href;
            // we can
            var iframes = parent.document.getElementsByTagName('iframe');
            for (i = iframes.length - 1 ; i >= 0 ; i --) {
                if (iframes[i].contentWindow === window) {
                    me.modules.ui.addElementToTrack('iframe', iframes[i], true, [i]);
                }
            }
        } catch(e) {}
        return soFar;
    };
    
    var setMainFrameWindow = function(index) {
        index = index || 0;
        me.modules.ui.currentMainFrameWindow = index;
        me.modules.ui.mainFrameWindow = me.modules.ui.mainFrameWindows[0]; // always set to first
        if (uiType === 'framed') {
            // adjust borders
            if (me.modules.ui.mainFrames && me.modules.ui.mainFrames.length > 1) {
                for (var i = me.modules.ui.mainFrames.length - 1 ; i >= 0; i --) {
                    var frame = me.modules.ui.mainFrames[i];
                    frame.style.borderWidth = '5px';
                    if (i === index) {
                        frame.style.borderColor = 'red';
                    } else {
                        frame.style.borderColor = 'transparent';
                    }
                }
            } else {
                me.modules.ui.mainFrames[0].style.borderWidth = '0px';
            }
        }
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
            if (show && !chooseJobFrameLoaded) {
                // load choose job frame now
                if ((0 === me['data-choose-job'].indexOf('#')) && (me.localIndexHtml)) {
                    this.chooseJobFrameWindow.document.write(me.localIndexHtml.replace(/data-local-href=""/, 'data-local-href="' + me['data-choose-job'] + '"'));
                } else {
                    this.chooseJobFrameWindow.location.href = me['data-choose-job'];
                }
                chooseJobFrameLoaded = true;
            }
            this.chooseJobFrame.style.display = show ? 'block' : 'none';
            if (uiType === 'clean') {
                this.setSize(show ? 'big' : 'small');
            }
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
            if (prepareToClearOverlays) {
                this.clearOverlaysAndReflect(true);
            }
            messageToSay = '';
            var i;
            var added = false;

            if (null !== element && 'object' === typeof element && (('string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each) || (element instanceof me.modules.api.getSelectorClass()))){
                element.each(function(i,el){
                    me.modules.ui.addElementToTrack('highlight', el);
                    added = true;
                    if (!allElements) {
                        return false;
                    }
                });
            } else if (element instanceof Array) {
                for (i = element.length -1 ; i >= 0 ; i --){
                    this.addElementToTrack('highlight', element[i]);
                    added = true;
                    if (true !== allElements) {
                        break;
                    }
                }
            } else if (undefined !== element) {
                this.addElementToTrack('highlight', element);
                added = true;
            }
            if (added > 0 && me.modules.dispatcher.haveAccess()) {
                var body = this.mainFrameWindow.document.getElementsByTagName('body')[0];
                body.style.paddingBottom = getInnerHeight() + 'px';
            }
        },
        /**
         * Draw arrow to element(s). 
         * Parameters are same as for {@link CartFiller.UI#highlight}
         * @function CartFiller.UI#arrowTo
         * @access public
         */
        arrowTo: function(element, allElements, noScroll){
            if (prepareToClearOverlays) {
                this.clearOverlaysAndReflect(true);
            }
            if (null !== element && 'object' === typeof element && (('string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each) || (element instanceof me.modules.api.getSelectorClass()))){
                element.each(function(i,el){
                    me.modules.ui.addElementToTrack('arrow', el, noScroll);
                    if (!allElements) {
                        return false;
                    }
                    noScroll = true; // only scroll to first found element;
                });
            } else if (element instanceof Array) {
                for (var i = 0; i < element.length; i++){
                    this.addElementToTrack('arrow', element[i], noScroll);
                    if (!allElements) {
                        break;
                    }
                    noScroll = true; // only scroll to first found element;
                }
            } else if (undefined !== element) {
                this.addElementToTrack('arrow', element, noScroll);
            }
        },
        /**
         * Displays comment message over the overlay in the main frame
         * @function CartFiller.UI#say
         * @param {String} text
         * @param {boolean} pre
         * @param {String|undefined} nextButton
         * @param {boolean} html if set to true then text will be put into innerHtml of wrapper div
         * @param {Function} callback if set then will be called each time div is drawn
         * @access public
         */
        say: function(text, pre, nextButton, html, callback){
            messageToSay = (undefined === text || null === text) ? '' : text;
            messageToSayOptions.nextButton = nextButton;
            messageToSayOptions.html = html;
            messageToSayOptions.callback = callback;
            wrapMessageToSayWithPre = pre;
            currentMessageDivWidth = Math.max(100, Math.round(getInnerWidth() * 0.5));
            currentMessageDivTopShift = 0;
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
            if (adjustMessageDivTimeout) {
                clearTimeout(adjustMessageDivTimeout);
            }
            adjustMessageDivTimeout = setTimeout(function adjustMessageDivTimeoutFn(){
                var ok = true;
                if (messageAdjustmentRemainingAttempts > 0){
                    if (! div.parentNode) {
                        setTimeout(adjustMessageDivTimeoutFn, 100);
                        return;
                    }
                    ok = false;
                    var rect = div.getBoundingClientRect();
                    if (rect.bottom > ui.mainFrameWindow.innerHeight || (rect.width - 20) < div.scrollWidth){
                        if (rect.width > 0.95 * ui.mainFrameWindow.innerWidth && rect.bottom > ui.mainFrameWindow.innerHeight){
                            currentMessageDivTopShift += Math.min(rect.top, rect.bottom - ui.mainFrameWindow.innerHeight);
                        } else {
                            // let's make div wider
                            currentMessageDivWidth = Math.min(
                                ui.mainFrameWindow.innerWidth - 60, 
                                (
                                    parseInt(div.style.width.replace('px', '')) +
                                    Math.round(ui.mainFrameWindow.innerWidth * 0.4)
                                )
                            );
                        }
                    } else {
                        // that's ok 
                        ok = true;
                    }
                    if (ok){
                        div.style.opacity = '1';
                        messageAdjustmentRemainingAttempts = 0;
                        adjustMessageDivTimeout = false;
                    } else {
                        messageAdjustmentRemainingAttempts --;
                        adjustMessageDivTimeout = setTimeout(adjustMessageDivTimeoutFn, 10);
                    }
                } else {
                    messageAdjustmentRemainingAttempts = 0;
                    div.style.opacity = '1';
                    adjustMessageDivTimeout = false;
                }
                scrollIfNecessary();
            },0);
            currentMessageOnScreen = messageToSay;
            
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
            uiType = 'popup';
            this.mainFrameWindows = [
                window.open(window.location.href, '_blank', 'resizable=1, height=1, width=1, scrollbars=1')
            ];
            setMainFrameWindow();
            this.mainFrameWindow = this.mainFrameWindows[0];
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
            this.workerFrame.style.zIndex = 2147483647;
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            if (me.localIndexHtml) {
                this.workerFrameWindow.document.write(me.localIndexHtml);
            } else {
                this.workerFrameWindow.location.href = getWorkerFrameSrc();
            }

            this.chooseJobFrame = window.document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.position='fixed';
            this.chooseJobFrame.style.height = '0px';
            this.chooseJobFrame.style.top = '0px';
            this.chooseJobFrame.style.left = '0px';
            this.chooseJobFrame.style.width = '0px';
            this.chooseJobFrame.style.zIndex = 2147483647;
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
            uiType = 'framed';
            me.modules.dispatcher.init();
            var body = document.getElementsByTagName('body')[0];
            var mainFrameSrc = window.location.href;

            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            this.mainFrames = [document.createElement('iframe')];
            this.mainFrames[0].setAttribute('name', mainFrameName + '-0');
            this.mainFrames[0].style.height = '0px';
            this.mainFrames[0].style.position = 'fixed';
            this.mainFrames[0].style.left = '0px';
            this.mainFrames[0].style.top = '0px';
            this.mainFrames[0].style.borderWidth = '0px';
            this.slaveFrames = [undefined];
            this.slaveFramesWindows = [undefined];
            this.slaveFramesHelperWindows = {};

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
            this.chooseJobFrame.style.zIndex = 2147483647;
            body.appendChild(this.mainFrames[0]);
            this.mainFrameWindows = [window.frames[mainFrameName + '-0']];
            setMainFrameWindow();

            me.modules.dispatcher.registerLoadWatcher();
            this.mainFrameWindow.location.href=mainFrameSrc;
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            if (me.localIndexHtml) {
                this.workerFrameWindow.document.write(me.localIndexHtml);
            } else {
                this.workerFrameWindow.location.href = getWorkerFrameSrc();
            }
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentWorkerFrameSize === 'big') ? 'small' : 'big';
                }
                currentWorkerFrameSize = size;
                adjustFrameCoordinates();
            };

            this.setSize('small');
            // Launch adjustFrameCoordinates
            setInterval(adjustFrameCoordinates, 2000);
        },
        /**
         * Starts Clean type UI
         * @function CartFiller.UI#clean
         * @param {Document} document Document where we are at the moment of injecting
         * @param {Window} window Window, that we are at the moment of injecting
         * @access public
         */
        clean: function(document, window) {
            uiType = 'clean';
            window.document.title = this.rootWindowTitle();
            cleanUIRootWindowSize = {
                width: window.opener && ((window.opener.screen && window.opener.screen.availWidth || window.opener.screen.width) || window.opener.outerWidth || window.opener.innerWidth),
                height: window.opener && ((window.opener.screen && window.opener.screen.availHeight || window.opener.screen.height) || window.opener.outerHeight || window.opener.innerHeight) 
            };
            me.modules.dispatcher.setMainFrameLoaded();
            me.modules.dispatcher.init();
            this.mainFrameWindows = [
                window.opener
            ];
            setMainFrameWindow();
            this.mainFrameWindow = this.mainFrameWindows[0];
            this.closePopup = function(){
            };
            this.focusMainFrameWindow = function(){
            };
            me.modules.dispatcher.registerLoadWatcher();

            var body = window.document.getElementsByTagName('body')[0];
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
            this.workerFrame.style.left = '0px';
            this.workerFrame.style.height = '100%';
            this.workerFrame.style.width = '100%';
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            if (me.localIndexHtml) {
                this.workerFrameWindow.document.write(me.localIndexHtml);
            } else {
                this.workerFrameWindow.location.href = getWorkerFrameSrc();
            }

            this.chooseJobFrame = window.document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.position='fixed';
            this.chooseJobFrame.style.height = '0px';
            this.chooseJobFrame.style.top = '0px';
            this.chooseJobFrame.style.left = '0px';
            this.chooseJobFrame.style.width = '0px';
            this.chooseJobFrame.style.zIndex = 2147483647;
            this.chooseJobFrame.style.background = 'white';
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];
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
         * ////
         */
        reportingMousePointerClick: function(x, y, mainFrameWindowIndex, frameLeft, frameTop) {
            // let's see whether it comes to our frame or not
            if (mainFrameWindowIndex === undefined) {
                var frame = window.document.elementFromPoint(x,y);
                if (frame) {
                    var match = /^cartFillerMainFrame-(\d+)$/.exec(frame.getAttribute('name'));
                    if (match) {
                        mainFrameWindowIndex = parseInt(match[1]);
                    }
                }
            }
            if (mainFrameWindowIndex !== undefined) {
                if (mainFrameWindowIndex !== me.modules.dispatcher.getFrameWindowIndex()) {
                    me.modules.dispatcher.onMessage_bubbleRelayMessage({
                        message: 'reportingMousePointerClickForWindow',
                        currentMainFrameWindow: mainFrameWindowIndex,
                        x: x - frameLeft,
                        y: y - frameTop
                    });
                } else {
                    this.reportingMousePointerClickForWindow(x, y);
                }
                return;
            }
            me.modules.dispatcher.postMessageToWorker('mousePointer', {x: x, y: y, stack: [], w: me.modules.dispatcher.getFrameWindowIndex()});
        },
        reportingMousePointerClickForWindow: function(x, y) {
            var el = me.modules.ui.mainFrameWindow.document.elementFromPoint(x,y);
            me.modules.ui.reportingMousePointerClickForElement(el);
        },
        reportingMousePointerClickForElement: function(el, notFinal) {
            var stack = [];
            me.modules.ui.clearOverlaysAndReflect();
            me.modules.ui.arrowTo(el, true, true);
            var prev, next;
            var i, j, n;
            if (el.nodeName === 'SELECT') {
                // we'd rather report an option for this select, this way user can 
                // build selector for either select element or an option - whichever he likes
                var selectChildren = el.childNodes;
                for (i = selectChildren.length - 1; i >=0 ; i --) {
                    if (selectChildren[i].nodeName === 'OPTION' && selectChildren[i].selected) {
                        el = selectChildren[i]; 
                        break;
                    }
                }
            }
            var libSelectors = me.modules.cf.getLibSelectors();
            var matchedSelectors = {};
            while (el && el.nodeName !== 'BODY' && el.nodeName !== 'HTML' && el !== document) {
                for (i in libSelectors) {
                    for (n = 0; n < libSelectors[i].length; n ++ ) {
                        if (libSelectors[i][n] === el) {
                            matchedSelectors[i] = libSelectors[i];
                            delete libSelectors[i];
                            break;
                        }
                    }
                }
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
                for (next = el, j = 0; next; next = next.nextElementSibling) {
                    if (next.nodeName === el.nodeName) {
                        j++;
                    }
                }
                stack.unshift({
                    element: el.nodeName.toLowerCase(), 
                    lib: undefined,
                    attrs: attrs, 
                    classes: ('string' === typeof el.className) ? el.className.split(' ').filter(function(v){return v;}) : [], 
                    id: 'string' === typeof el.id ? el.id : undefined, 
                    index: i,
                    indexOf: i + j - 1,
                    text: String(el.textContent).length < 200 ? String(el.textContent) : ''
                });
                el = el.parentNode;
            }
            for (i in matchedSelectors) {
                stack.unshift({
                    element: undefined, 
                    lib: i,
                    attrs: [],
                    classes: [], 
                    id: undefined, 
                    index: 0,
                    text: ''
                });
            }
            me.modules.dispatcher.postMessageToWorker('mousePointer', {stack: stack, w: me.modules.dispatcher.getFrameWindowIndex(), notFinal: notFinal});
        },
        startReportingMousePointerDirect: function() {
            var trackingDocument = getDocument();
            var elements = [];
            var done = false;
            var hoveredElement = false;
            var highlightedElement = false;
            var shoot = function() {
                done = true;
                for (var i = 0; i < elements.length; i ++) {
                    elements[i].removeEventListener('mousemove', moveListener, true);
                    elements[i].removeEventListener('mouseenter', moveListener, true);
                    elements[i].removeEventListener('mouseleave', leaveListener, true);
                }
            };
            var moveListener = function(event) { 
                if (! done) {
                    if (event.shiftKey) {
                        me.modules.ui.reportingMousePointerClickForElement(event.target);
                        shoot();
                    } else {
                        hoveredElement = event.target;
                    }
                }
            };
            var leaveListener = function(event) { 
                if (! done && event.shiftKey) {
                    me.modules.ui.reportingMousePointerClickForElement(event.target);
                    shoot();
                }
            };
            function addElements() {
                if (! done) {
                    if (hoveredElement && hoveredElement !== highlightedElement) {
                        me.modules.ui.reportingMousePointerClickForElement(hoveredElement, true);
                        highlightedElement = hoveredElement;
                    }
                    var discovered = trackingDocument.getElementsByTagName('body')[0].getElementsByTagName('*');
                    for (var i = 0; i < discovered.length; i ++) {
                        if (-1 === elements.indexOf(discovered[i])) {
                            elements.push(discovered[i]);
                            discovered[i].addEventListener('mousemove', moveListener, true);
                            discovered[i].addEventListener('mouseenter', moveListener, true);
                            discovered[i].addEventListener('mouseleave', leaveListener, true);
                        }
                    }
                    setTimeout(addElements, 100);
                }
            }
            addElements();
        },
        /**
         * Starts reporting mouse pointer - on each mousemove dispatcher 
         * will send worker frame a message with details about element
         * over which mouse is now
         * @function CartFiller.UI#startReportingMousePointer
         * @access public
         */
        startReportingMousePointer: function(details, shoot) {
            try {
                me.modules.ui.clearOverlaysAndReflect();
            } catch (e) {}
            if (details.direct) {
                if (details.delay && ! shoot) {
                    setTimeout(function(){
                        me.modules.ui.startReportingMousePointerDirect(details);
                        me.modules.dispatcher.postMessageToWorker('mousePointer', {autoshootReady: true});
                    }, 5000);
                    return;
                } else {
                    return this.startReportingMousePointerDirect(details);
                }
            }
            if (details.delay && ! shoot) {
                setTimeout(function(){
                    me.modules.ui.startReportingMousePointer(true, true);
                    me.modules.dispatcher.postMessageToWorker('mousePointer', {autoshootReady: true});
                }, 5000);
                return;
            }
            if (! reportMousePointer) {
                var trackingDocument = uiType === 'framed' ? document : getDocument();
                var div = trackingDocument.createElement('div');
                div.style.height = window.innerHeight + 'px';
                div.style.width = window.innerWidth + 'px';
                div.zindex = 2147483647;
                div.style.position = 'absolute';
                div.style.left = '0px';
                div.style.top = '0px';
                div.style.backgroundColor = 'transparent';
                trackingDocument.getElementsByTagName('body')[0].appendChild(div);
                reportMousePointer = div;
                var x,y;
                var remove = function() {
                    trackingDocument.getElementsByTagName('body')[0].removeChild(reportMousePointer);
                };
                var shootFn = function() {
                    var windowIndex = 0;
                    var frameRect = {left: 0, top: 0};
                    reportMousePointer = false;
                    if (uiType === 'framed') {
                        var frame = trackingDocument.elementFromPoint(x,y);
                        if (frame) {
                            var match = /^cartFillerMainFrame-(\d+)$/.exec(frame.getAttribute('name'));
                            if (match) {
                                windowIndex = parseInt(match[1]);
                            }
                        }
                        frameRect = frame.getBoundingClientRect();
                        if (me.modules.dispatcher.reflectMessage({cmd: 'reportingMousePointerClick', x: x, y: y, w: windowIndex, ft: frameRect.top, fl: frameRect.left})) {
                            return;
                        }
                    }
                    me.modules.ui.reportingMousePointerClick(x, y, windowIndex, frameRect.left, frameRect.top);
                };
                div.addEventListener('mousemove', function(event) {
                    x = event.clientX;
                    y = event.clientY;
                    if (details.delay) {
                        me.modules.dispatcher.postMessageToWorker('mousePointer', {autoshootCaptured: true});
                        remove();
                        setTimeout(function() {
                            shootFn();
                        }, 5000);
                    }
                },false);
                div.addEventListener('click', function(event) {
                    x = x || event.clientX;
                    y = y || event.clientY;
                    remove();
                    shootFn();
                });
            }
        },
        /**
         * Sets and resets time to time handler for onbeforeunload
         * @function CartFiller.UI#preventPageReload
         * @access public
         */
        preventPageReload: function(){
            if (uiType !== 'clean') {
                setInterval(function() {
                    window.onbeforeunload=function() {
                        setTimeout(function(){
                            me.modules.ui.mainFrameWindow.location.reload();
                        },0);
                        return 'This will cause CartFiller to reload. Choose not to reload if you want just to refresh the main frame.';
                    };
                },2000);
            }
        },
        /**
         * Getter for messageToSay
         * @function CartFiller.UI#getMessageToSay
         * @return {String}
         * @access public
         */
        getMessageToSay: function() {
            return messageToSay;
        },
        highlightElementForQueryBuilder: function(details) {
            this.clearOverlays();
            if (details.path) {
                var path = details.path;
                var element = this.mainFrameWindow.document.getElementsByTagName('body')[0];
                for (var i = 0; i < path.length; i ++  ) {
                    var name = path[i][0];
                    var len = element.children.length;
                    for (var j = 0; j < len; j ++ ) {
                        if (element.children[j].nodeName.toLowerCase() === name) {
                            if (path[i][1]) {
                                path[i][1] --;
                            } else {
                                element = element.children[j];
                                name = false;
                                break;
                            }
                        }
                    }
                    if (name) {
                        // not found
                        return;
                    }
                }
                this.arrowTo(element, false, true);
            } else if (details.lib) {
                this.arrowTo(me.modules.cf.getlib(details.lib), true, true);
            }
        },
        prepareTolearOverlaysAndReflect: function() {
            me.log();
            me.modules.dispatcher.onMessage_bubbleRelayMessage({
                message: 'prepareToClearOverlays'
            });
        },
        prepareToClearOverlays: function() {
            me.log();
            prepareToClearOverlays = true;
            messageToSay = '';
            if (me.modules.dispatcher.haveAccess()) {
                drawMessage();
            }
        },
        clearOverlaysAndReflect: function(ignoreNextButton) {
            me.log();
            if (! ignoreNextButton && messageToSayOptions.nextButton) {
                me.modules.api.result();
                messageToSayOptions.nextButton = false;
            }
            me.modules.dispatcher.onMessage_bubbleRelayMessage({
                message: 'clearOverlays'
            });
        },
        clearOverlays: function() {
            me.log();
            prepareToClearOverlays = false;
            elementsToTrack = elementsToTrack
                .filter(function(e) { 
                    return e.type === 'iframe' && ! e.isOld; 
                })
                .map(function(e) { 
                    e.isOld = true;
                    return e;
                });
            elementsToDrawByPath = {};
            messageToSay = '';
            if (me.modules.dispatcher.haveAccess()) {
                drawArrows();
                drawHighlights();
                drawMessage();
            }
        },
        drawOverlays: function(details) {
            me.log(details);
            var framesUpdated = false, path;
            for (path in details.iframesByPath) {
                trackedIframes[path] = details.iframesByPath[path][0];
                framesUpdated = true;
            }
            for (path in details.elementsByPath) {
                elementsToDrawByPath[path] = details.elementsByPath[path];
            }
            if (me.modules.dispatcher.haveAccess()) {
                // we are going to draw on this page
                if (details.rebuild.arrow || framesUpdated) {
                    drawArrows();
                }
                if (details.rebuild.highlight || framesUpdated) {
                    drawHighlights();
                }
                if (details.rebuild.message || framesUpdated) {
                    messageToDraw = details.messageToSay;
                    drawMessage();
                }
            }
        },
        drawOverlaysAndReflect: function(details) {
            me.log();
            details.message = 'drawOverlays';
            me.modules.dispatcher.onMessage_bubbleRelayMessage(details);
        },
        tellWhatYouHaveToDraw: function() {
            me.log();
            arrowToFunction();
        },
        addElementToTrack: function(type, element, noScroll, addPath) {
            me.log(type, noScroll, addPath);
            elementsToTrack.push({
                element: element, 
                type: type, 
                scroll: ! noScroll, 
                path: discoverPathForElement(element.ownerDocument.defaultView, addPath),
                ts: (new Date()).getTime(),
                currentMainFrameWindow: me.modules.dispatcher.getFrameWindowIndex()
            });
            if (! noScroll) {
                element.scrollIntoView();
            }
        },
        getMainFrameWindow: function() {
            return me.modules.ui.mainFrameWindow;
        },
        getMainFrameWindowDocument: function(overrideWindow) {
            overrideWindow = overrideWindow || this.getMainFrameWindow();
            var mainFrameWindowDocument;
            try { mainFrameWindowDocument = overrideWindow.document; } catch (e) {}
            return mainFrameWindowDocument;
        },
        setAdditionalWindows: function(descriptors, noResultCall) {
            if (uiType !== 'framed') {
                if (descriptors && descriptors.length) {
                    throw new Error('this function is only availabled in framed mode');
                }
                return;
            }
            for (var i = this.mainFrames.length - 1; i >= 1; i --) {
                this.mainFrames[i].parentNode.removeChild(this.mainFrames[i]);
                if (this.slaveFrames[i]) {
                    this.slaveFrames[i].parentNode.removeChild(this.slaveFrames[i]);
                }
            }
            this.mainFrames.splice(1);
            this.slaveFrames.splice(1);
            this.mainFrameWindows.splice(1);
            me.modules.dispatcher.resetRelays();
            var body = document.getElementsByTagName('body')[0];
            var currentSlavesLoaded = -1;
            var waitForNextSlaveToLoad = function() {
                return me.modules.dispatcher.getSlaveCounter() === currentSlavesLoaded + 1;
            };
            var actWhenWaitForFinished = function(result) {
                if (! result) {
                    me.modules.api.result('Unable to load slave');
                } else {
                    currentSlavesLoaded ++;
                    if (currentSlavesLoaded === descriptors.length) {
                        me.modules.api.result();
                    } else {
                        me.modules.ui.slaveFramesWindows[currentSlavesLoaded + 1] = me.modules.ui.slaveFrames[currentSlavesLoaded + 1].contentWindow;
                        me.modules.ui.slaveFramesWindows[currentSlavesLoaded + 1].location.href = descriptors[currentSlavesLoaded].slave + '#launchSlaveInFrame';
                        var next = function() {   
                            me.modules.api.waitFor(waitForNextSlaveToLoad, actWhenWaitForFinished, 300000);
                        };
                        if (descriptors[currentSlavesLoaded].withHelper) {
                            if (! me.modules.ui.slaveFramesHelperWindows[getDomain(descriptors[currentSlavesLoaded].slave)]) {
                                me.modules.dispatcher.openPopup(
                                    {
                                        url: descriptors[currentSlavesLoaded].slave
                                    }, 
                                    function(w) {
                                        me.modules.ui.slaveFramesHelperWindows[getDomain(descriptors[currentSlavesLoaded].slave)] = {w: w, i: currentSlavesLoaded + 1};
                                        next();
                                    }
                                );
                            } else {
                                // we already have such window
                                me.modules.ui.slaveFramesHelperWindows[getDomain(descriptors[currentSlavesLoaded].slave)].i = currentSlavesLoaded + 1;
                                me.modules.ui.slaveFramesHelperWindows[getDomain(descriptors[currentSlavesLoaded].slave)].w.postMessage('cartFillerMessage:{"cmd":"actAsSlaveHelper","slaveIndex":' + (currentSlavesLoaded + 1) + '}', '*');
                                next();
                            }
                        } else {
                            next();
                        }
                    }
                }
            };
            // now let's create additional windows
            for (i = 1; i <= descriptors.length; i ++){
                var mainFrame = document.createElement('iframe');
                mainFrame.setAttribute('name', mainFrameName + '-' + i);
                mainFrame.style.height = '0px';
                mainFrame.style.position = 'fixed';
                mainFrame.style.left = '0px';
                mainFrame.style.top = '0px';
                mainFrame.style.borderWidth = '0px';
                this.mainFrames[i] = mainFrame;

                body.appendChild(mainFrame);
                this.mainFrameWindows[i] = window.frames[mainFrameName + '-' + i];
                this.mainFrameWindows[i].location.href = descriptors[i-1].url;

                var slaveFrame = document.createElement('iframe');
                slaveFrame.setAttribute('name', mainFrameName + '-s' + i);
                slaveFrame.style.height = '0px';
                slaveFrame.style.position = 'fixed';
                slaveFrame.style.left = '0px';
                slaveFrame.style.top = '0px';
                slaveFrame.style.borderWidth = '1px';
                slaveFrame.style.borderColor = '#ccc';
                this.slaveFrames[i] = slaveFrame;

                body.appendChild(slaveFrame);
            }
            setMainFrameWindow();
            adjustFrameCoordinates(true);
            if (! noResultCall) {
                actWhenWaitForFinished(true);
            }
        },
        switchToWindow: function(index) {
            setMainFrameWindow(index);
        },
        checkAndUpdateCurrentUrl: function() {
            try {
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
            } catch(e) {}
        },
        isMessageStable: function() { 
            return messageAdjustmentRemainingAttempts === 0;
        },
        rootWindowTitle: function() {
            return uiType === 'clean' ? 'CartFiller Dashboard' : undefined;
        },
        closeCartFiller: function() {
            if (uiType === 'clean') {
                window.close();
            }
        }
    });
}).call(this, document, window);

// this file is used as a footer when concatenating inject scripts. It is not valid as standalone.
/* jshint ignore:start */
}).call({
    cartFillerConfiguration:{},
    cartFillerEval:this.cartFillerEval
});}).call(this);
/* jshint ignore:end */
