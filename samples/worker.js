(function(window, document, undefined){
    cartFillerAPI.registerWorker(function(window, document, api, undefined){
        var currentRow;
        var findOrderRows = function(){
            var tbody = window.document.getElementsByTagName('tbody')[0];
            return tbody.getElementsByTagName('tr');
        }
        return {
            clearCart: [
                'clear cart', function(task){
                    var inputs = window.document.getElementsByTagName('input');
                    for (var i = 0; i < inputs.length; i++){
                        inputs[i].value = '';
                    }
                    setTimeout(api.result, 300);
                }
            ],
            addToCart: [
                'find nearest empty line', function(task) {
                    // look for nearest empty line
                    var rows = findOrderRows();
                    for (var i = 0; i < rows.length; i++){
                        var clear = true;
                        var inputs = rows[i].getElementsByTagName('input');
                        for (var j = 0; j < inputs.length; j++){
                            if (inputs[j].value.length > 0) clear = false;
                        }
                        if (clear) {
                            return api.highlight(currentRow = rows[i]).result();
                        }
                    }
                    api.result("no more lines");
                },
                'find input for part number', function(task) {
                    var input = currentRow.getElementsByTagName('input')[0];
                    input.focus();
                    return api.highlight(input).result();
                },
                'put part number', function(task, input){
                    input.value = task.partno;
                    return api.highlight().result();
                },
                'find quantity input', function(task){
                    return api.highlight(currentRow.getElementsByTagName('input')[1]).result();
                },
                'put quantity', function(task, input){
                    input.value = task.quantity;
                    return api.highlight().result();
                },
                'find comment input', function(task){
                    return api.highlight(currentRow.getElementsByTagName('input')[2]).result();
                },
                'put comment', function(task, input){
                    input.value = 'populated by cartFiller';
                    return api.highlight().result();
                }
            ],
            'submit': [
                'submit', function(task){
                    api.onload(function(){
                        api.result();
                    });
                    window.document.getElementsByTagName('form')[0].submit();

                }
            ]
        }
    });
})(window, document);