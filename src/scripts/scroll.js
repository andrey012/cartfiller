define('scroll', ['app', 'scroll'], function(app){
    app.service('cfScroll', function(){
        var phantomScrollOffset = 0, oldUnshiftedMargin = 0;
        return function(element, useTop, force, phantomScrollUpdate){
            if (element === null && useTop === null && force === null) {
                // this is workaround for the PhantomJS's absence of vertical scroll. 
                if (phantomScrollUpdate !== undefined) {
                    console.log('received phantomScrollOffset update: [' + String(phantomScrollUpdate) + ']');
                    // this logic comes from phantomjs.js file
                    phantomScrollOffset = Math.max(0, parseInt(phantomScrollUpdate) - 200);
                    console.log('phantomScrollOffset = ' + phantomScrollOffset);
                }
                return;
            }
            var rect, bottom, delta;
            try {
                if (parent.parent.callPhantom) {
                    // this is workaround for the PhantomJS's absence of vertical scroll. 
                    if (! element) {
                        $('#jobDetails').css('margin-top', '0px');
                    } else {
                        rect = element.getBoundingClientRect();
                        bottom = 400 + phantomScrollOffset;
                        delta = rect.bottom - bottom;
                        var newUnshiftedMargin = (oldUnshiftedMargin - delta);
                        $('#jobDetails').css('margin-top', String(newUnshiftedMargin) + 'px');
                        console.log('phantomScrollOffset = ' + phantomScrollOffset + ', bottom = ' + bottom + ', delta = ' + delta + ', oldUnshiftedMargin = ' + oldUnshiftedMargin + ', newUnshiftedMargin = ' + newUnshiftedMargin);
                        oldUnshiftedMargin = newUnshiftedMargin;
                    }
                    return;
                }
            } catch (e) {}
            if (! element) {
                // just scroll to top
                window.scrollBy(0, -1000000);
            } else {
                rect = element.getBoundingClientRect();
                bottom = window.innerHeight - 20;
                delta = (useTop ? rect.top : rect.bottom) - bottom;
                if (force || delta > 0 && delta < bottom) {
                    window.scrollBy(0, delta);
                }
            }
        };
    });
});
