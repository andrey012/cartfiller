/*
 *  cartFiller - v0.0.1
 *  Tool for automating cart filling process when doing big purchases
 *  https://andrey012.github.com/cartFiller
 *
 *  Made by Andrey Grinenko
 *  Under MIT License
 */
/**
 * The jQuery core object
 * @external jQuery
 * @see {@link http://api.jquery.com/jQuery/}
 */

/**
 * The jQuery plugin namespace.
 * @external "jQuery.fn"
 * @name "jQuery.fn"
 * @memberof external jQuery
 * @see {@link http://learn.jquery.com/plugins/|jQuery Plugins}
 */

/** @namespace CartFillerPlugin */

;(function ( $, window, document, undefined ) {

    'use strict';
    /**
     * @constant {string}
     * @default
     */
    var pluginName = 'cartFillerPlugin';

    /**
     * Set to true if plugin receives hello message from
     * {@link CartFiller.Dispatcher}, which means, that page, where this
     * plugin is included is launched as ChooseJob frame from CartFiller
     * @var {boolean} CartFillerPlugin~runningInsideCartFiller
     * @access private
     */
    var runningInsideCartFiller = false;
    
    /**
     * This array is populated with bookmarklet elements, so, that if
     * we receive hello message from {@link CartFiller.Dispatcher}, 
     * we can hide bookmarklets
     * @var {HtmlElement[]} CartFillerPlugin~knownBookmarkletElements
     * @access private
     */
    var knownBookmarkletElements = [];

    /**
     * @class CartFillerPlugin~Settings
     */
    var defaults = {
        /**
         * Choose Job URL
         * @member {string} CartFillerPlugin~Settings#chooseJob
         */
        chooseJob: '',
        /**
         * Base URL to cartFiller files
         * @member {string} CartFillerPlugin~Settings#baseUrl
         */
        baseUrl: '',
        /**
         * Injection method. Either 'script', 'eval' or 'iframe'
         * @member {string} CartFillerPlugin~Settings#inject
         * @default 'eval'
         */
        inject: 'script',
        /**
         * Whether to use minified version or not
         * @member {boolean} CartFillerPlugin~Settings#minified
         * @default true
         */
        minified: true,
        /**
         * Type of UI - either 'framed' or 'popup'
         * @member {string} CartFillerPlugin~Settings#type
         * @default 'framed'
         */
        type: 'framed',
        /**
         * Turn on debug features
         * @member {boolean} CartFillerPlugin~Settings#debug
         * @default false
         */
        debug: false,
        /**
         * Override URL of worker script
         * @member {string} CartFillerPlugin~Settings#worker
         * @default 'Ok'
         */
        worker: '',
        /**
         * Injects an alert for each step into the bookmarklet to troubleshoot
         * @member {boolean} CartFillerPlugin~Settings#traceStartup
         * @default false
         */
        traceStartup: false,
        /**
         * If set to true, then lengths of bookmarklets will be logged to console
         * @member {boolean} CartFillerPlugin~Settings#logLength
         * @default false
         */
        logLength: false,
        /**
         * If set to true, then source files will be loaded instead of 
         * concatenated/minified single file. Used for development
         * @member {boolean} CartFillerPlugin~Settings#useSource
         * @default false
         */
        useSource: false
    };

    /**
     * @class CartFillerPlugin~Plugin
     * @access private
     */
    function Plugin ( element, options ) {
        this.element = element;
        this.settings = $.extend( {}, defaults, options );
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
    }
    

    $.extend(Plugin.prototype, {
        /**
         * Adds href attribute to an element
         * @function ParseTablePlugin~Plugin#init
         * @access private
         */
        init: function () {
            if (runningInsideCartFiller){
                $(this.element).hide();
            } else {
                var href;
                if (this.settings.inject === 'script'){
                    href = this.scriptBookmarklet();
                } else if (this.settings.inject === 'eval'){
                    href = this.evalBookmarklet();
                } else if (this.settings.inject === 'iframe'){
                    href = this.iframeBookmarklet();
                } else {
                    alert('invalid inject value, correct values are "script", "eval" and "iframe"');
                }
                if (this.settings.logLength) {
                    console.log('generated bookmarklet: ' + href.length);
                }
                $(this.element).attr('href', href);
                knownBookmarkletElements.push(this.element);
            }
        },
        getTypeId: function(){
            if (this.settings.type === 'framed'){
                return 0;
            } else if (this.settings.type === 'popup'){
                return 1;
            } else {
                alert('type not set or invalid, should be either "framed" or "popup"');
                return 0;
            }
        },
        getInjectUrl: function(){
            var script;
            if (this.settings.minified){
                script = 'inject.min.js';
            } else {
                script = 'inject.js';
            }
            return (this.settings.useSource ? '/boot/' : '/') + script;
        },
        getIframeUrl: function(){
            return (this.settings.useSource ? '/boot/' : '/') + 'i.htm';
        },
        trace: function(msg){
            if (this.settings.traceStartup){
                return 'alert(\'' + msg + '\');';
            } else {
                return '';
            }
        },
        scriptBookmarklet: function(){
            return this.javaScriptUrl() + 'try{' +
                this.trace('start') + 
                '(function(d,c,a,t,o,b,e,u,v,j,k,x,y,w,z,s){' + 
                    this.trace('in function') +
                    's=d.createElement(\'script\');' + 
                    this.trace('script element created') +
                    's[a](c+t,o);' +
                    this.trace('type set') +
                    's[a](c+b,e);' + 
                    this.trace('base-url set') +
                    's[a](u,e+v+\'?\'+(new Date()).getTime());' + 
                    this.trace('src set') +
                    's[a](c+j,k);' +
                    this.trace('choose-job set') +
                    'if(x)s[a](c+x,y);' + 
                    this.trace('debug set') +
                    'if(w)s[a](c+w,z);' + 
                    this.trace('worker set') +
                    's.onerror=function(){alert(\'error\');};' +
                    this.trace('onerror set') +
                    'd.getElementsByTagName(\'head\')[0].appendChild(s);' +
                    this.trace('script element added') +
                '})(' +
                    'document,' +
                    '\'data-\',' +
                    '\'setAttribute\',' +
                    '\'type\',' + this.getTypeId() + ',' +
                    '\'base-url\',\'' + this.settings.baseUrl + '\',' +
                    '\'src\',\'' + this.getInjectUrl() + '\',' +
                    '\'choose-job\',\'' + this.settings.chooseJob + '\',' +
                    '\'debug\',' + (this.settings.debug ? 1: 0) + ',' +
                    '\'worker\',\'' + (this.settings.worker) + '\'' +
                ');' +
            '}catch(e){alert(e);}';
        },
        evalBookmarklet: function(){
            return this.javaScriptUrl() + 'try{' +
                this.trace('start') +
                '(function(f,x,t,u,v,j,d){' +
                    this.trace('in function') +
                    'x.open(' +
                        '\'GET\',' +
                        'u+v+\'?\'+(new Date()).getTime(),' +
                        'true' +
                    ');' +
                    this.trace('x opened') +
                    'x.onload=function(){' +
                        'try{' +
                            this.trace('x onload called') +
                            'f=1;' +
                            'eval(' +
                                '\'(function(){\'+' +
                                'x.response+' +
                                '\'}).call({cartFillerEval:[u,t,j,d]});\'' +
                            ');' +
                            this.trace('eval complete') +
                        '}catch(e){alert(e);}' +
                    '};' +
                    this.trace('x onload set') +
                    'setTimeout(function(){if(!f)alert(\'error\');},5000);' +
                    this.trace('onerror set') +
                    'x.send();' +
                    this.trace('x sent') +
                '})(' +
                    '0,' +
                    'new XMLHttpRequest(),' + 
                    this.getTypeId() + ',' +
                    '\'' + this.settings.baseUrl + '\',' +
                    '\'' + this.getInjectUrl() + '\',' +
                    '\'' + this.settings.chooseJob + '\',' +
                    (this.settings.debug ? 1 : 0) +
                ');' +
            '}catch(e){alert(e);}';
        },
        iframeBookmarklet: function(){
            return this.javaScriptUrl() + 'try{' +
                this.trace('start') +
                '(function(f,d,p,t,u,v,m,j,y,x,i){' +
                    this.trace('in') +
                    'window.addEventListener(' +
                        '\'message\',' +
                        'function(e){' +
                            'f=1;' +
                            'try{' +
                                this.trace('event') +
                                'if(p.test(x=e.data)){' +
                                    this.trace('event+') +
                                    'eval(' +
                                        '\'(function(){\'+' +
                                        'x+' +
                                        '\'}).call({cartFillerEval:[u,t,j,y]});\'' +
                                   ');' +
                                    this.trace('eval done') +
                                '}' +
                            '}catch(e){alert(e);}' +
                        '}' +
                        ',true' +
                    ');' +
                    this.trace('lstnr+') +
                    'i=d.createElement(\'iframe\');' +
                    this.trace('iframe') +
                    'd.getElementsByTagName(\'body\')[0].appendChild(i);' +
                    this.trace('iframe+') +
                    'i.contentWindow.location.href=u+v+(m?\'?min&\':\'?\')+(new Date()).getTime();' +
                    this.trace('iframe++') +
                    'setTimeout(function(){if(!f)alert(\'error\');},5000);' +
                    this.trace('timeout set') +
                '})(' +
                    '0,' +
                    'document,' +
                    '/^\'cartFillerEval\'/,' + 
                    this.getTypeId() + ',' +
                    '\'' + this.settings.baseUrl +'\',' +
                    '\'' + this.getIframeUrl() + '\',' + 
                    (this.settings.minified ? 1:0) + ',' +
                    '\'' + this.settings.chooseJob + '\',' +
                    (this.settings.debug ? 1 : 0) +
                ');' +
            '}catch(e){alert(e);}';
        },
        javaScriptUrl: function(){
            var a = 'java';
            var b = 'script';
            return a + b + ':';
        }
    });

    /**
     * Plugin function. Should be used on link elemens
     * <a id="bookmarklet">
     *     Bookmarklet - drag this link to your bookmarks
     * </a>
     * <script>
     *     $("#bookmarklet").cartFillerPlugin({
     *         minified: true,
     *         inject: 'script',
     *         type: 'framed'
     *     });
     * </script>
     * @function external:"jQuery.fn".cartFillerPlugin
     * @global
     * @name "jQuery.fn.cartFillerPlugin"
     * @param {CartFillerPlugin~Settings} options
     * @returns {external:jQuery}
     * @access public
     */
    $.fn[ pluginName ] = function ( options ) {
        return this.each(function() {
            if ( !$.data( this, 'plugin_' + pluginName ) ) {
                    $.data( this, 'plugin_' + pluginName, new Plugin( this, options ) );
            }
        });
    };
    /**
     * Holds result callback registered by user through {@link external:"jQuery".cartFillerPlugin}
     * @var {CartFillerPlugin.resultCallback} CartFillerPlugin~resultCallback
     * @access private
     */
    var resultCallback;
    /**
     * Host intermediate status update callback registered by user through 
     * {@link external:"jQuery".cartFillerPlugin}
     * @var {CartFillerPlugin.statusCallback} CartFillerPlugin~statusCallback
     * @access private
     */
    var statusCallback;
    /**
     * Holds result callback message name, can be configured via jobDetails, 
     * with only reason - not to conflict with other messages. Defaults to 
     * 'cartFillerResultMessage'
     * @var {String} CartFillerPlugin~resultMessageName
     * @access private
     */
    var resultMessageName;
    /**
     * Holds status callback message name, can be configured via jobDetails, 
     * with only reason - not to conflict with other messages. Defaults to 
     * 'cartFillerStatusMessage'
     * @var {String} CartFillerPlugin~statusMessageName
     * @access private
     */
    var statusMessageName;
    /**
     * Message to be used as "hello" message from {@link CartFiller.Dispatcher}
     * to plugin
     * @var {String} CartFillerPlugin~helloMessageName
     * @access private
     */
    var helloMessageName = 'helloFromCartFiller';
    /**
     * Callback, that will receive job result details from cartFiller
     * @callback CartFillerPlugin.resultCallback
     * @param {Object} message message.result contains result, while
     * message.tasks contains job details as provided by Choose Job frame.
     * See {@link CartFiller.Dispatcher#onMessage_sendResult}
     */
    /**
     * Callback, that will receive intermediate job status update from cartFiller
     * @callback CartFillerPlugin.statusCallback
     * @param {Object} message message.result contains result, while
     * message.tasks contains job details as provided by Choose Job frame, 
     * message.currentTaskIndex and message.currentTaskStepIndex identify
     * task and step which triggered status update, and message.
     * See {@link CartFiller.Dispatcher#onMessage_sendResult}
     */
    var messageEventListener = function(event){
        if ((new RegExp('^' + helloMessageName + ':{')).test(event.data)){
            $('.cart-filler-submit').show();
            $('.cart-filler-helper').hide();
            $(knownBookmarkletElements).hide();
            runningInsideCartFiller = true;
        } else {
            var data = new RegExp('^' + resultMessageName + ':(.*)$').exec(event.data);
            if (data) {
                if (resultCallback){
                    resultCallback(JSON.parse(data[1]));
                }
            }
            data = new RegExp('^' + statusMessageName + ':(.*)$').exec(event.data);
            if (data) {
                if (statusCallback){
                    statusCallback(JSON.parse(data[1]));
                }
            }
        }
    };
    /** 
     * @class CartFillerPlugin~jobDetails
     */
    /** 
     * @member {Object[]} CartFillerPlugin~jobDetails#details Array of tasks, each task is 
     * object with mandatory task property which specifies the task alias, and any 
     * set of other properties which will be transferred to worker. 
     */
    /**
     *  @member {Object} CartFillerPlugin~jobDetails#titleMap Map of human readable titles 
     * of tasks. Property name = task alias, value = title. 
     */
    /**
     * @member {integer} CartFillerPlugin~jobDetails#autorun Time (ms) after which 
     * worker will run automatically. If set to null, undefined or 0 -- no autorun will
     * be done
     */
    /**
     * @member {string} CartFillerPlugin~jobDetails#workerSrc URL of worker to 
     * be used instead of one given by bookmarklet
     */
    /**
     * Global plugin function - sends job details to cartFiller and
     * registers optional callback, that will receive results.
     * @function external:"jQuery".cartFillerPlugin
     * @global
     * @name "jQuery.cartFillerPlugin"
     * @param {CartFillerPlugin~jobDetails} jobDetails Job details data
     * @param {CartFillerPlugin.resultCallback} resultCallback
     * callback, which will receive results. It can be called several times
     * @param {CartFillerPlugin.statusCallback} resultCallback
     * callback, which will receive status updates after each step of each task will
     * be completed.
     * @access public
     */
    $.cartFillerPlugin = function( jobDetails, newResultCallback, newStatusCallback) {
        if (newResultCallback && 
            ((undefined === jobDetails.resultMessage) || (String(jobDetails.resultMessage).length < 1))
            ){
            jobDetails.resultMessage = 'cartFillerResultMessage';
        }
        if (newStatusCallback &&
            ((undefined === jobDetails.statusMessage) || (String(jobDetails.statusMessage).length < 1)) 
            ){
            jobDetails.statusMessage = 'cartFillerStatusMessage';
        }
        resultMessageName = jobDetails.resultMessage;
        statusMessageName = jobDetails.statusMessage;

        jobDetails.cmd = 'jobDetails';

        window.parent.postMessage(
            'cartFillerMessage:' + 
            JSON.stringify(jobDetails),
            '*'
        );
        resultCallback = newResultCallback;
        statusCallback = newStatusCallback;
    };

    window.addEventListener('message', messageEventListener,false);
    if (window.parent !== window){
        window.parent.postMessage('cartFillerMessage:{"cmd":"helloFromPlugin","message":"' + helloMessageName + '"}', '*');
    }
    $(document).ready(function(){
        if (!runningInsideCartFiller){
            $('.cart-filler-submit').hide();
            $('.cart-filler-helper').show();
        } else {
            $('.cart-filler-submit').show();
            $('.cart-filler-helper').hide();
            $(knownBookmarkletElements).hide();
        }
    });

})( jQuery, window, document );
