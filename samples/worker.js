/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    // register callback with apiCart
    /**
     * @function CartFiller.SampleWorker~registerCallback
     * @see CartFiller.Api.registerCallback
     * @access private
     */
    var registerCallback = function(window, document, api, task, job, globals, lib){
        lib.cartAmountElement = function(){
            return api.find('#navbar div strong:nth-child(1):visible');
        };
        lib.searchResultsHeading = function(){
            return api.find('h2:contains("Search results"):visible');
        }
        lib.click = function(el) {
            var ev = window.document.createEvent('MouseEvents');
            ev.initMouseEvent(
                'click',
                /*bubble*/true, /*cancelable*/true,
                window, null,
                0, 0, 0, 0, /*coordinates*/
                false, false, false, false, /*modifier keys*/
                0/*button=left*/, null
            );
            el.dispatchEvent(ev);
        };
        console.log('hello from sample worker'); // to easier find its current source

        /** 
         * Object, that contains task description code -- functions and
         * comments for particular steps
         * @class CartFiller.SampleWorker.SampleWorkerTasks
         * @augments CartFiller.WorkerTasks
         */
        return {
            /**
             * Some example of api.map
             */
            testApiMap: [
                '', function() {
                    api.result(
                        api.compare(
                            JSON.stringify([0, 5, 1, 3, 0]),
                            JSON.stringify(
                                api.map(
                                    [1,2,3,4,5],
                                    function(i,v,p,u){
                                        (v==1||v==3)?p(v):0;
                                        v==5?u(v):0;
                                    }, 
                                    function(p,u){
                                        p(0);u(0);
                                    }
                                )
                            )
                        )
                    );
                },
                '', function() {
                    api.result(
                        api.compare(
                            JSON.stringify([5, 1, 3]),
                            JSON.stringify(
                                api.map(
                                    [1,2,3,4,5],
                                    function(i,v,p,u){
                                        (v==1||v==3)?p(v):0;
                                        v==5?u(v):0;
                                        return v === 5 ? false : undefined;
                                    },
                                    function(p,u){
                                        p(0);u(0);
                                    }
                                )
                            )
                        )
                    );
                },
                '', function() {
                    api.result(
                        api.compare(
                            JSON.stringify([5, 5, 5, 1, 1, 1, 3, 3, 3]),
                            JSON.stringify(
                                api.map(
                                    [1,2,3,4,5],
                                    function(i,v,p,u){
                                        if (v==1 || v==3) p(v);
                                        if (v==5) u(v);
                                        return v === 5 ? false : undefined;
                                    }, 
                                    function(p,u){
                                        p(0);u(0);
                                    }
                                ).map(
                                    function(i,v,p){
                                        p(v); p(v); p(v);
                                    }
                                )
                            )
                        )
                    );
                },
                'flatten', function() {
                    api.result(
                        api.compare(
                            JSON.stringify([1,2,3,4,5]),
                            JSON.stringify(
                                api.map(
                                    [[[1,2],3],[4,5]],
                                    function f(i,v,p){
                                        (v instanceof Array) ? api.map(v, f).map(function(i,v){p(v);}) : p(v);
                                    }
                                )
                            )
                        )
                    );
                }
            ],
            /**
             * Makes sure, that cart is empty. If it is not - removes all
             * items from cart
             * @member {Array} CartFiller.SampleWorker.SampleWorkerTasks#clearCart 
             * @access public
             */
            clearCart: [
                lib('goToHomeSteps'),
                'find total amount of items in the cart', [function(el){
                    if (api.env.params.theParam !== 1) throw "params are passed incorrectly";
                    var strong = lib.cartAmountElement();
                    api.highlight(strong).arrow(strong).say(globals.skipMessages?'':'Here is total amount in cart. To start filling the cart we need to make sure, that cart is empty.').result((1 === strong.length) ? "" : "Cant find amount in cart");
                }, {theParam: 1}],
                'check, that cart has more then 0 items', function(strong){
                    var cartIsEmpty = ("0" === strong.text());
                    var msg = cartIsEmpty ? 'Cart is empty' : 'Cart is not empty';
                    api.highlight(strong).arrow(strong).say(globals.skipMessages?'':msg);
                    if (cartIsEmpty) api.skipTask();
                    api.result('', false, msg);
                },
                'if cart is not empty - find link to open cart', function(){
                    api.arrow();
                    var cartLink = api.find('#navbar a:contains("Open Cart"):visible');
                    api.highlight(cartLink).say(globals.skipMessages?'':'Here is "open cart" link, we are going to open cart').result((1 === cartLink.length) ? "" : "Cant find link to open cart");
                },
                'if cart is not empty - click on open cart link', function(cartLink){
                    cartLink.each(function(i,el){lib.click(el);});
                    api.waitFor(
                        function(){ 
                            return (1 === api.find('h2:contains("Your cart"):visible').length);
                        }, 
                        function(result){ 
                            api.highlight().result(result ? "" : "Cant open cart");
                        }
                    );
                },
                'if cart is not empty - find clear cart button', function(){
                    var removeAllItems = api.find('a:contains("Remove all items"):visible');
                    api.highlight(removeAllItems).say(globals.skipMessages?'':'Here is "Remove all" button').result((1 <= removeAllItems.length) ? "" : "Cant find clear cart button");
                },
                'if cart is not empty - click clear cart button', function(removeAllItems){
                    removeAllItems.each(function(i,el){lib.click(el);});
                    api.highlight(removeAllItems).say(globals.skipMessages?'':'We are going to clear cart.');
                    api.waitFor(
                        function(){
                            return "0" === lib.cartAmountElement().text();
                        },
                        function(result){
                            api.result(result ? "" : "Cant clear cart");
                        }
                    );
                },
                'if cart was not empty - find cart amount element again', function(){
                    var strong = lib.cartAmountElement();
                    api.highlight(strong).say(globals.skipMessages?'':'Let\'s see if cart is empty now').result((1 === strong.length) ? "" : "Cant find cart amount element");
                },
                'if cart was not empty - make sure it is empty now', function(){
                    var cartIsEmptyNow = ("0" === lib.cartAmountElement().text());

                    api.highlight(lib.cartAmountElement()).say(globals.skipMessages?'':(cartIsEmptyNow ? 'Cart is empty now' : 'Cart is still not empty')).result(cartIsEmptyNow ? "" : "Cant clear cart - it is still not empty");
                },
                'let\' try to skip step', function() {
                    api.skipTask().result();
                }, 
                'step to be skipped', function() {}
            ],
            /**
             * Searches for particular partnumber then looks for 
             * suitable offer and adds requested amount of items to cart, 
             * then makes sure, that requested amount of items were added
             * @member {Array} CartFiller.SampleWorker.SampleWorkerTasks#addToCart
             * @access public
             */
            goToHome: [
                lib.goToHome = [
                    'go to home', function(){
                        var homeLink = api.find('#navbar a:contains("Home"):visible');
                        api.highlight(homeLink).say(globals.skipMessages?'':'This is "Home" link that we will use to search for product').result((1 === homeLink.length) ? "" : "Cant find home link");
                    }
                ]
            ],
            addToCart: [
                lib.goToHomeSteps = [
                    lib('goToHome'),
                    api.clicker(api.waiter(
                        function(){
                            return (1 === lib.searchBox().length);
                        },
                        function(result){
                            api.highlight(lib.searchBox()).say(globals.skipMessages?'':'Here is search box, which means, that we came to home page.').result(result ? "" : "Cant navigate to home");
                        }
                    ))
                ],
                lib.searchBox = function searchBox(){
                    return api.find('input[type="text"][name="partNumber"]:visible');
                },
                lib('searchStepFactory', 123)(function (param) { return [
                    'find search box', function(){
                        var input = lib.searchBox();
                        api.highlight(input).say(globals.skipMessages?'':('Here is search box, let\'s put our number (' + task.partno + ') into it. This was parametrised snippet, parameter value: ' + param)).result((1 === input.length) ? "" : "Cant find search box");
                    }, api.type('partno'),
                    'find search button', function(){
                        var searchButton = api.find('input[type="submit"][value="Search"]:visible');
                        api.highlight(searchButton).say(globals.skipMessages?'':'Here is search button').result((1 === searchButton.length) ? "" : "Cant find search button");
                    },
                ]}),
                'demo: make sure, that we can still access both search box and search buttons as 2nd and 3rd parameters', function(searchButtonElement,searchBoxElement) {
                    api.arrow(searchBoxElement).arrow(searchButtonElement).result();
                },
                'find search button again', function(demoArray,searchButton) {
                    api.highlight(searchButton).result();
                },
                'click search button', function(searchButton){
                    searchButton.each(function(i,el){lib.click(el);});
                    api.waitFor(function(){
                        return (1 === lib.searchResultsHeading().length);
                    }, function(result){
                        api.highlight(lib.searchResultsHeading()).say(globals.skipMessages?'':'Here is search results heading, which means, that search operation was successful').result(result? "" : "Cant search");
                    });
                },
                'find suitable item', function(){
                    var rows = api.find('#container table tbody tr');
                    var found = false;
                    rows.each(function(i,el){
                        if (
                            (api.find(el).find('td:nth-child(1)').text() === task.partno) && 
                            (parseInt(api.find(el).find('td:nth-child(3)').text()) === 1) &&
                            (parseFloat(api.find(el).find('td:nth-child(4)').text()) <= (task.price * 1.02))
                        ){
                            api.highlight(el).say(globals.skipMessages?'':'This row looks suitable for our search criteria').result("");
                            found = true;
                            return false;
                        }
                    });
                    if (!found){
                        api.highlight().say(globals.skipMessages?'':'We could not find any suitable lines').result("Cant find suitable items for " + String(task.partno), true);
                    }
                },
                'find quantity box', function(row){
                    var input = api.find(row).find('td:nth-child(5) input[type="text"]:visible');
                    api.highlight(input).say(globals.skipMessages?'':'This is quantity box').result((1 === input.length) ? "" : "Cant find quantity input");
                },
                api.typer(
                    function(){ 
                        return task.quantity; 
                    }, 
                    function(){ 
                        if (! globals.skipMessages) {
                            api.say(task.overrideMessage || ('Let\'s put necessary quantity (' + task.quantity + ') into it'));
                        }
                        api.result();
                    }
                ),
                'remember current amount in cart', function(){
                    var cart = lib.cartAmountElement();
                    var currentCartAmount = globals.currentCartAmount = parseInt(cart.text());
                    api.highlight(cart).say(globals.skipMessages?'':('We are going to remember current cart amount (' + currentCartAmount + ') and after we\'ll add more items to cart - we are going to check, that cart amount increased accordingly')).return(currentCartAmount).result();
                },
                'find Add to cart button', function(cart, input){
                    var add = api.find(input).closest('tr').find('td:nth-child(5) a:visible');
                    api.highlight(add).say(globals.skipMessages?'':'This is "Add to cart" button').result((1 === add.length) ? "" : "Cant find add to cart link");
                },
                'click on Add to cart button', function(add){
                    if (!task.quantity) return api.result();
                    add.each(function(i,el){lib.click(el);});
                    api.waitFor(function(){
                        return globals.currentCartAmount !== parseInt(lib.cartAmountElement().text());
                    }, function(r){
                        api.highlight(add).say(globals.skipMessages?'':'Something was added, let\'s check what in the next step').result(r ? "" : "Cant add to cart - total cart amount is not changing");
                    });
                },
                'make sure, that cart amount increased properly', function(resultOfClick, addToCartButton, oldCartAmount, repeat5){
                    var cart = lib.cartAmountElement();
                    api.highlight(cart);
                    api.say(globals.skipMessages?'':'Let\'s make sure, that total cart amount increased appropriately').result(((oldCartAmount + task.quantity) === parseInt(cart.text())) ? "" : ("new total cart amount is incorrect: " + api.compare(oldCartAmount + task.quantity, cart.text())));
                },
                'make sure, that hint appeared', function(cart, click, add){
                    if (!task.quantity) return api.result();
                    var hint = api.find(add).closest('tr').next();
                    api.highlight(hint).say(globals.skipMessages?'':'Here is hint box').result((1 === hint.length) ? "" : "Cant find hint line");
                },
                'make sure, that quantity on hint is correct', function(hint){
                    var bold = hint.find('strong');
                    api.highlight(bold).say(globals.skipMessages?'':'Let\'s make sure, that amount in the hint is correct').result(((1 === hint.length) && (task.quantity === parseInt(hint.text()))) ? "" : "Hint problems");
                }
            ],
            dummyStepsStorageOfSamples: [
                lib.staticSteps1 = [
                    'static samples step 1 1', function() {
                        api.return('static samples step 1 1').result();
                    }
                ],
                lib('dynamicStep1')(function(param) { return [
                    'dynamic samples step', function() {
                        api.return('dynamic samples step ' + param).result();
                    }
                ]}),
                lib.theHelper = function() {
                    return 'helperOfSamples';
                }
            ]
        };
    };
    // here we use global cartFillerAPI function, which will be exposed by
    // cartFiller by default. In some later version name of this function
    // will probably be configurable through bookmarklet parameters
    cartFillerAPI().registerWorker(registerCallback);
})(window, document);