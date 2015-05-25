(function(document, window, undefined){
    'use strict';
    var minified = !('undefined' === typeof this.cartFillerConfiguration);
    this.cartFillerConfiguration = {
        minified: minified,
        scripts: [],
        launch: function(){
            this.modules.ui.framed(document, window);
        }
    }
    var scripts = document.getElementsByTagName('head')[0].getElementsByTagName('script');
    var me = scripts[scripts.length - 1];
    var baseUrl = me.getAttribute('src').replace(/\/boot\/[^\/]+\.js(\?\d*)?/, '');
    this.cartFillerConfiguration.baseUrl = baseUrl;
    var attrs = me.attributes;
    for (var j = attrs.length - 1 ; j >= 0; j --){
        if (/^data-/.test(attrs[j].name)){
            this.cartFillerConfiguration[attrs[j].name] = attrs[j].value;
        }
    }
    if (!minified) {
        var script = document.createElement('script');
        script.setAttribute('src', baseUrl + '/boot/helpers/loader.js');
        document.getElementsByTagName('head')[0].appendChild(script);
    }
}).call(this, document, window);
