define('scroll', ['app', 'scroll'], function(app){
    app.service('cfScroll', function(){
        return function(element, useTop, force){
            if (! element) {
                // just scroll to top
                window.scrollBy(0, -1000000);
            } else {
                var rect = element.getBoundingClientRect();
                var bottom = window.innerHeight;
                var delta = (useTop ? rect.top : rect.bottom) - bottom;
                if (force || delta > 0 && delta < bottom) {
                    window.scrollBy(0, delta);
                }
            }
        };
    });
});
