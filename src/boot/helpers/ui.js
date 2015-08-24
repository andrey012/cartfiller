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
    /**
     * Indicates, that ChooseJob frame is already loaded. ChooseJob frame
     * is loadeda after both main and worker frames are completely initialized. 
     * This is done to allow ChooseJob frame submit job immediately without user
     * interaction.
     * @member {boolean} CartFiller.UI~chooseJobFrameLoaded
     * @access private
     */
    var chooseJobFrameLoaded = false;
    /**
     * Structure, that keeps information about highlighted element
     * @class CartFiller.UI.ArrowToElement
     */
    /**
     * @member {HtmlElement} CartFiller.UI.ArrowToElement#element
     * @access public
     */
    /**
     * @member {integer} CartFiller.UI.ArrowToElement#left
     * @access public
     */
    /**
     * @member {integer} CartFiller.UI.ArrowToElement#top 
     * @access public
     */
    /**
     * @member {integer} CartFiller.UI.ArrowToElement#width
     * @access public
     */
    /**
     * @member {integer} CartFiller.UI.ArrowToElement#height
     * @access public
     */
    /**
     * Keeps list of highlighted elements, which we should draw marking arrows to
     * @member {CartFiller.UI.ArrowToElement} CartFiller.UI~arrowToElements
     * @access private
     */
    var arrowToElements = [];
    /**
     * Keeps list of elements, which we should highlight
     * @member {CartFiller.UI.ArrowToElement} CartFiller.UI~highlightedElements
     * @access private
     */
    var highlightedElements = [];
    /**
     * Keeps current message to say
     * @member {String} CartFiller.UI~messageToSay
     * @access private
     */
    var messageToSay = '';
    /**
     * Keeps current message that is already on the screen to trigger refresh
     * @member {String} CartFiller.UI~currentMessageOnScreen
     * @access private
     */
    var currentMessageOnScreen = '';
    /**
     * Keeps current remaining attempts to adjust message div to fit whole message 
     * on current viewport
     * @member {String} CartFiller.UI~messageAdjustmentRemainingAttempts
     * @access private
     */
    var messageAdjustmentRemainingAttempts = 0;
    /**
     * Keeps current message div width, which is adjusted (made wider) in
     * steps until message will fit in current viewport
     * @member {integer} CartFiller.UI~currentMessageDivWidth
     * @access private
     */
    var currentMessageDivWidth = false;
    /**
     * Is set to true if UI is working in framed mode
     * This lets us draw overlays in main window instead of main frame
     * @member {boolean} CartFiller.UI~isFramed
     * @access private
     */
    var isFramed = false;
    /**
     * Keeps current size of worker (job progress) frame, can be either 'small' or 'big'
     * @member {String} CartFiller.UI~currentWorkerFrameSize
     * @access private
     */
    var currentWorkerFrameSize = 'big';
    /**
     * If set to true then we'll report elements on which mouse pointer is right now
     * @member {boolean} CartFiller.UI~reportMousePointer
     * @access private
     */
    var reportMousePointer = false;
    /**
     * Returns window, that will be used to draw overlays
     * @function {Window} CartFiller.UI~overlayWindow
     * @access private
     */
    var overlayWindow = function(){
        return isFramed && 0 ? window : me.modules.ui.mainFrameWindow;
    };
    /**
     * Returns color for red overlay arrows
     * @function CartFiller.UI~getRedArrowColorDefinition
     * @return {String}
     * @access private
     */
    var getRedArrowColor = function(){
        return 'rgba(255,0,0,0.3)';
    };
    /**
     * Creates overlay div for red arrows
     * @function CartFiller.UI~getOverlayDiv2
     * @return {HtmlElement} div
     * @access private
     */
    var getOverlayDiv2 = function(){ 
        var div = overlayWindow().document.createElement('div');
        div.style.position = 'fixed';
        div.style.backgroundColor = getRedArrowColor();
        div.style.zIndex = getZIndexForOverlay();
        div.className = overlayClassName;
        div.onclick = function(){removeOverlay(true);};
        overlayWindow().document.getElementsByTagName('body')[0].appendChild(div);
        return div;
    };
    /**
     * Draws vertical arrow line
     * @function CartFiller.UI~verticalLineOverlay
     * @param {integer} left
     * @param {integer} top
     * @param {integer} height
     * @access private
     */
    var verticalLineOverlay = function(left, top, height){
        var div = getOverlayDiv2();
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = '20px';
        div.style.height = height + 'px';
    };
    /**
     * Draws horizontal overlay line
     * @function CartFiller.UI~horizontalLineOverlay
     * @param {integer} left
     * @param {integer} top
     * @param {integer} width
     * @access private
     */
    var horizontalLineOverlay = function(left, top, width) {
        var div = getOverlayDiv2();
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = width + 'px';
        div.style.height = '20px';
    };
    /**
     * Draws horizontal overlay arrow, direction = right
     * @function CartFiller.UI~horizontalArrowOverlayRight
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var horizontalArrowOverlayRight = function (left, top){
        var div = getOverlayDiv2();
        div.style.left = left + 'px';
        div.style.top = (top - 25) + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderTop = div.style.borderBottom = '25px solid transparent';
        div.style.borderLeft = '30px solid rgba(255,0,0,0.3)';
    };
    /**
     * Draws vertical overlay arrow, direction = down
     * @function CartFiller.UI~verticalArrowOverlayDown
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var verticalArrowOverlayDown = function(left, top){
        var div = getOverlayDiv2();
        div.style.left = (left - 25) + 'px';
        div.style.top = top + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderLeft = div.style.borderRight = '25px solid transparent';
        div.style.borderTop = '30px solid rgba(255,0,0,0.3)';
    };
    /**
     * Shifts client bounding rectangle if an element is inside frame(s)
     * @param {Object} rect Client bounding rect
     * @param {HtmlElement} el
     * @return {Object} rect
     * @access private
     */
    var shiftRectWithFrames = function(rect, el){
        if (undefined !== el.ownerDocument && undefined !== el.ownerDocument.defaultView && undefined !== el.ownerDocument.defaultView.parent && el.ownerDocument.defaultView.parent !== el.ownerDocument.defaultView) {
            var frames = [];
            try {
                frames = el.ownerDocument.defaultView.parent.document.getElementsByTagName('iframe');
            } catch (e) {}
            for (var i = frames.length - 1 ; i >= 0 ;i --){
                var frameDocument;
                try {
                    frameDocument = frames[i].contentDocument;
                } catch (e){}
                var frameWindow;
                try {
                    frameWindow = frames[i].contentWindow;
                } catch (e){}
                if (
                    (frameDocument === el.ownerDocument) ||
                    (el.ownerDocument !== undefined && el.ownerDocument.defaultView === frameWindow)
                ){
                    var frameRect = frames[i].getBoundingClientRect();
                    var newRect = {
                        top: rect.top + frameRect.top,
                        bottom: rect.bottom + frameRect.top,
                        left: rect.left + frameRect.left,
                        right: rect.right + frameRect.left,
                        width: rect.width,
                        height: rect.height
                    };
                    return shiftRectWithFrames(newRect, frames[i]);
                }
            }
        }
        return rect;
    };
    /**
     * Draws vertical overlay arrow, direction = up
     * @function CartFiller.UI~verticalArrowOverlayUp
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var verticalArrowOverlayUp = function(left, top){
        var div = getOverlayDiv2();
        div.style.left = (left - 25) + 'px';
        div.style.top = top + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderLeft = div.style.borderRight = '25px solid transparent';
        div.style.borderBottom = '30px solid rgba(255,0,0,0.3)';
    };
    var findChanges = function(elements){
        var rebuild = false, i, top, left, width, height, element, rect;
        // check whether positions of elements have changed
        for (i = elements.length - 1; i >= 0; i--){
            element = elements[i];
            rect = element.element.getBoundingClientRect();
            rect = shiftRectWithFrames(rect, element.element);
            if (rect.width > 0 || rect.height > 0 || rect.left > 0 || rect.top > 0) {
                top = Math.round(rect.top - 5);
                left = Math.round(rect.left - 5);
                height = Math.round(rect.height + 9);
                width = Math.round(rect.width + 9);
            } else {
                element.left = element.right = element.top = element.bottom = undefined;
            }
            if ((top !== element.top) ||
                (left !== element.left) ||
                (height !== element.height) ||
                (width !== element.width)){
                rebuild = true;
                element.top = top;
                element.left = left;
                element.height = height;
                element.width = width;
            }
        }
        return rebuild;
    };
    /**
     * Draws arrow overlay divs
     * @function CartFiller.UI~drawArrows
     * @access private
     */
    var drawArrows = function(){
        var i, top, left, bottom;
        for (i = arrowToElements.length - 1; i >= 0; i--){
            var el = arrowToElements[i];
            if (el.left === undefined) {
                continue;
            }
            var div = getOverlayDiv2();
            div.style.backgroundColor = 'transparent';
            div.style.borderLeft = div.style.borderTop = div.style.borderRight = div.style.borderBottom = '5px solid rgba(255,0,0,0.3)';
            div.style.left = el.left + 'px';
            div.style.top = el.top + 'px';
            div.style.width = el.width + 'px';
            div.style.height = el.height + 'px';
            div.style.boxSizing = 'border-box';
            if (el.left > 40) {
                top = el.top + Math.round(el.height/2);
                verticalLineOverlay(0, 0, top - 10);
                horizontalLineOverlay(0, top - 10, el.left - 30);
                horizontalArrowOverlayRight(el.left - 30, top);
            } else if (el.top > 40) {
                left = el.left + Math.min(30, Math.round(el.width / 2));
                horizontalLineOverlay(0, 0, left - 10);
                verticalLineOverlay(left - 10, 0, el.top - 30);
                verticalArrowOverlayDown(left, el.top - 30);
            } else {
                left = el.left + Math.min(30, Math.round(el.width / 2));
                bottom = el.top + el.height;
                horizontalLineOverlay(0, bottom + 60, left + 10);
                verticalLineOverlay(left - 10, bottom + 30, 30);
                verticalArrowOverlayUp(left, bottom);

            }
        }
    };
    /**
     * Finds max bounding rectange of elements
     * @function CartFiller.UI~findMaxRect
     * @param {CartFiller.UI.ArrowToElement[]} elements
     * @param {CartFiller.UI.ArrowToElement[]} moreElements
     * @access private
     */
    var findMaxRect = function(elements, moreElements){
        var src = [elements, moreElements];
        var i, j, left, top, right, bottom, el;
        for (j = src.length - 1 ; j >= 0; j--){
            if (undefined === src[j]) {
                continue;
            }
            for (i = src[j].length - 1; i >= 0; i--){
                el = src[j][i];
                left = undefined === left ? el.left : Math.min(left, el.left);
                right = undefined === right ? (el.left + el.width) : Math.max(right, (el.left + el.width));
                top = undefined === top ? el.top : Math.min(top, el.top);
                bottom = undefined === bottom ? (el.top + el.height) : Math.max(bottom, (el.top + el.height));
            }
        }
        return {left: left, right: right, top: top, bottom: bottom};
    };
    /**
     * Schedules redraw of overlay divs by clearing cached positions
     * @function CartFiller.UI~scheduleOverlayRedraw
     * @param {CartFiller.UI.ArrowToElement[]} elements
     * @access private
     */
    var scheduleOverlayRedraw = function(elements){
        var i;
        for (i = elements.length - 1 ; i >= 0; i --){
            elements[i].left = elements[i].top = elements[i].width = elements[i].height = undefined;
        }
    };
    /**
     * Draws highlighting overlay divs
     * @function CartFiller.UI~drawHighlights
     * @access private
     */
    var drawHighlights = function(){
        var rect = findMaxRect(highlightedElements);
        if (rect.left === undefined) {
            return;
        }
        var pageBottom = me.modules.ui.mainFrameWindow.innerHeight;
        var pageRight = me.modules.ui.mainFrameWindow.innerWidth;
        var border = 5;
        createOverlay(0, 0, Math.max(0, rect.left - border), pageBottom);
        createOverlay(Math.min(pageRight, rect.right + border), 0, pageRight, pageBottom);
        createOverlay(Math.max(0, rect.left - border), 0, Math.min(pageRight, rect.right + border), Math.min(pageBottom, rect.top - border));
        createOverlay(Math.max(0, rect.left - border), Math.max(0, rect.bottom + border), Math.min(pageRight, rect.right + border), pageBottom);
    };
    /**
     * Draws message div
     * @function CartFiller.UI~drawMessage
     * @access private
     */
    var drawMessage = function(){
        var rect = findMaxRect(arrowToElements, highlightedElements);
        if (rect.left === undefined) {
            rect = {top: 0, bottom: 0, left: 0, right: 0};
        }
        if (
            (('string' === typeof messageToSay) && (messageToSay.length > 0)) ||
            (('string' !== typeof messageToSay) && (undefined !== messageToSay) && (null !== messageToSay) && !isNaN(messageToSay))
        ){
            var messageDiv = overlayWindow().document.createElement('div');
            messageDiv.style.display = 'block';
            messageDiv.style.backgroundColor = '#fff';
            messageDiv.style.padding = '10px';
            messageDiv.style.fontSize = '20px;';
            messageDiv.style.zIndex = getZIndexForOverlay() + 1;
            messageDiv.style.border = '#bbb solid 10px';
            messageDiv.style.borderRadius = '20px';
            messageDiv.style.overflow = 'auto';
            messageDiv.style.opacity = '0';
            messageDiv.style.top = (rect.bottom + 5) + 'px';
            messageDiv.style.left = Math.max(0, (Math.round((rect.left + rect.right) / 2) - currentMessageDivWidth)) + 'px';
            messageDiv.style.width = currentMessageDivWidth + 'px';
            messageDiv.style.height = 'auto';
            messageDiv.style.position = 'fixed';
            messageDiv.style.fontSize = '20px';
            messageDiv.className = overlayClassName;
            messageDiv.textContent = messageToSay;
            messageDiv.onclick = function(){removeOverlay(true);};
            overlayWindow().document.getElementsByTagName('body')[0].appendChild(messageDiv);
            messageAdjustmentRemainingAttempts = 100;
            me.modules.ui.adjustMessageDiv(messageDiv);
            currentMessageOnScreen = messageToSay;
        }
    };
    /**
     * Function, that maintains arrows on screen, called time to time.
     * @function CartFiller.UI~arrowToFunction
     * @access private
     */
    var arrowToFunction = function(){
        try {
            var rebuildArrows = findChanges(arrowToElements);
            var rebuildHighlights = findChanges(highlightedElements);
            var rebuildMessage = currentMessageOnScreen !== messageToSay;
            if (rebuildArrows || rebuildHighlights || rebuildMessage){
                removeOverlay();
                drawArrows();
                drawHighlights();
                drawMessage();
            }

        } catch (e) {}
    };
    var currentWindowDimensions = {
        width: false,
        height: false,
        outerWidth: false,
        outerHeight: false,
        workerFrameSize: false,
    };
    /**
     * Function that checks whether dimensions of browser window have changed and 
     * adjusts frames coordinates accordingly
     * @function CartFiller.UI~adjustFrameCoordinates
     * @access private
     */
    var adjustFrameCoordinates = function(){
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight,
            outerWidth = isFramed ? false : window.outerWidth,
            outerHeight = isFramed ? false : window.outerHeight;

        if (me.modules.ui.mainFrameWindow && me.modules.ui.mainFrameWindow.location) {
            var url = false;
            try {
                url = me.modules.ui.mainFrameWindow.location.href;
            } catch (e) {
            }
            if (url) {
                me.modules.dispatcher.updateCurrentUrl(url);
            }
        }
        if (currentWindowDimensions.width !== windowWidth ||
            currentWindowDimensions.height !== windowHeight ||
            currentWindowDimensions.outerWidth !== outerWidth ||
            currentWindowDimensions.outerHeight !== outerHeight ||
            currentWindowDimensions.workerFrameSize !== currentWorkerFrameSize) {
            (function() {
                var mainFrameWidthBig = windowWidth * 0.8 - 1,
                    mainFrameWidthSmall = windowWidth * 0.2 - 1,
                    workerFrameWidthBig = windowWidth * 0.8 - 1,
                    workerFrameWidthSmall = windowWidth * 0.2 - 1,
                    framesHeight = windowHeight - 15,
                    chooseJobFrameLeft = 0.02 * windowWidth + (isFramed ? 0 : 200),
                    chooseJobFrameWidth = 0.76 * windowWidth - (isFramed ? 0 : 200),
                    chooseJobFrameTop = 0.02 * windowHeight,
                    chooseJobFrameHeight = 0.96 * windowHeight;

                    if (isFramed) {
                        me.modules.ui.mainFrame.style.height = framesHeight + 'px';
                    }
                    try {
                        me.modules.ui.workerFrame.style.height = framesHeight + 'px';
                    } catch (e) {}
                    try {
                        me.modules.ui.chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
                        me.modules.ui.chooseJobFrame.style.top = chooseJobFrameTop + 'px';
                        me.modules.ui.chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
                        me.modules.ui.chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
                    } catch (e) {}
                    if (currentWorkerFrameSize === 'big') {
                        if (isFramed) {
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthBig + 'px';
                                me.modules.ui.workerFrame.style.left = mainFrameWidthSmall + 'px';
                            } catch (e) {}
                            try {
                                me.modules.ui.mainFrame.style.width = mainFrameWidthSmall + 'px';
                            } catch (e) {}
                        } else {
                            try {
                                me.modules.ui.mainFrameWindow.resizeTo(1,1);
                            } catch (e) {}
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthBig + 'px';
                                me.modules.ui.workerFrame.style.left = (windowWidth - workerFrameWidthBig - 5) + 'px';
                            } catch (e) {}
                        }
                    } else if (currentWorkerFrameSize === 'small') {
                        if (isFramed) {
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthSmall + 'px';
                                me.modules.ui.workerFrame.style.left = mainFrameWidthBig + 'px';
                            } catch (e) {}
                            try {
                                me.modules.ui.mainFrame.style.width = mainFrameWidthBig + 'px';
                            } catch (e) {}
                        } else {
                            try {
                                me.modules.ui.mainFrameWindow.resizeTo(Math.round(outerWidth*0.8 - 10), Math.round(outerHeight));
                            } catch (e) {}
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthSmall + 'px';
                                me.modules.ui.workerFrame.style.left = (windowWidth - workerFrameWidthSmall - 5) + 'px';
                            } catch (e) {}
                        }
                    }
            })();
            currentWindowDimensions.width = windowWidth;
            currentWindowDimensions.height = windowHeight;
            currentWindowDimensions.outerWidth = outerWidth;
            currentWindowDimensions.outerHeight = outerHeight;
            currentWindowDimensions.workerFrameSize = currentWorkerFrameSize;
        }
    };
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
        div.style.position = 'fixed';
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = (right - left) + 'px';
        div.style.height = (bottom - top) + 'px';
        div.style.backgroundColor = 'rgba(0,0,0,0.3)';
        div.style.zIndex = getZIndexForOverlay();
        div.className = overlayClassName;
        div.onclick = function(){removeOverlay(true);};
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
    var scrollTo = function(elements){
        var rect;
        var bottom = me.modules.ui.mainFrameWindow.innerHeight;
        var right =  me.modules.ui.mainFrameWindow.innerWidth;
        var minLeft, maxLeft, newLeft;
        var minTop, maxTop, newTop;
        if (elements.length > 0){
            if ('function' === typeof elements[0].element.scrollIntoView){
                elements[0].element.scrollIntoView();
            }
        }
        for (var tries = 1000; tries; tries--){
            findChanges(elements);
            rect = findMaxRect(elements);
            newLeft = Math.round((rect.right + rect.left) / 2);
            newTop = Math.round((rect.bottom + rect.top) / 2);
            if ((undefined !== minLeft) && 
               (newLeft >= minLeft) && (newLeft <= maxLeft) &&
               (newTop >= minTop) && (newTop <= maxTop))
            {
                break;
            }
            minLeft = undefined === minLeft ? newLeft : Math.min(minLeft, newLeft);
            maxLeft = undefined === maxLeft ? newLeft : Math.max(maxLeft, newLeft);
            minTop = undefined === minTop ? newTop : Math.min(minTop, newTop);
            maxTop = undefined === maxTop ? newTop : Math.max(maxTop, newTop);
            me.modules.ui.mainFrameWindow.scrollBy(newLeft - Math.round(right/2), newTop - Math.round(bottom/2));
        }
        scheduleOverlayRedraw(elements);
    };
    /**
     * Removes overlay divs
     * @function CartFiller.UI~removeOverlay
     * @access private
     */
    var removeOverlay = function(forever){
        var i, divs = getDocument().getElementsByTagName('div');
        for (i = divs.length - 1; i >= 0 ; i--){
            if (divs[i].className === overlayClassName) {
                divs[i].parentNode.removeChild(divs[i]);
            }
        }
        divs = overlayWindow().document.getElementsByTagName('div');
        for (i = divs.length - 1; i >= 0 ; i--){
            if (divs[i].className === overlayClassName) {
                divs[i].parentNode.removeChild(divs[i]);
            }
        }
        if (true === forever) {
            arrowToElements = highlightedElements = [];
            messageToSay = '';
        }
    };

    /**
     * Returns src for worker (job progress) frame
     * @function CartFiller.UI~getWorkerFramSrc
     * @returns {String}
     * @access private
     */
    var getWorkerFrameSrc = function(){
        return me.baseUrl + '/index' + (me.concatenated ? '' : '.uncompressed') + '.html' + (me.gruntBuildTimeStamp ? ('?' + me.gruntBuildTimeStamp) : '');        
    };
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
        return 10000000; // TBD look for max zIndex used in the main frame
    };
    // Launch arrowToFunction
    setInterval(arrowToFunction, 200);

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
            this.setSize(show ? 'big' : 'small');
        },
        /**
         * Closes popup window in case of popup UI
         * @function CartFiller.UI#closePopup
         * @access public
         */
        closePopup: function() {

        },
        /**
         * Pops up mainFrame window if it is popup UI, if possible.
         * Implementation depends on UI
         * @function CartFiller.Dispatcher#onMessage_focusMainWindow
         * @access public
         */
        focusMainFrameWindow: function(){},
        /**
         * Highlights element by drawing an overlay
         * @see CartFiller.Api#highlight
         * @function CartFiller.UI#highlight
         * @access public
         */
        highlight: function(element, allElements){
            messageToSay = '';
            var body = this.mainFrameWindow.document.getElementsByTagName('body')[0];
            var i;

            body.style.paddingBottom = this.mainFrameWindow.innerHeight + 'px';

            highlightedElements = [];
            if (null !== element && 'object' === typeof element && 'string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each){
                element.each(function(i,el){
                    highlightedElements.push({element: el}); 
                    if (!allElements) {
                        return false;
                    }
                });
            } else if (element instanceof Array) {
                for (i = element.length -1 ; i >= 0 ; i --){
                    highlightedElements.push({element: element[i]});
                    if (true !== allElements) {
                        break;
                    }
                }
            } else if (undefined !== element) {
                highlightedElements.push({element: element});
            }
            if (highlightedElements.length > 0) {
                setTimeout(function(){
                    scrollTo(highlightedElements);
                },0);
            }
        },
        /**
         * Draw arrow to element(s). 
         * Parameters are same as for {@link CartFiller.UI#highlight}
         * @function CartFiller.UI#arrowTo
         * @access public
         */
        arrowTo: function(element, allElements){
            arrowToElements = [];
            if (null !== element && 'object' === typeof element && 'string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each){
                element.each(function(i,el){
                    arrowToElements.push({element: el}); 
                    if (!allElements) {
                        return false;
                    }
                });
            } else if (element instanceof Array) {
                for (var i = 0; i < element.length; i++){
                    arrowToElements.push({element: element[i]});
                    if (!allElements) {
                        break;
                    }
                }
            } else if (undefined !== element) {
                arrowToElements.push({element: element});
            } else {
                arrowToElements = [];
                removeOverlay(true);
            }
            if (arrowToElements.length > 0) {
                setTimeout(function(){
                    scrollTo(arrowToElements);
                },0);
            }
        },
        /**
         * Displays comment message over the overlay in the main frame
         * @function CartFiller.UI#say
         * @param {String} text
         * @access public
         */
        say: function(text){
            messageToSay = undefined === text ? '' : text;
            currentMessageDivWidth = Math.max(100, Math.round(this.mainFrameWindow.innerWidth * 0.5));
            messageAdjustmentRemainingAttempts = 100;
        },
        /**
         * Finds appropriate position and size for message div
         * to make text fit on page if possible
         * @function CartFiller.UI#adjustMessageDiv
         * @param {HtmlElement} div message div
         * @access public
         */
        adjustMessageDiv: function(div){
            var ui = this;
            setTimeout(function(){
                var ok = true;
                if (messageAdjustmentRemainingAttempts > 0){
                    ok = false;
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
                            currentMessageDivWidth = Math.min(ui.mainFrameWindow.innerWidth, (parseInt(div.style.width.replace('px', '')) + Math.round(ui.mainFrameWindow.innerWidth * 0.04)));
                        }
                    } else {
                        // that's ok 
                        ok = true;
                    }
                    if (ok){
                        div.style.opacity = '1';
                        var p = div.parentNode;
                        if (p) {
                            p.removeChild(div);
                        }
                        overlayWindow().document.getElementsByTagName('body')[0].appendChild(div);
                        messageAdjustmentRemainingAttempts = 0;
                    } else {
                        messageAdjustmentRemainingAttempts --;
                        scheduleOverlayRedraw(arrowToElements);
                        scheduleOverlayRedraw(highlightedElements);
                    }
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
            me.modules.dispatcher.init();
            this.mainFrameWindow = window.open(window.location.href, '_blank', 'resizable=1, height=1, width=1, scrollbars=1');
            this.closePopup = function(){
                this.mainFrameWindow.close();
            };
            this.focusMainFrameWindow = function(){
                this.mainFrameWindow.focus();
            };
            me.modules.dispatcher.registerLoadWatcher();

            var body = window.document.getElementsByTagName('body')[0];
            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentWorkerFrameSize === 'big') ? 'small' : 'big';
                }
                currentWorkerFrameSize = size;
                adjustFrameCoordinates();
                if (size === 'small') {
                    this.mainFrameWindow.focus();
                }
            };

            this.workerFrame = window.document.createElement('iframe');
            this.workerFrame.setAttribute('name', workerFrameName);
            this.workerFrame.style.position='fixed';
            this.workerFrame.style.top = '0px';
            this.workerFrame.style.height = '100%';
            this.workerFrame.style.zIndex = '100000';
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();

            this.chooseJobFrame = window.document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.position='fixed';
            this.chooseJobFrame.style.height = '0px';
            this.chooseJobFrame.style.top = '0px';
            this.chooseJobFrame.style.left = '0px';
            this.chooseJobFrame.style.width = '0px';
            this.chooseJobFrame.style.zIndex = '10000002';
            this.chooseJobFrame.style.background = 'white';
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];
            this.setSize('big');
            // Launch adjustFrameCoordinates
            setInterval(adjustFrameCoordinates, 2000);
        },
        /**
         * Starts Framed type UI
         * @function CartFiller.UI#framed
         * @param {Document} document Document where we are at the moment of injecting
         * @param {Window} window Window, that we are at the moment of injecting
         * @access public
         */
        framed: function(document, window) {
            isFramed = true;
            me.modules.dispatcher.init();
            var body = document.getElementsByTagName('body')[0];
            var mainFrameSrc = window.location.href;

            while (body.children.length) {
                body.removeChild(body.children[0]);
            }
            this.mainFrame = document.createElement('iframe');
            this.mainFrame.setAttribute('name', mainFrameName);
            this.mainFrame.style.height = '0px';
            this.mainFrame.style.position = 'fixed';
            this.mainFrame.style.left = '0px';
            this.mainFrame.style.top = '0px';
            this.mainFrame.style.borderWidth = '0px';

            this.workerFrame = document.createElement('iframe');
            this.workerFrame.setAttribute('name', workerFrameName);
            this.workerFrame.style.height = '0px';
            this.workerFrame.style.position = 'fixed';
            this.workerFrame.style.top = '0px';

            this.chooseJobFrame = document.createElement('iframe');
            this.chooseJobFrame.setAttribute('name', chooseJobFrameName);
            this.chooseJobFrame.style.display = 'none';
            this.chooseJobFrame.style.height = '0px';
            this.chooseJobFrame.style.top = '0px';
            this.chooseJobFrame.style.left = '0px';
            this.chooseJobFrame.style.width = '0px';
            this.chooseJobFrame.style.position = 'fixed';
            this.chooseJobFrame.style.background = 'white';
            this.chooseJobFrame.style.zIndex = '10000002';
            body.appendChild(this.mainFrame);
            this.mainFrameWindow = window.frames[mainFrameName];

            me.modules.dispatcher.registerLoadWatcher();
            this.mainFrameWindow.location.href=mainFrameSrc;
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentWorkerFrameSize === 'big') ? 'small' : 'big';
                }
                currentWorkerFrameSize = size;
                adjustFrameCoordinates();
            };

            this.setSize('big');
            // Launch adjustFrameCoordinates
            setInterval(adjustFrameCoordinates, 2000);
        },
        /**
         * Refreshes worker page
         * @function CartFiller.UI#refreshPage
         * @access public
         */
        refreshPage: function() {
            this.mainFrameWindow.location.reload();
        },
        /**
         * Starts reporting mouse pointer - on each mousemove dispatcher 
         * will send worker frame a message with details about element
         * over which mouse is now
         * @function CartFiller.UI#startReportingMousePointer
         * @access public
         */
        startReportingMousePointer: function() {
            if (! reportMousePointer) {
                var div = document.createElement('div');
                div.style.height = window.innerHeight + 'px';
                div.style.width = window.innerWidth + 'px';
                div.zindex = 1000;
                div.style.position = 'absolute';
                div.style.left = '0px';
                div.style.top = '0px';
                div.style.backgroundColor = 'transparent';
                document.getElementsByTagName('body')[0].appendChild(div);
                reportMousePointer = div;
                var x,y;
                div.addEventListener('mousemove', function(event) {
                    x = event.clientX;
                    y = event.clientY;
                },false);
                div.addEventListener('click', function(event) {
                    document.getElementsByTagName('body')[0].removeChild(reportMousePointer);
                    reportMousePointer = false;
                    var el = me.modules.ui.mainFrameWindow.document.elementFromPoint(x,y);
                    var stack = [];
                    var prev;
                    var i, n;
                    while (el && el.nodeName !== 'BODY' && el.nodeName !== 'HTML' && el !== document) {
                        var attrs = [];
                        for (i = el.attributes.length - 1 ; i >= 0 ; i -- ) {
                            n = el.attributes[i].name;
                            if (n === 'id' || n === 'class') {
                                continue;
                            }
                            attrs.push({n: n, v: el.attributes[i].value});
                        }
                        for (prev = el, i = 0; prev; prev = prev.previousElementSibling) {
                            if (prev.nodeName === el.nodeName) {
                                i++;
                            }
                        }
                        stack.unshift({element: el.nodeName.toLowerCase(), attrs: attrs, classes: el.className.split(' ').filter(function(v){return v;}), id: el.id, index: i, text: String(el.innerText).length < 200 ? String(el.innerText) : ''});
                        el = el.parentNode;
                    }
                    me.modules.dispatcher.postMessageToWorker('mousePointer', {x: event.clientX, y: event.clientY, stack: stack});
                });
            }
        },
        /**
         * Sets and resets time to time handler for onbeforeunload
         * @function CartFiller.UI#preventPageReload
         * @access public
         */
        preventPageReload: function(){
            setInterval(function() {
                window.onbeforeunload=function() {
                    setTimeout(function(){
                        me.modules.ui.mainFrameWindow.location.reload();
                    },0);
                    return 'This will cause CartFiller to reload. Choose not to reload if you want just to refresh the main frame.';
                };
            },2000);
        }
    });
}).call(this, document, window);
