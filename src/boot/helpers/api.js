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
    Selector.prototype.exists = function(comment, recoverable) {
        if (undefined === comment) {
            comment = 'element(s) not found: ' + this.description;
        }
        me.modules.api.arrow(this, true).result(this.length > 0 ? '' : comment, recoverable);
        return this;
    };
    Selector.prototype.exactly = function(number, comment) {
        if (undefined === comment) {
            comment = 'element(s) not found: ' + this.description;
        }
        me.modules.api.arrow(this, true).result(this.length === parseInt(number) ? '' : comment);
        return this;
    };
    Selector.prototype.absent = function(comment, recoverable) {
        if (undefined === comment) {
            comment = 'element(s) should not exist, but they are: ' + this.description;
        }
        me.modules.api.arrow(this, true).result(this.length > 0 ? comment : '', recoverable);
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
        },
        triggerMouseEvent: function(element, type) {
            return triggerMouseEvent(element, type);
        }
    });
}).call(this, document, window);
