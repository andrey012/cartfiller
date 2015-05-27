(function(document, window, undefined){
    /**
     * @var {jQuery|HtmlElement} highlightedElement Stores currently highlighted
     * that will be passed back to next step function
     * @access private
     */
    var highlightedElement = false;
    /**
     * @var {CartFiller~Configuration} me Shortcut to cartFiller configuration
     * @access private
     */
    var me = this.cartFillerConfiguration;
    /**
     * Represents the API interface used by worker. 
     * @class CartFiller~Api
     */
    me.scripts.push({
        /**
         * @var {String} name used by loader to organize modules
         * @access public
         */
        getName: function(){ return 'api'; },
        /**
         * @callback CartFiller~Worker~registerCallback Called by cartFiller in
         * response to worker registration to fetch worker capabilities -- tasks
         * and steps it performs.
         * @param {Window} window
         * @param {Document} document, undefined will be passed here, to prevent
         * worker from accessing document. Instead worker should access
         * window.document. This is because worker is instantiated in the top frame
         * but operates with main frame where target site is opened, and document
         * in that main frame changes time to time.
         * @param {CartFiller~API} api
         * @param {Object} task When called first time - contains empty object.
         * When particular step callbacks, this object will each time be
         * reinitialized with next task
         * @see CartFiller~SampleWorker~registerCallback
         */
        /**
         * Registers worker object. Worker object can be replaced by new one
         * to make it possible to update code during debugging.
         * @param {}
         */
        registerWorker: function(cb){
            me.modules.dispatcher.registerWorker(cb, this);
            return this;
        },
        result: function(message, recoverable){
            me.modules.dispatcher.submitWorkerResult(message, recoverable);
            return this;
        },
        nop: function(){
            me.modules.dispatcher.submitWorkerResult('', 'nop');
            return this;
        },
        onload: function(cb){
            me.modules.dispatcher.registerWorkerOnloadCallback(cb);
            return api;
        },
        waitFor: function(checkCallback, resultCallback, timeout){
            if (undefined === timeout){
                timeout = 20000;
            }
            var period = 200;
            var counter = timeout / period;
            var fn = function(){
                var result = checkCallback();
                if (false === me.modules.dispatcher.getWorkerCurrentStepIndex()) return;
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
            }
            setTimeout(fn, period);
            return this;
        },
        highlight: function(element, allElements){
            me.modules.ui.highlight(element, allElements);
            me.modules.dispatcher.setHighlightedElement(element);
            return this;
        }

    });
}).call(this, document, window);