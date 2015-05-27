(function(document, window, undefined){
    var require = [
        'dispatcher',
        'ui',
        'api'
    ];
    var me = this;
    var onScriptLoaded = function(){
        for (var i = require.length - 1; i >= 0; i --){
            var found = false;
            for (var j = me.cartFillerConfiguration.scripts.length - 1; j >= 0; j--){
                if (me.cartFillerConfiguration.scripts[j].getName() === require[i]){
                    found = true;
                    break;
                }
            }
            if (!found) return;
        }
        //// TBD global API variable name
        window.cartFillerAPI = function(){
            return me.cartFillerConfiguration.modules.api;
        }
        me.cartFillerConfiguration.modules = {};
        for (var j = me.cartFillerConfiguration.scripts.length - 1; j >= 0; j--){
            var script = me.cartFillerConfiguration.scripts[j];
            me.cartFillerConfiguration.modules[script.getName()] = script;
        }
        me.cartFillerConfiguration.launch();
    }
    this.cartFillerConfiguration.scripts.push = function(value){
        Array.prototype.push.call(this, value);
        onScriptLoaded();
    }
    var head = document.getElementsByTagName('head')[0];
    if (!this.cartFillerConfiguration.minified) {
        for (var i = require.length - 1; i >= 0; i --){
            var script = document.createElement('script');
            script.setAttribute('src', this.cartFillerConfiguration.baseUrl + '/boot/helpers/' + require[i] + '.js');
            head.appendChild(script);
        }
    }
}).call(this, document, window);