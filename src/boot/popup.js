(function(document, window, undefined){
    'use strict';
    var minified = !('undefined' === typeof this.cartFillerConfiguration);
    var evaled = !('undefined' === typeof this.cartFillerEval);

    var config;
    if (evaled && !minified) {
        window.cartFillerConfiguration = {};
        config = window.cartFillerConfiguration;
    } else {
        this.cartFillerConfiguration = {};
        config = this.cartFillerConfiguration;
    }
    config.minified = minified;
    config.scripts = [];
    config.launch = function(){
        this.modules.ui.popup(document, window);
    }
    var scripts = document.getElementsByTagName('head')[0].getElementsByTagName('script');
    if (!evaled){
        var me = scripts[scripts.length - 1];
        config.baseUrl = me.getAttribute('src').replace(/\/boot\/[^\/]+\.js(\?\d*)?/, '');
        var attrs = me.attributes;
        for (var j = attrs.length - 1 ; j >= 0; j --){
            if (/^data-/.test(attrs[j].name)){
                config[attrs[j].name] = attrs[j].value;
            }
        }
    } else {
        config.baseUrl = this.cartFillerEval[0];
        config['data-choose-job'] = this.cartFillerEval[1];
        config['data-debug'] = this.cartFillerEval[2];
        config['data-worker'] = this.cartFillerEval[3];
    }
    if (!minified) {
        var script = document.createElement('script');
        script.setAttribute('src', config.baseUrl + '/boot/helpers/loader.js');
        document.getElementsByTagName('head')[0].appendChild(script);
    }
}).call(this, document, window);
