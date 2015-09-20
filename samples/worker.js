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
    var registerCallback = function(window, document, api, task, job, globals){
        // some state variables
        /**
         * Indicates, that cart is empty. If set to true, then several 
         * steps can be skipped
         * @member {boolean} CartFiller.SampleWorker~cartIsEmpty 
         * @access private
        */
        var cartIsEmpty = false;

        /**
         * Remembers suitable offer row, which will later be used to add 
         * items to cart
         * @member {tr} CartFiller.SampleWorker~suitableRow 
         * @access private
         */
        var suitableRow;
        /**
         * Returns total cart amount element in the header
         * @function CartFiller.SampleWorker~cartAmountElement
         * @returns {jQuery}
         * @access private
         */
        var cartAmountElement = function(){
            return window.jQuery('#navbar > div > strong:nth-child(1):visible');
        }
        /**
         * Returns search box element
         * @function CartFiller.SampleWorker~searchBox
         * @returns {jQuery}
         * @access private
         */
        var searchBox = function(){
            return window.jQuery('input[type="text"][name="partNumber"]:visible');
        }
        /**
         * Returns search results heading. Used to detect, that we are on
         * search results page
         * @function CartFiller.SampleWorker~searchResultsHeading
         * @returns {jQuery}
         * @access private
         */
        var searchResultsHeading = function(){
            return window.jQuery('h2:contains("Search results"):visible');
        }
        /** 
         * HtmlElement.click() function for PhantomJS
         * @function CartFiller.SampleWorker~click
         * @param {HtmlElement} el
         * @access private
         */
        var click = function(el) {
            var ev = window.document.createEvent('MouseEvent');
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
                'find total amount of items in the cart', [function(el, env){
                    if (env.params.theParam !== 1) throw "params are passed incorrectly";
                    var strong = cartAmountElement();
                    api.highlight(strong).arrow(strong).say(globals.skipMessages?'':'Here is total amount in cart. To start filling the cart we need to make sure, that cart is empty.').result((1 === strong.length) ? "" : "Cant find amount in cart");
                }, {theParam: 1}],
                'check, that cart has more then 0 items', function(strong){
                    cartIsEmpty = ("0" === strong.text());
                    var msg = cartIsEmpty ? 'Cart is empty' : 'Cart is not empty';
                    api.highlight(strong).arrow(strong).say(globals.skipMessages?'':msg).result('', false, msg);
                },
                'if cart is not empty - find link to open cart', function(){
                    api.arrow();
                    if (cartIsEmpty) return api.nop();
                    var cartLink = window.jQuery('#navbar a:contains("Open Cart"):visible');
                    api.highlight(cartLink).say(globals.skipMessages?'':'Here is "open cart" link, we are going to open cart').result((1 === cartLink.length) ? "" : "Cant find link to open cart");
                },
                'if cart is not empty - click on open cart link', function(cartLink){
                    if (cartIsEmpty) return api.nop();
                    cartLink.each(function(i,el){click(el);});
                    api.waitFor(
                        function(){ 
                            return ((undefined !== window.jQuery) && (1 === window.jQuery('h2:contains("Your cart"):visible').length));
                        }, 
                        function(result){ 
                            api.highlight().result(result ? "" : "Cant open cart");
                        }
                    );
                },
                'if cart is not empty - find clear cart button', function(){
                    if (cartIsEmpty) return api.nop();
                    var removeAllItems = window.jQuery('a:contains("Remove all items"):visible');
                    api.highlight(removeAllItems).say(globals.skipMessages?'':'Here is "Remove all" button').result((1 <= removeAllItems.length) ? "" : "Cant find clear cart button");
                },
                'if cart is not empty - click clear cart button', function(removeAllItems){
                    if (cartIsEmpty) return api.nop();
                    removeAllItems.each(function(i,el){click(el);});
                    api.highlight(removeAllItems).say(globals.skipMessages?'':'We are going to clear cart.');
                    api.waitFor(
                        function(){
                            return "0" === cartAmountElement().text();
                        },
                        function(result){
                            api.result(result ? "" : "Cant clear cart");
                        }
                    );
                },
                'if cart was not empty - find cart amount element again', function(){
                    if (cartIsEmpty) return api.nop();
                    var strong = cartAmountElement();
                    api.highlight(strong).say(globals.skipMessages?'':'Let\'s see if cart is empty now').result((1 === strong.length) ? "" : "Cant find cart amount element");
                },
                'if cart was not empty - make sure it is empty now', function(){
                    if (cartIsEmpty) return api.nop();
                    var cartIsEmptyNow = ("0" === cartAmountElement().text());

                    api.highlight(cartAmountElement()).say(globals.skipMessages?'':(cartIsEmptyNow ? 'Cart is empty now' : 'Cart is still not empty')).result(cartIsEmptyNow ? "" : "Cant clear cart - it is still not empty");
                }
            ],
            /**
             * Searches for particular partnumber then looks for 
             * suitable offer and adds requested amount of items to cart, 
             * then makes sure, that requested amount of items were added
             * @member {Array} CartFiller.SampleWorker.SampleWorkerTasks#addToCart
             * @access public
             */
            addToCart: [
                'go to home', function(){
                    var homeLink = window.jQuery('#navbar a:contains("Home"):visible');
                    api.highlight(homeLink).say(globals.skipMessages?'':'This is "Home" link that we will use to search for product').result((1 === homeLink.length) ? "" : "Cant find home link");
                }, 
                'click home', function(homeLink){
                    homeLink.each(function(i,el){click(el);});
                    api.waitFor(
                        function(){
                            return (window.jQuery) && (1 === searchBox().length);
                        },
                        function(result){
                            api.highlight(searchBox()).say(globals.skipMessages?'':'Here is search box, which means, that we came to home page.').result(result ? "" : "Cant navigate to home");
                        }
                    );
                },
                'find search box', function(){
                    var input = searchBox();
                    api.highlight(input).say(globals.skipMessages?'':('Here is search box, let\'s put our number (' + task.partno + ') into it')).result((1 === input.length) ? "" : "Cant find search box");
                }, api.type('partno'),
                'find search button', function(){
                    var searchButton = window.jQuery('input[type="submit"][value="Search"]:visible');
                    api.highlight(searchButton).say(globals.skipMessages?'':'Here is search button').result((1 === searchButton.length) ? "" : "Cant find search button");
                },
                'click search button', function(searchButton){
                    searchButton.each(function(i,el){click(el);});
                    api.waitFor(function(){
                        return (window.jQuery) && (1 === searchResultsHeading().length);
                    }, function(result){
                        api.highlight(searchResultsHeading()).say(globals.skipMessages?'':'Here is search results heading, which means, that search operation was successful').result(result? "" : "Cant search");
                    });
                },
                'find suitable item', function(){
                    var rows = window.jQuery('#container table tbody tr');
                    var found = false;
                    rows.each(function(i,el){
                        if (
                            (window.jQuery(el).find('td:nth-child(1)').text() === task.partno) && 
                            (parseInt(window.jQuery(el).find('td:nth-child(3)').text()) === 1) &&
                            (parseFloat(window.jQuery(el).find('td:nth-child(4)').text()) <= (task.price * 1.02))
                        ){
                            api.highlight(suitableRow = el).say(globals.skipMessages?'':'This row looks suitable for our search criteria').result("");
                            found = true;
                            return false;
                        }
                    });
                    if (!found){
                        api.highlight().say(globals.skipMessages?'':'We could not find any suitable lines').result("Cant find suitable items for " + String(task.partno), true);
                    }
                },
                'find quantity box', function(row){
                    var input = window.jQuery(row).find('td:nth-child(5) input[type="text"]:visible');
                    api.highlight(input).say(globals.skipMessages?'':'This is quantity box').result((1 === input.length) ? "" : "Cant find quantity input");
                },
                'put appropriate quantity', function(input){
                    input.val(task.quantity);
                    input.change();
                    api.highlight(input).say(globals.skipMessages?'':('Let\'s put necessary quantity (' + task.quantity + ') into it')).result();
                },
                'remember current amount in cart', function(){
                    var cart = cartAmountElement();
                    globals.currentCartAmount = parseInt(cart.text());
                    api.highlight(cart).say(globals.skipMessages?'':('We are going to remember current cart amount (' + globals.currentCartAmount + ') and after we\'ll add more items to cart - we are going to check, that cart amount increased accordingly')).result();
                },
                'find Add to cart button', function(){
                    var add = window.jQuery(suitableRow).find('td:nth-child(5) a:visible');
                    api.highlight(add).say(globals.skipMessages?'':'This is "Add to cart" button').result((1 === add.length) ? "" : "Cant find add to cart link");
                },
                'click on Add to cart button', function(add){
                    if (!task.quantity) return api.result();
                    add.each(function(i,el){click(el);});
                    api.waitFor(function(){
                        return globals.currentCartAmount !== parseInt(cartAmountElement().text());
                    }, function(r){
                        api.highlight(add).say(globals.skipMessages?'':'Something was added, let\'s check what in the next step').result(r ? "" : "Cant add to cart - total cart amount is not changing");
                    });
                },
                'make sure, that hint appeared', function(){
                    if (!task.quantity) return api.result();
                    var hint = window.jQuery(suitableRow).next();
                    api.highlight(hint).say(globals.skipMessages?'':'Here is hint box').result((1 === hint.length) ? "" : "Cant find hint line");
                },
                'make sure, that quantity on hint is correct', function(hint){
                    var bold = hint.find('strong');
                    api.highlight(bold).say(globals.skipMessages?'':'Let\'s make sure, that amount in the hint is correct').result(((1 === hint.length) && (task.quantity === parseInt(hint.text()))) ? "" : "Hint problems");
                },
                'make sure, that cart amount increased properly', function(){
                    var cart = cartAmountElement();
                    api.highlight(cart);
                    api.say(globals.skipMessages?'':'Let\'s make sure, that total cart amount increased appropriately').result(((globals.currentCartAmount + task.quantity) === parseInt(cart.text())) ? "" : "new total cart amount is incorrect");
                }
            ]
        };
    };
    // here we use global cartFillerAPI function, which will be exposed by
    // cartFiller by default. In some later version name of this function
    // will probably be configurable through bookmarklet parameters
    cartFillerAPI().registerWorker(registerCallback);
})(window, document);