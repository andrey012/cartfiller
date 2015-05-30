/**
 * Sample Worker class
 * @class CartFiller.SampleWorker
 */
(function(window, document, undefined){
    // register callback with apiCart
    /**
     * @function CartFiller.SampleWorker~registerCallback
     * @see CartFiller~Api~registerCallback
     * @access private
     */
    var registerCallback = function(window, document, api, task){
        // some state variables
        /**
         * Indicates, that cart is empty. If set to true, then several 
         * steps can be skipped
         * @member {boolean} CartFiller.SampleWorker~cartIsEmpty 
         * @access private
        */
        var cartIsEmpty = false;

        /**
         * Remembers total cart amount before we add new items to the cart. 
         * Used to verify, that exactly required number of items was added 
         * to the cart
         * @member {integer} CartFiller.SampleWorker~currentCartAmount 
         * @access private
         */
        var currentCartAmount;
        
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

        /** 
         * Object, that contains task description code -- functions and
         * comments for particular steps
         * @class CartFiller.SampleWorker.SampleWorkerTasks
         * @augments CartFiller.WorkerTasks
         */
        return {
            /**
             * Makes sure, that cart is empty. If it is not - removes all
             * items from cart
             * @member {Array} CartFiller.SampleWorker.SampleWorkerTasks#clearCart 
             * @access public
             */
            clearCart: [
                'find total amount of items in the cart', function(){
                    var strong = cartAmountElement();
                    api.highlight(strong).result((1 === strong.length) ? "" : "Cant find amount in cart");
                },
                'check, that cart has more then 0 items', function(strong){
                    cartIsEmpty = ("0" === strong.text());
                    api.highlight(strong);
                    api.result();
                },
                'if cart is not empty - find link to open cart', function(){
                    if (cartIsEmpty) return api.nop();
                    var cartLink = window.jQuery('#navbar a:contains("Open Cart"):visible');
                    api.highlight(cartLink).result((1 === cartLink.length) ? "" : "Cant find link to open cart");
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
                    api.highlight(removeAllItems).result((1 <= removeAllItems.length) ? "" : "Cant find clear cart button");
                },
                'if cart is not empty - click clear cart button', function(removeAllItems){
                    if (cartIsEmpty) return api.nop();
                    removeAllItems.each(function(i,el){click(el);});
                    api.highlight(removeAllItems);
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
                    api.highlight(strong).result((1 === strong.length) ? "" : "Cant find cart amount element");
                },
                'if cart was not empty - make sure it is empty now', function(){
                    if (cartIsEmpty) return api.nop();
                    api.highlight(cartAmountElement()).result(("0" === cartAmountElement().text()) ? "" : "Cant clear cart - it is still not empty");
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
                    api.highlight(homeLink).result((1 === homeLink.length) ? "" : "Cant find home link");
                }, 
                'click home', function(homeLink){
                    homeLink.each(function(i,el){click(el);});
                    api.waitFor(
                        function(){
                            return (window.jQuery) && (1 === searchBox().length);
                        },
                        function(result){
                            api.highlight(searchBox()).result(result ? "" : "Cant navigate to home");
                        }
                    );
                },
                'find search box', function(){
                    var input = searchBox();
                    api.highlight(input).result((1 === input.length) ? "" : "Cant find search box");
                },
                'put part number into search box', function(input){
                    input.val(task.partno);
                    api.highlight(input).result();
                },
                'find search button', function(){
                    var searchButton = window.jQuery('input[type="submit"][value="Search"]:visible');
                    api.highlight(searchButton).result((1 === searchButton.length) ? "" : "Cant find search button");
                },
                'click search button', function(searchButton){
                    searchButton.each(function(i,el){click(el);});
                    api.waitFor(function(){
                        return (window.jQuery) && (1 === searchResultsHeading().length);
                    }, function(result){
                        api.highlight(searchResultsHeading()).result(result? "" : "Cant search");
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
                            api.highlight(suitableRow = el).result("");
                            found = true;
                            return false;
                        }
                    });
                    if (!found){
                        api.highlight().result("Cant find suitable items", true);
                    }
                },
                'find quantity box', function(row){
                    var input = window.jQuery(row).find('td:nth-child(5) input[type="text"]:visible');
                    api.highlight(input).result((1 === input.length) ? "" : "Cant find quantity input");
                },
                'put appropriate quantity', function(input){
                    input.val(task.quantity);
                    input.change();
                    api.highlight(input).result();
                },
                'remember current amount in cart', function(){
                    var cart = cartAmountElement();
                    currentCartAmount = parseInt(cart.text());
                    api.highlight(cart).result();
                },
                'find Add to cart button', function(){
                    var add = window.jQuery(suitableRow).find('td:nth-child(5) a:visible');
                    api.highlight(add).result((1 === add.length) ? "" : "Cant find add to cart link");
                },
                'click on Add to cart button', function(add){
                    if (!task.quantity) return api.result();
                    add.each(function(i,el){click(el);});
                    api.waitFor(function(){
                        return currentCartAmount !== parseInt(cartAmountElement().text());
                    }, function(r){
                        api.highlight(add).result(r ? "" : "Cant add to cart - total cart amount is not changing");
                    });
                },
                'make sure, that hint appeared', function(){
                    if (!task.quantity) return api.result();
                    var hint = window.jQuery(suitableRow).next();
                    api.highlight(hint).result((1 === hint.length) ? "" : "Cant find hint line");
                },
                'make sure, that quantity on hint is correct', function(hint){
                    var bold = hint.find('strong');
                    api.highlight(bold).result(((1 === hint.length) && (task.quantity === parseInt(hint.text()))) ? "" : "Hint problems");
                },
                'make sure, that cart amount increased properly', function(){
                    var cart = cartAmountElement();
                    api.highlight(cart);
                    api.result(((currentCartAmount + task.quantity) === parseInt(cart.text())) ? "" : "new total cart amount is incorrect");
                }
            ]
        };
    };
    // here we use global cartFillerAPI function, which will be exposed by
    // cartFiller by default. In some later version name of this function
    // will probably be configurable through bookmarklet parameters
    cartFillerAPI().registerWorker(registerCallback);
})(window, document);