(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, task, job, globals, lib, cf){
        cf.task('selectorsDemo')
        /**
         * .get starts search from window.document and builds a Selector object in a jQuery style,
         * althought there is no full jQuery implementation. 
         * jQuery-like means, that selectors have: 
         * * length field 
         * * [0], [1] ... up to length entries - which contain elements
         * 
         * Selectors can be empty if no elements are found. For assertions see 004.assertions.js
         * You can see .exists() on the right of most selector calls - that's for smoke testing, since 
         * this is live testsuite
         */
        /**
         * As jQuery it can get ids ...
         */
            .get('#header').exists()
        /**
         * ... node types ...
         */
            .get('div').exists()
        /**
         * ... class names ...
         */
            .get('.quote').exists()
        /**
         * ... attributes ...
         */
            .get('a[href="http://todomvc.com"]').exists()
        /**
         * ... modifiers like :visible, :checked, :containsText("Resources")
         */
            .get('a:visible').exists()
            .get('input[type="checkbox"]:visible:checked').exists()
            .get('h4:contains("Resources")').exists()
            .get('div[data-reactid=".0"]:visible').exists()

        /**
         * .find method looks in a subtree of any of currently selected elements.
         * Selector features are same as for .get
         */
            .find('input:visible').exists()
        /**
         * .closest walks through parents and selects first one that matches
         */
            .closest('header:visible').exists()
        /**
         * .withText smartly matches element.textContent (by trimming it) against supplied value
         */
            .get('a:visible')
            .withText('Completed').exists()
        /**
         * .withText can contain references to task properties or globals 
         * and use second parameter to ignore case
         */
            .get('a:visible')
            .withText('${taskParam}', true).exists()
        /**
         * .withText can use regular expressions also with references to task properties or globals which will be replaced
         */
            .get('a:visible')
            .withText(/${taskParam}/).exists()
        /**
         * .withText by default uses 'textContent' property of DOM element,
         * which usually includes text not only of element itself but
         * also all of its children. If you want to search only
         * inside own text of element, not its children, set third
         * parameter to true. This will work similar to Ctrl+F or Cmd+F
         */
            .get('a:visible')
            .withText(/${taskParam}/, true, true).exists()
        /**
         * .css changes element.style.? value
         */
            .uselib('todolist')
            .find('button.destroy')
            .css('display', 'block')
        /**
         * .val sets value of an input. It is discouraged because most JS frameworks will wipe
         * your changes out, so use .type or .click. 
         * But can be used for hidden inputs
         */
            .get('#new-todo:visible')
            .val('some text')

            .attr('data-something', 'aha')
            .get('input[data-something="aha"]:visible').exists()

        /**
         * .add adds items found by another selector to this one. 
         */
            .get('a:visible').withText("All")
            .add(cf.get('a:visible').withText("Active"))
            .then(function(s) { 
                api.result(api.compare(2, s.length));
            })
        /**
         * .filter obviously filters elements
         */
            .get('a')
            .filter(function(){ return true; }).exists()
            .get('a')
            .filter(function(){ return false; }).absent()
        /**
         * .first and .last selects first and last element of all elements found by selector
         */
            .get('a')
            .first().exists()
            .get('a')
            .last().exists()

        /**
         * .nthOfType let's use select an element having particular index among elements of same
         * type of this parent. Useful i.e. to select td inside a tr. 
         */
            .get('#filters:visible li:visible')
            .nthOfType(2).exists()

        /**
         * Inside custom steps selectors behave differently, see 011.customSteps.js
         */
    });
})(window, document);
