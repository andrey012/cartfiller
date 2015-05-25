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
    if (!minified){
        var scripts = document.getElementsByTagName('script');
        var pattern = /\/boot\/framed.js(\?\d*)?$/;
        for (var i = scripts.length - 1; i >= 0; i--){
            if (pattern.test(scripts[i].getAttribute('src'))) {
                var attrs = scripts[i].attributes;
                for (var j = attrs.length - 1 ; j >= 0; j --){
                    if (/^data-/.test(attrs[j].name)){
                        this.cartFillerConfiguration[attrs[j].name] = attrs[j].value;
                    }
                }
                var script = document.createElement('script');
                var baseUrl = this.cartFillerConfiguration.baseUrl = attrs.src.value.replace(pattern, '');
                script.setAttribute('src', baseUrl + '/boot/helpers/loader.js');
                document.getElementsByTagName('head')[0].appendChild(script);
                return;
            };
        }
        alert('Unable to identify myself');

    }
    return;




}).call(this, document, window);
