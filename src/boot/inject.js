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
        if (((! ignoreOpener) && window.opener && window.opener !== window) || (window.parent && /\#?\/?launchSlaveInFrame$/.test(window.location.hash))) {
            this.modules.dispatcher.startSlaveMode();
        } else {
            if (! config.uiLaunched) {
                config.uiLaunched = true;
                if (String(config['data-type']) === '0') {
                    this.modules.ui.framed(document, window);
                } else if (String(config['data-type']) === '1'){
                    this.modules.ui.popup(document, window);
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
    config.gruntBuildTimeStamp='';

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
    // if not concatenated - then load loader.js, which, itself, will load other
    // files
    if (!concatenated) {
        var script = document.createElement('script');
        script.setAttribute('src', config.baseUrl + '/boot/helpers/loader.js');
        document.getElementsByTagName('head')[0].appendChild(script);
    }
}).call(this, document, window);
