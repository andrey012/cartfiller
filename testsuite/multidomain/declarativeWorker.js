(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        
        cf.task('try drilling')
            .get('iframe[name="theframe"]:visible')
            .inside(
                cf
                    .get('span').css('backgroundColor', 'yellow')
                    .get('a')
                    .get('iframe').first()
                    .inside(
                        cf.get('span').css('backgroundColor', 'cyan')
                    )
            )
            .get('a')
            
    });
})(window, document);
