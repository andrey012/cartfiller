(function(window, document, undefined){
    cartFillerRegisterWorker(function(window, document, resultCallback, onload, undefined){
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
                    setTimeout(resultCallback, 300);
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
                            resultCallback();
                            return true;
                        }
                    }
                    resultCallback("no more lines");
                },
                'find input for part number', function(task) {
                    var input = findOrderRows()[state.addToCart.nextFreeRow].getElementsByTagName('input')[0];
                    input.focus();
                    input.style.background = 'green';
                    resultCallback();
                },
                'put part number', function(task){
                    var input = findOrderRows()[state.addToCart.nextFreeRow].getElementsByTagName('input')[0];
                    input.value = task.partno;
                    input.style.background = 'white';
                    resultCallback();
                }
            ],
            'submit': [
                'submit', function(task){
                    onload(function(){
                        resultCallback();
                    });
                    window.document.getElementsByTagName('form')[0].submit();

                }
            ]
        }
    });
})(window, document);