(function(window, document, undefined){
    cartFillerAPI().registerWorker(function(window, document, api, undefined){
        var cartIsEmpty = false;
        var cartAmountElement = function(){
            return window.jQuery('#navbar > div > strong:nth-child(1):visible');
        }
        var searchBox = function(){
            return window.jQuery('input[type="text"][name="partNumber"]:visible');
        }
        var currentCartAmount; 
        var suitableRow;
        return {
            clearCart: [
                'find total amount of items in the cart', function(task){
                    var strong = cartAmountElement();
                    api.highlight(strong).result((1 === strong.length) ? "" : "Cant find amount in cart");
                },
                'check, that cart has more then 0 items', function(task, strong){
                    cartIsEmpty = ("0" === strong.text());
                    api.result();
                },
                'if cart is not empty - find link to open cart', function(task){
                    if (cartIsEmpty) return api.result();
                    var cartLink = window.jQuery('#navbar a:contains("Open Cart"):visible');
                    api.highlight(cartLink).result((1 === cartLink.length) ? "" : "Cant find link to open cart");
                },
                'if cart is not empty - click on open cart link', function(task, cartLink){
                    if (cartIsEmpty) return api.result();
                    cartLink.each(function(i,el){el.click();});
                    api.waitFor(
                        function(){ 
                            return ((undefined !== window.jQuery) && (1 === window.jQuery('h2:contains("Your cart"):visible').length));
                        }, 
                        function(result){ 
                            api.result(result ? "" : "Cant open cart");
                        }
                    );
                },
                'if cart is not empty - find clear cart button', function(task){
                    if (cartIsEmpty) return api.result();
                    var clearCart = window.jQuery('a:contains("Remove all items"):visible');
                    api.highlight(clearCart).result((1 <= clearCart.length) ? "" : "Cant find clear cart button");
                },
                'if cart is not empty - click clear cart button', function(task, clearCart){
                    if (cartIsEmpty) return api.result();
                    clearCart.each(function(i,el){el.click();});
                    api.highlight();
                    api.waitFor(
                        function(){
                            return "0" === cartAmountElement()[0].innerText;
                        },
                        function(result){
                            api.result(result ? "" : "Cant clear cart");
                        }
                    );
                },
                'if cart was not empty - find cart amount element again', function(task){
                    if (cartIsEmpty) return api.result();
                    var strong = cartAmountElement();
                    api.highlight(strong).result((1 === strong.length) ? "" : "Cant find cart amount element");
                },
                'if cart was not empty - make sure it is empty now', function(task){
                    if (cartIsEmpty) return api.result();
                    api.result(("0" === cartAmountElement()[0].innerText) ? "" : "Cant clear cart - it is still not empty");
                }
            ],
            addToCart: [
                'go to home', function(task){
                    var homeLink = window.jQuery('#navbar a:contains("Home"):visible');
                    api.highlight(homeLink).result((1 === homeLink.length) ? "" : "Cant find home link");
                }, 
                'click home', function(task, homeLink){
                    homeLink.each(function(i,el){el.click();});
                    api.waitFor(
                        function(){
                            return (window.jQuery) && (1 === searchBox().length);
                        },
                        function(result){
                            api.result(result ? "" : "Cant navigate to home");
                        }
                    );
                },
                'find search box', function(task){
                    var input = searchBox();
                    api.highlight(input).result((1 === input.length) ? "" : "Cant find search box");
                },
                'put part number into search box', function(task, input){
                    input.val(task.partno);
                    api.result();
                },
                'find search button', function(task){
                    var searchButton = window.jQuery('input[type="submit"][value="Search"]:visible');
                    api.highlight(searchButton).result((1 === searchButton.length) ? "" : "Cant find search button");
                },
                'click search button', function(task, searchButton){
                    searchButton.each(function(i,el){el.click();});
                    api.waitFor(function(){
                        return (window.jQuery) && (1 === window.jQuery('h2:contains("Search results"):visible').length);
                    }, function(result){
                        api.result(result? "" : "Cant search");
                    });
                },
                'find suitable item', function(task){
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
                'find quantity box', function(task, row){
                    var input = window.jQuery(row).find('td:nth-child(5) input[type="text"]:visible');
                    api.highlight(input).result((1 === input.length) ? "" : "Cant find quantity input");
                },
                'put appropriate quantity', function(task, input){
                    input.val(task.quantity);
                    input.change();
                    api.result();
                },
                'remember current amount in cart', function(task){
                    var cart = cartAmountElement();
                    currentCartAmount = parseInt(cart.text());
                    api.highlight(cart).result();
                },
                'find Add to cart button', function(task){
                    var add = window.jQuery(suitableRow).find('td:nth-child(5) a:visible');
                    api.highlight(add).result((1 === add.length) ? "" : "Cant find add to cart link");
                },
                'click on Add to cart button', function(task, add){
                    if (!task.quantity) return api.result();
                    add.each(function(i,el){el.click();});
                    api.waitFor(function(){
                        return currentCartAmount !== parseInt(cartAmountElement().text());
                    }, function(r){
                        api.result(r ? "" : "Cant add to cart - total cart amount is not changing");
                    });
                },
                'make sure, that hint appeared', function(task){
                    if (!task.quantity) return api.result();
                    var hint = window.jQuery(suitableRow).next();
                    api.highlight(hint).result((1 === hint.length) ? "" : "Cant find hint line");
                },
                'make sure, that quantity on hint is correct', function(task, hint){
                    var bold = hint.find('strong');
                    api.highlight(bold).result(((1 === hint.length) && (task.quantity === parseInt(hint.text()))) ? "" : "Hint problems");
                },
                'make sure, that cart amount increased properly', function(task){
                    var cart = cartAmountElement();
                    api.highlight(cart);
                    api.result(((currentCartAmount + task.quantity) === parseInt(cart.text())) ? "" : "new total cart amount is incorrect");
                }
            ]
        }
    });
})(window, document);