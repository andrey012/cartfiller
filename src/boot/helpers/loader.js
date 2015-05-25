(function(document, window, undefined){
    var require = [
        'dispatcher',
        'ui',
        'api'
    ];
    var me = this;
    var onScriptLoaded = function(){
        for (var i in require){
            var found = false;
            for (var j in me.cartFillerConfiguration.scripts){
                if (me.cartFillerConfiguration.scripts[j].name === require[i]){
                    found = true;
                }
            }
            if (!found) return;
        }
        //// TBD global API variable name
        window.cartFillerAPI = function(){
            return me.cartFillerConfiguration.modules.api;
        }
        me.cartFillerConfiguration.modules = {};
        for (var j in me.cartFillerConfiguration.scripts){
            var script = me.cartFillerConfiguration.scripts[j];
            me.cartFillerConfiguration.modules[script.name] = script;
        }
        me.cartFillerConfiguration.launch();
    }
    this.cartFillerConfiguration.scripts.push = function(value){
        Array.prototype.push.call(this, value);
        onScriptLoaded();
    }
    var head = document.getElementsByTagName('head')[0];
    if (!this.cartFillerConfiguration.minified) {
        for (var i in require){
            var script = document.createElement('script');
            script.setAttribute('src', this.cartFillerConfiguration.baseUrl + '/boot/helpers/' + require[i] + '.js');
            head.appendChild(script);
        }
    }
}).call(this, document, window);