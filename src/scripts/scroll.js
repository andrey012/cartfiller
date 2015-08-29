define('scroll', ['app', 'scroll'], function(app){
    app.service('cfScroll', function(){
        return function(element, useTop, force){
            var rect = element.getBoundingClientRect();
            var bottom = window.innerHeight;
            var delta = (useTop ? rect.top : rect.bottom) - bottom;
            if (force || (delta > 0 && delta < bottom)) {
                window.scrollBy(0, delta);
            }
        };
    });
});
