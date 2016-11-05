(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        
        cf.task('^Export tab-separated CSV file$')
            .then(function() {
                var data = [
                    {id: 1, name: 'Bob', email: 'bob@example.com'},
                    {id: 2, name: 'Alice', phone: '+1(000)123-4567'}
                ];
                api.exportCsv(data, 'sample.csv', [], 'text/csv').result();
            })

    });
})(window, document);
