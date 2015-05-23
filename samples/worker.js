(function(window, document, undefined){
    cartFillerAPI.registerWorker(function(window, document, api, undefined){
        var state = {};
        var findOrderRows = function(){
            var tbody = window.document.getElementsByTagName('tbody')[0];
            return tbody.getElementsByTagName('tr');
        }
        var markNextRow = function(){
            var rows = findOrderRows();
            for (var i = 0 ; i < rows.length; i++){
                rows[i].style.background = (i === state.addToCart.nextFreeRow) ? 'green' : 'white';
            }

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
                            state.addToCart = {nextFreeRow: i};
                            markNextRow();
                            api.result();
                            return true;
                        }
                    }
                    api.result("no more lines");
                },
                'find input for part number', function(task) {
                    var input = findOrderRows()[state.addToCart.nextFreeRow].getElementsByTagName('input')[0];
                    input.focus();
                    input.style.background = 'green';
                    api.result();
                },
                'put part number', function(task){
                    var input = findOrderRows()[state.addToCart.nextFreeRow].getElementsByTagName('input')[0];
                    input.value = task.partno;
                    input.style.background = 'white';
                    api.result();
                },
                'put quantity', function(task){
                    var input = findOrderRows()[state.addToCart.nextFreeRow].getElementsByTagName('input')[1];
                    input.value = task.quantity;
                    input.style.background = 'white';
                    api.result();
                },
                'put comment', function(task){
                    var input = findOrderRows()[state.addToCart.nextFreeRow].getElementsByTagName('input')[2];
                    input.value = 'populated by cartFiller';
                    input.style.background = 'white';
                    api.result();
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