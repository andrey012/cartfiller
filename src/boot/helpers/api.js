(function(document, window, undefined){
    var highlightedElement = false;
    var me = this.cartFillerConfiguration;
    me.scripts.push({
        name: 'api',
        registerWorker: function(cb){
            me.modules.dispatcher.registerWorker(cb, this);
            return this;
        },
        result: function(message, recoverable){
            me.modules.dispatcher.submitWorkerResult(message, recoverable);
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