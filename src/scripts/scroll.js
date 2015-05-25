define('scroll', ['app', 'scroll'], function(app){
    app.service('cfScroll', function(){
        return function(element){
            var rect = element.getBoundingClientRect();
            var bottom = window.innerHeight;
            var delta = rect.bottom - bottom;
            window.scrollBy(0, delta);
        };
    });
});
