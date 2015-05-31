/**
 * Manages effects on main frame, which shows target site
 * 
 * @class CartFiller.UI
 */
(function(document, window, undefined){
    'use strict';
    /**
     * Just to make code shorter
     * @member {CartFiller.configuration} CartFiller.UI~me
     * @access private
     */
    var me = this.cartFillerConfiguration;
    /**
     * Keeps current size of worker (job progress) frame
     * @member {String} CartFiller.UI~currentSize can be 'big' or 'small'
     * @access private
     */
    var currentSize;
    /**
     * @const {String} CartFiller.UI~overlayClassName
     * @default
     */
    var overlayClassName = 'cartFillerOverlayDiv';
    /**
     * @const {String} CartFiller.UI~mainFrameName
     * @default
     */
    var mainFrameName = 'cartFillerMainFrame';
    /**
     * @const {String} CartFiller.UI~workerFrameName
     * @default
     */
    var workerFrameName = 'cartFillerWorkerFrame';
    /**
     * @const {String} CartFiller.UI~chooseJobFrameName
     * @default
     */
    var chooseJobFrameName = 'cartFillerChooseJobFrame';
    ////
    var chooseJobFrameLoaded = false;
    /**
     * Returns main frame document
     * @function CartFiller.UI~getDocument
     * @returns {Document}
     * @access private
     */
    var getDocument = function(){
        return me.modules.ui.mainFrameWindow.document;
    };
    /**
     * Returns horizontal scroll position
     * @function CartFiller.UI~getScrollLeft
     * @returns {integer} 
     * @access private
     */
    var getScrollLeft = function(){
        return getDocument().documentElement.scrollLeft || getDocument().body.scrollLeft;
    };
    /**
     * Returns vertical scroll position
     * @function CartFiller.UI~getScrollTop
     * @returns {integer}
     * @access private
     */
    var getScrollTop = function(){
        return  getDocument().documentElement.scrollTop || getDocument().body.scrollTop;

    };
    /**
     * Creates overlay div
     * @function CartFiller.UI~createOverlay
     * @param {integer} left
     * @param {integer} top
     * @param {integer} right
     * @param {integer} bottom
     * @access private
     */
    var createOverlay = function(left, top, right, bottom){
        left = Math.round(left);
        top = Math.round(top);
        right = Math.round(right);
        bottom = Math.round(bottom);
        var div =  getDocument().createElement('div');
        div.style.position = 'absolute';
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = (right - left) + 'px';
        div.style.height = (bottom - top) + 'px';
        div.style.backgroundColor = 'rgba(0,0,0,0.3)';
        div.style.zIndex = getZIndexForOverlay();
        div.className = overlayClassName;
        div.onclick = function(){removeOverlay();};
        getDocument().getElementsByTagName('body')[0].appendChild(div);

    };
    /**
     * Scrolls both vertically and horizontally to make center of specified
     * rectangle be in the center of window if possible
     * @function CartFiller.UI~scrollTo
     * @param {integer} left
     * @param {integer} top
     * @param {integer} right
     * @param {integer} bottom
     * @access private
     */
    var scrollTo = function(left, top, right, bottom){
        var centerX = (right + left ) / 2;
        var centerY = (bottom + top) / 2;
        var currentLeft, currentTop;
        var destX = centerX - ( getDocument().documentElement.clientWidth / 2);
        var destY = centerY - ( getDocument().documentElement.clientHeight / 2);
        var minLeft, maxLeft;
        minLeft = maxLeft = currentLeft = getScrollLeft();
        var minTop, maxTop;
        minTop = maxTop = currentTop = getScrollLeft();
        for (var tries = 1000; tries; tries--){
            minLeft = Math.min(minLeft, currentLeft);
            maxLeft = Math.max(maxLeft, currentLeft);
            minTop = Math.min(minTop, currentTop);
            maxTop = Math.max(maxTop, currentTop);
            me.modules.ui.mainFrameWindow.scrollBy(destX - currentLeft, destY -  currentTop);
            currentLeft = getScrollLeft();
            currentTop = getScrollTop();
            if ((currentLeft >= minLeft) && (currentLeft <= maxLeft) &&
                (currentTop >= minTop) && (currentTop <= maxTop)) {
                break;
            }
        }

    };
    /**
     * Removes overlay divs
     * @function CartFiller.UI~removeOverlay
     * @access private
     */
    var removeOverlay = function(){
        var divs =  getDocument().getElementsByClassName(overlayClassName);
        for (var i = divs.length - 1; i >= 0 ; i--){
            divs[i].parentNode.removeChild(divs[i]);
        }
    };

    /**
     * Returns src for worker (job progress) frame
     * @function CartFiller.UI~getWorkerFramSrc
     * @returns {String}
     * @access private
     */
    var getWorkerFrameSrc = function(){
        return me.baseUrl + '/index' + (me.concatenated ? '.min' : '') + '.html' + (me.gruntBuildTimeStamp ? ('?' + me.gruntBuildTimeStamp) : '');        
    };
    /**
     * Horizontal position of center of highlighted element
     * @member {integer} CartFiller.UI~highlightedElementCenterLeft
     * @access private
     */
    var highlightedElementCenterLeft = false;
    /**
     * Vertical position of top of highlighted element
     * @member {integer} CartFiller.UI~highlightedElementTop
     * @access private
     */
    var highlightedElementTop = false;
    /**
     * Vertical position of bottom of highlighted element
     * @member {integer} CartFiller.UI~highlightedElementBottom
     * @access private
     */
    var highlightedElementBottom = false;
    /**
     * Returns z-index for overlay divs. 
     * @function {integer} CartFiller.UI~getZIndexForOverlay
     * @access private
     */
    var getZIndexForOverlay = function(){
        return 100000; // TBD look for max zIndex used in the main frame
    };

    me.scripts.push({

        /**
         * Returns name used by loader to organize modules
         * @function CartFiller.Api#getName 
         * @returns {String}
         * @access public
         */
        getName: function(){ return 'ui'; },
        /** 
         * Sets size of worker (job progress) frame. Implementation
         * depends on particular type of UI - framed or popup
         * @function CartFiller.UI#setSize
         * @param {String} size can be 'big' or 'small'
         * @acces public
         */
        setSize: function() {},
        /**
         * Shows or hides Choose Job frame
         * @function CartFiller.UI#showHideChooseJobFrame
         * @param {boolean} show true to show, false to hide
         * @access public
         */
        showHideChooseJobFrame: function(show){
            if (show && !chooseJobFrameLoaded) {
                // load choose job frame now
                this.chooseJobFrameWindow.location.href = me['data-choose-job'];
                chooseJobFrameLoaded = true;
            }
            this.chooseJobFrame.style.display = show ? 'block' : 'none';
        },
        /**
         * Closes popup window in case of popup UI
         * @function CartFiller.UI#closePopup
         * @access public
         */
        closePopup: function() {

        },
        /**
         * Highlights element by drawing an overlay
         * @see CartFiller.Api#highlight
         * @function CartFiller.UI#highlight
         * @access public
         */
        highlight: function(element, allElements){
            var findMaxRect = function(rect, thisRect){
                rect.left = (undefined === rect.left) ? thisRect.left : Math.min(rect.left, thisRect.left);
                rect.right = (undefined === rect.right) ? thisRect.right : Math.max(rect.right, thisRect.right);
                rect.top = (undefined === rect.top) ? thisRect.top : Math.min(rect.top, thisRect.top);
                rect.bottom = (undefined === rect.bottom) ? thisRect.bottom : Math.max(rect.bottom, thisRect.bottom);
            }
            var rect;
            var body = this.mainFrameWindow.document.getElementsByTagName('body')[0];
            body.style.paddingBottom = this.mainFrameWindow.innerHeight + 'px';
            var ui = this;
            setTimeout(function(){
                if (undefined !== ui.mainFrameWindow.jQuery && (element instanceof ui.mainFrameWindow.jQuery)){
                    if (1 > element.length) {
                        element = undefined;
                    } else {
                        if (true === allElements) {
                            rect = {left: undefined, right: undefined, top: undefined, bottom: undefined};
                            element.each(function(i,el){ findMaxRect(rect, el.getBoundingClientRect()); });
                         } else {
                            rect = element[0].getBoundingClientRect();
                         }
                    }
                } else if (element instanceof Array) {
                    if (true === allElements) {
                        rect = {left: undefined, right: undefined, top: undefined, bottom: undefined};
                        for (var i = element.length - 1 ; i >= 0 ; i--){
                            findMaxRect(rect, element[i].getBoundingClientRect());
                        }
                    } else if (element.length > 0) {
                        rect = element[0].getBoundingClientRect();
                    } else {
                        element = undefined;
                    }
                } else if (undefined !== element) {
                    rect = element.getBoundingClientRect();
                }
                var full = body.getBoundingClientRect();
                var scrollTop = getScrollTop();
                var scrollLeft = getScrollLeft();
                var pageRight = Math.max(full.right + scrollLeft, body.scrollWidth, ui.mainFrameWindow.innerWidth) - 1;
                var pageBottom = Math.max(full.bottom + scrollTop, body.scrollHeight, ui.mainFrameWindow.innerHeight) - 1;
                removeOverlay();
                if (undefined !== element) {
                    var border = 5;
                    highlightedElementCenterLeft = scrollLeft + Math.round(rect.left + rect.right) / 2;
                    highlightedElementBottom = scrollTop + rect.bottom;
                    highlightedElementTop = scrollTop + rect.top;
                    createOverlay(0, 0, Math.max(0, rect.left + scrollLeft - border), pageBottom);
                    createOverlay(Math.min(pageRight, rect.right + scrollLeft + border), 0, pageRight, pageBottom);
                    createOverlay(Math.max(0, rect.left + scrollLeft - border), 0, Math.min(pageRight, rect.right + scrollLeft + border), Math.min(pageBottom, rect.top + scrollTop - border));
                    createOverlay(Math.max(0, rect.left + scrollLeft - border), Math.max(0, rect.bottom + scrollTop + border), Math.min(pageRight, rect.right + scrollLeft + border), pageBottom);
                    scrollTo(rect.left + scrollLeft, rect.top + scrollTop, rect.right + scrollLeft, rect.bottom + scrollTop);
                } else {
                    createOverlay(0, 0, pageRight, pageBottom);
                    highlightedElementCenterLeft = highlightedElementBottom = highlightedElementTop = false;
                }
            },0);
        },
        /**
         * Displays comment message over the overlay in the main frame
         * @function CartFiller.UI#say
         * @param {String} text
         * @access public
         */
        say: function(text){
            var ui = this;
            setTimeout(function(){
                var initialWidth = Math.max(100, Math.round(ui.mainFrameWindow.innerWidth * 0.5));
                var messageDiv = ui.mainFrameWindow.document.createElement('div');
                messageDiv.style.display = 'block';
                messageDiv.style.backgroundColor = '#fff';
                messageDiv.style.padding = '10px';
                messageDiv.style.fontSize = '20px;';
                messageDiv.style.zIndex = getZIndexForOverlay() + 1;
                messageDiv.style.border = '#bbb solid 10px';
                messageDiv.style.borderRadius = '20px';
                messageDiv.style.overflow = 'auto';
                messageDiv.style.visibility = 'hidden';
                messageDiv.style.top = (highlightedElementBottom + 5) + 'px';
                messageDiv.style.left = Math.max(0, (highlightedElementCenterLeft - initialWidth)) + 'px';
                messageDiv.style.width = initialWidth + 'px';
                messageDiv.style.height = 'auto';
                messageDiv.style.position = 'absolute';
                messageDiv.style.fontSize = '20px';
                messageDiv.className = overlayClassName;
                messageDiv.textContent = text;
                messageDiv.onclick = function(){removeOverlay();};

                ui.mainFrameWindow.document.getElementsByTagName('body')[0].appendChild(messageDiv);
                ui.adjustMessageDiv(messageDiv);
            },0);
        },
        /**
         * Finds appropriate position and size for message div
         * to make text fit on page if possible
         * @function CartFiller.UI#adjustMessageDiv
         * @param {HtmlElement} div message div
         * @param {integer} counter iteration counter. When reaches 100, then
         * this function stops iterating
         * @access public
         */
        adjustMessageDiv: function(div, counter){
            if (undefined === counter) {
                counter = 0;
            }
            var ui = this;
            setTimeout(function(){
                var ok = false;
                if (counter < 100) {
                    var rect = div.getBoundingClientRect();
                    if (rect.bottom > ui.mainFrameWindow.innerHeight){
                        if (rect.width > 0.95 * ui.mainFrameWindow.innerWidth){
                            // let's try scrolling down
                            if ((rect.top - (highlightedElementBottom - highlightedElementTop) - 10) < ui.mainFrameWindow.innerHeight * 0.05){
                                // no more scrolling available
                                ok = true;
                            } else {
                                ui.mainFrameWindow.scrollBy(0, Math.round(ui.mainFrameWindow.innerHeight * 0.05));
                            }
                        } else {
                            // let's make div wider
                            div.style.left = Math.max(0, (parseInt(div.style.left.replace('px', '')) - Math.round(ui.mainFrameWindow.innerWidth * 0.04))) + 'px';
                            div.style.width = Math.min(ui.mainFrameWindow.innerWidth, (parseInt(div.style.width.replace('px', '')) + Math.round(ui.mainFrameWindow.innerWidth * 0.04))) + 'px';
                        }
                    } else {
                        // that's ok 
                        ok = true;
                    }
                } else {
                    ok = true;
                }
                if (ok){
                    div.style.visibility = 'visible';
                } else {
                    ui.adjustMessageDiv(div, counter + 1);
                }
            },0);
        },
        /**
         * Starts Popup type UI
         * @function CartFiller.UI#popup
         * @param {Document} document Document where we are at the moment of injecting
         * @param {Window} window Window, that we are at the moment of injecting
         * @access public
         */
        popup: function(document, window){
            var windowWidth = window.innerWidth,
                windowHeight = window.innerHeight,
                chooseJobFrameLeft = 0.02 * windowWidth,
                chooseJobFrameWidth = 0.76 * windowWidth,
                chooseJobFrameTop = 0.02 * windowHeight,
                chooseJobFrameHeight = 0.96 * windowHeight,
                workerFrameWidthBig = windowWidth * 0.8 - 1,
                workerFrameWidthSmall = windowWidth * 0.2 - 1;

            me.modules.dispatcher.init();
            this.mainFrameWindow = window.open(window.location.href, '_blank', 'height=' + Math.round(window.outerHeight) + ', width=' + Math.round(window.outerWidth*0.8));
            this.closePopup = function(){
                this.mainFrameWindow.close();
            };
            this.mainFrameWindow.addEventListener('load', function(){
                me.modules.dispatcher.onMainFrameLoaded();
            }, true);
            var ui = this;
            setTimeout(function loadWatcher(){
                if (ui.mainFrameWindow.document && 
                    (ui.mainFrameWindow.document.readyState === 'complete')){
                    me.modules.dispatcher.onMainFrameLoaded(true);
                }
                setTimeout(loadWatcher, 100);
            }, 100);

            var body = window.document.getElementsByTagName('body')[0];
            while (body.children.length) {
                body.removeChild(body.children[0]);
            }

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentSize === 'big') ? 'small' : 'big';
                }
                currentSize = size;
                if (size === 'big') {
                    this.workerFrame.style.width = workerFrameWidthBig + 'px';
                    this.workerFrame.style.left = (windowWidth - workerFrameWidthBig - 5) + 'px';
                } else if (size === 'small') {
                    this.workerFrame.style.width = workerFrameWidthSmall + 'px';
                    this.workerFrame.style.left = (windowWidth - workerFrameWidthSmall - 5) + 'px';
                }
            };

            this.workerFrame = window.document.createElement('iframe');
            this.workerFrame.setAttribute('name', workerFrameName);
            this.workerFrame.style.position='fixed';
            this.workerFrame.style.top = '0px';
            this.workerFrame.style.height = '100%';
            this.workerFrame.style.zIndex = '100000';
            this.setSize('big');
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();

            this.chooseJobFrame = window.document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.position='fixed';
            this.chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
            this.chooseJobFrame.style.top = chooseJobFrameTop + 'px';
            this.chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
            this.chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
            this.chooseJobFrame.style.zIndex = '1000000';
            this.chooseJobFrame.style.background = 'white';
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];


        },
        /**
         * Starts Popup type UI
         * @function CartFiller.UI#framed
         * @param {Document} document Document where we are at the moment of injecting
         * @param {Window} window Window, that we are at the moment of injecting
         * @access public
         */
        framed: function(document, window) {
            me.modules.dispatcher.init();
            var body = document.getElementsByTagName('body')[0];
            var mainFrameSrc = window.location.href,
                windowWidth = window.innerWidth,
                windowHeight = window.innerHeight,
                mainFrameWidthBig = windowWidth * 0.8 - 1,
                mainFrameWidthSmall = windowWidth * 0.2 - 1,
                workerFrameWidthBig = windowWidth * 0.8 - 1,
                workerFrameWidthSmall = windowWidth * 0.2 - 1,
                framesHeight = windowHeight - 15,
                chooseJobFrameLeft = 0.02 * windowWidth,
                chooseJobFrameWidth = 0.76 * windowWidth,
                chooseJobFrameTop = 0.02 * windowHeight,
                chooseJobFrameHeight = 0.96 * windowHeight,
                currentSize = 'big';



            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            this.mainFrame = document.createElement('iframe');
            this.mainFrame.setAttribute('name', mainFrameName);
            this.mainFrame.style.height = framesHeight + 'px';
            this.mainFrame.style.position = 'fixed';
            this.mainFrame.style.left = '0px';
            this.mainFrame.style.top = '0px';

            this.workerFrame = document.createElement('iframe');
            this.workerFrame.setAttribute('name', workerFrameName);
            this.workerFrame.style.height = framesHeight + 'px';
            this.workerFrame.style.position = 'fixed';
            this.workerFrame.style.top = '0px';

            this.chooseJobFrame = document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.display = 'none';
            this.chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
            this.chooseJobFrame.style.top = chooseJobFrameTop + 'px';
            this.chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
            this.chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
            this.chooseJobFrame.style.position = 'fixed';
            this.chooseJobFrame.style.background = 'white';
            body.appendChild(this.mainFrame);
            this.mainFrameWindow = window.frames[mainFrameName];

            this.mainFrame.onload = function(){
                me.modules.dispatcher.onMainFrameLoaded();
            };

            this.mainFrameWindow.location.href=mainFrameSrc;
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentSize === 'big') ? 'small' : 'big';
                }
                currentSize = size;
                if (size === 'big') {
                    this.workerFrame.style.width = workerFrameWidthBig + 'px';
                    this.mainFrame.style.width = mainFrameWidthSmall + 'px';
                    this.workerFrame.style.left = mainFrameWidthSmall + 'px';
                } else if (size === 'small') {
                    this.workerFrame.style.width = workerFrameWidthSmall + 'px';
                    this.mainFrame.style.width = mainFrameWidthBig + 'px';
                    this.workerFrame.style.left = mainFrameWidthBig + 'px';
                }
            };

            this.setSize('big');
        }
    });
}).call(this, document, window);