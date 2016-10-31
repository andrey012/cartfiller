(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        
        cf.task('makeSureItemExists')
            .get('#todo-list:visible label:visible')
            .withText("${name}")
            /**
             * Makes sure that element exists, at least one element. Implicitly waits for some time 
             * to let element appear
             */
            .exists()

        cf.task('makeSureItemDoesNotExist')
            .get('#todo-list:visible li:visible label:visible').withText('${name}')
            /**
             * Makes sure that element does not exist. Implicitly waits for some time 
             * to let element disappear appear
             */
            .absent()

        cf.task('makeSureThatNewItemInputHasText')
            .get('#new-todo:visible')
            .exists()
            /**
             * Custom assertion, you can specify a function, that gets selector as a parameter. 
             * By having .exists() above you make sure, that this selector is not empty
             * Then you do whatever you want and call api.return with:
             * * in case of success - with no parameter or empty string, i.e
             *   api.result() or
             *   api.result('')
             * * in case of error - with error description
             */
            .then(function(selector) {
                if (task.text === selector.val()) {
                    api.result();
                } else {
                    api.result('selector has value [' + selector.val() + '] which is different to expected [' + task.text + ']');
                }
            })
            /**
             * There is also useful comparator for values, which will compare strings char-by-char and
             * highlight first difference. 
             */
            .then(function(selector) {
                api.result(api.compare(task.text, selector.val().trim()));
            })
            
        cf.task('makeSureItemIsChecked')
            .get('#todo-list:visible li:visible').withText('${name}').find('input[type="checkbox"]:visible')
            /**
             * .is is similar to jQuery's one, asserts obviously that element matches the selector
             */
            .is(':checked')

        cf.task('makeSureItemIsNotChecked')
            .get('#todo-list:visible li:visible').withText('${name}').find('input[type="checkbox"]:visible')
            /**
             * .isNot is opposite to .is and same as .is(':not(%selector%)')
             */
            .isNot(':checked')
            .is(':not(:checked)')

    });
})(window, document);
