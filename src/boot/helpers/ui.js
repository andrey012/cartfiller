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
    /////
    var elementsToTrack = [];
    /////
    var elementsToDrawByPath = {};

    var trackedIframes = {};
    /**
     * Keeps current message to say
     * @member {String} CartFiller.UI~messageToSay
     * @access private
     */
    var messageToSay = '';
    var messageToSayOptions = {};
    var messageToDraw = '';
    /**
     * Whether to wrap messageToSay with &lt;pre&gt;
     * @member {boolean} CartFiller.UI~wrapMessageToSayWithPre
     * @access private
     */
    var wrapMessageToSayWithPre = false;
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
     * Keeps current message div top divisor from default value which is 
     * adjusted until message will fit in current viewport
     * @member {integer} CartFiller.UI~currentMessageDivTopShift
     * @access private
     */
    var currentMessageDivTopShift = 0;
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
    var prepareToClearOverlays = false;
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
     * @param {String} type
     * @return {HtmlElement} div
     * @access private
     */
    var getOverlayDiv2 = function(type){ 
        var div = overlayWindow().document.createElement('div');
        div.style.position = 'fixed';
        div.style.backgroundColor = getRedArrowColor();
        div.style.zIndex = getZIndexForOverlay();
        div.className = overlayClassName + ' ' + overlayClassName + type;
        div.onclick = function(){me.modules.ui.clearOverlaysAndReflect();};
        var body = overlayWindow().document.getElementsByTagName('body')[0];
        if (body) {
            body.appendChild(div);
        }
        return div;
    };
    var deleteOverlaysOfType = function(type) {
        var divs = overlayWindow().document.getElementsByClassName(overlayClassName + (type ? type : ''));
        for (var i = divs.length - 1; i >= 0; i --) {
            divs[i].parentNode.removeChild(divs[i]);
        }
        divs = overlayWindow().document.getElementsByClassName(overlayClassName + ' ' + overlayClassName + (type ? type : ''));
        for ( i = divs.length - 1; i >= 0; i --) {
            divs[i].parentNode.removeChild(divs[i]);
        }
    };
    /**
     * Draws vertical arrow line
     * @function CartFiller.UI~verticalLineOverlay
     * @param {integer} left
     * @param {integer} top
     * @param {integer} height
     * @access private
     */
    var verticalLineOverlay = function(type, left, top, height){
        var div = getOverlayDiv2(type);
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
    var horizontalLineOverlay = function(type, left, top, width) {
        var div = getOverlayDiv2(type);
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
    var horizontalArrowOverlayRight = function (type, left, top){
        var div = getOverlayDiv2(type);
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
    var verticalArrowOverlayDown = function(type, left, top){
        var div = getOverlayDiv2(type);
        div.style.left = (left - 25) + 'px';
        div.style.top = top + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderLeft = div.style.borderRight = '25px solid transparent';
        div.style.borderTop = '30px solid rgba(255,0,0,0.3)';
    };
    /**
     * Draws vertical overlay arrow, direction = up
     * @function CartFiller.UI~verticalArrowOverlayUp
     * @param {integer} left
     * @param {integer} top
     * @access private
     */
    var verticalArrowOverlayUp = function(type, left, top){
        var div = getOverlayDiv2(type);
        div.style.left = (left - 25) + 'px';
        div.style.top = top + 'px';
        div.style.width = div.style.height = '0px';
        div.style.backgroundColor = 'transparent';
        div.style.borderLeft = div.style.borderRight = '25px solid transparent';
        div.style.borderBottom = '30px solid rgba(255,0,0,0.3)';
    };
    var findChanges = function(elements){
        var rebuild = {}, i, top, left, width, height, element, rect;
        if (! (elements instanceof Array)) {
            var thearray = []; 
            for (i in elements) {
                thearray.push(elements[i]);
            }
            elements = thearray;
        }
        // check whether positions of elements have changed
        for (i = elements.length - 1; i >= 0; i--){
            element = elements[i];
            if (! element || ! element.element) {
                continue;
            }
            rect = element.element.getBoundingClientRect();
            var plusLeft = 0, plusTop = 0;
            if (element.type === 'iframe') {
                try {
                    var style = element.element.ownerDocument.defaultView.getComputedStyle(element.element);
                    plusTop = parseInt(style.borderTopWidth.replace(/[^0-9]/g, ''));
                    plusLeft = parseInt(style.borderLeftWidth.replace(/[^0-9]/g, ''));
                } catch (e) {}
            }
            if (rect.width > 0 || rect.height > 0 || rect.left > 0 || rect.top > 0) {
                top = Math.round(rect.top - 5);
                left = Math.round(rect.left - 5);
                height = Math.round(rect.height + 9);
                width = Math.round(rect.width + 9);
            } else {
                rebuild.any = true;
                if (element.type) {
                    rebuild[element.type] = true;
                }
                element.deleted = true;
                element.element = null;
                continue;   
            }
            if ((top !== element.top) ||
                (left !== element.left) ||
                (height !== element.height) ||
                (width !== element.width)){
                rebuild.any = true;
                if (element.type) {
                    rebuild[element.type] = true;
                }
                element.top = top;
                element.left = left;
                element.height = height;
                element.width = width;
                element.right = left + width;
                element.bottom = top + height;
                element.self = {
                    top: rect.top + plusTop,
                    left: rect.left + plusLeft,
                    right: rect.right + plusLeft,
                    bottom: rect.bottom + plusTop,
                    width: rect.width,
                    height: rect.height
                };
            }
        }
        return rebuild;
    };
    var addFrameCoordinatesMap = function(element) {
        if (! element.path || ! element.path.length) {
            return element;
        }
        var rect = {
            left: element.rect.left,
            top: element.rect.top,
            width: element.rect.width,
            height: element.rect.height,
            originalElement: element
        };
        for (var i = element.path.length - 1; i >= 0 ; i --) {
            var path = element.path.slice(0,i+1).join('/');
            var iframe = trackedIframes[path];
            if (iframe) {
                rect.left += iframe.rect.left;
                rect.top += iframe.rect.top;
            }
        }
        return {rect: rect};
    };
    var sendScrollToPhantom = function(mapped) {
        window.callPhantom({scroll: mapped});
        me.modules.dispatcher.postMessageToWorker('phantomScroll', {scroll: mapped});
    };
    var knownScrollTs = 0;
    var scrollIfNecessary = function() {
        var scrollPretendent, scrollPretendentTs;
        var findScrollPretendent = function(el) {
            if (el.scroll && (el.ts > knownScrollTs)) {
                if (el.ts > scrollPretendentTs || ! scrollPretendentTs) {
                    scrollPretendent = el;
                    scrollPretendentTs = el.ts;
                }
            }
        };
        var currentMainFrameWindowFilter = function(el) { return el.currentMainFrameWindow === me.modules.dispatcher.getFrameWindowIndex(); };
        for (var path in elementsToDrawByPath) {
            elementsToDrawByPath[path]
                .filter(currentMainFrameWindowFilter)
                .filter(findScrollPretendent);
        }
        if (! scrollPretendent && window.callPhantom && currentMessageOnScreen) {
            var messageDiv = overlayWindow().document.getElementsByClassName(overlayClassName + 'message');
            if (messageDiv.length) {
                sendScrollToPhantom({rect: messageDiv[0].getBoundingClientRect()});
            }
        } 
        if (scrollPretendent) {
            knownScrollTs = scrollPretendentTs;
            if (window.callPhantom && (window.callPhantom instanceof Function)) {
                var mapped = addFrameCoordinatesMap(scrollPretendent);
                sendScrollToPhantom(mapped);
            } else {
                var border = 0.25;
                var scroll = [
                    scrollPretendent.rect.left - (getInnerWidth() * border),
                    scrollPretendent.rect.top - (getInnerHeight() * border)
                ];
                for (var i = 0 ; i < 2 ; i ++ ) {
                    if (scroll[i] < 0) {
                        // we need to scroll up/left - that's ok
                    } else {
                        // we need to scroll down/right -- only if element does not fit
                        // to the 20...80 % rect
                        scroll[i] = Math.min(scroll[i], Math.max(0, scrollPretendent.rect[i ? 'bottom' : 'right'] - (i ? getInnerHeight() : getInnerWidth()) * (1 - border)));
                    }
                }
                me.modules.ui.mainFrameWindow.addEventListener('scroll', arrowToFunction);
                me.modules.ui.mainFrameWindow.scrollBy(scroll[0], scroll[1]);
            }
            return true;
        }
    };
    /**
     * Draws arrow overlay divs
     * @function CartFiller.UI~drawArrows
     * @access private
     */
    var drawArrows = function(){
        scrollIfNecessary();
        deleteOverlaysOfType('arrow');
        for (var path in elementsToDrawByPath) {
            drawArrowsForPath(elementsToDrawByPath[path]);
        }
    };
    var drawArrowsForPath = function(elements) {
        var top, left, bottom;
        elements
        .filter(function(el) { return 'arrow' === el.type && ! el.deleted; })
        .filter(function(el) { return el.currentMainFrameWindow === me.modules.dispatcher.getFrameWindowIndex(); })
        .map(addFrameCoordinatesMap)
        .filter(function(el, i) {
            var div = getOverlayDiv2('arrow');
            div.style.backgroundColor = 'transparent';
            div.style.borderLeft = div.style.borderTop = div.style.borderRight = div.style.borderBottom = '5px solid rgba(255,0,0,0.3)';
            div.style.left = el.rect.left + 'px';
            div.style.top = el.rect.top + 'px';
            div.style.width = el.rect.width + 'px';
            div.style.height = el.rect.height + 'px';
            div.style.boxSizing = 'border-box';
            if (el.rect.left > 40) {
                top = el.rect.top + Math.round(el.rect.height/2);
                verticalLineOverlay('arrow', 0, 0, top - 10);
                horizontalLineOverlay('arrow', 0, top - 10, el.rect.left - 30);
                horizontalArrowOverlayRight('arrow', el.rect.left - 30, top);
            } else if (el.rect.top > 40) {
                left = el.rect.left + Math.min(30 + i * 30, Math.round(el.rect.width / 2));
                horizontalLineOverlay('arrow', 0, 0, left - 10);
                verticalLineOverlay('arrow', left - 10, 0, el.rect.top - 30);
                verticalArrowOverlayDown('arrow', left, el.rect.top - 30);
            } else {
                left = el.rect.left + Math.min(30, Math.round(el.rect.width / 2));
                bottom = el.rect.top + el.rect.height;
                horizontalLineOverlay('arrow', 0, bottom + 60, left + 10);
                verticalLineOverlay('arrow', left - 10, bottom + 30, 30);
                verticalArrowOverlayUp('arrow', left, bottom);
            }
        });
    };
    /**
     * Finds max bounding rectange of elements
     * @function CartFiller.UI~findMaxRect
     * @param {Object} what
     * @access private
     */
    var findMaxRect = function(what){
        var left, top, right, bottom;
        var filter = function(el) {
            return ('undefined' === typeof what ||
                what[el.type]) && 
                ! el.deleted;
        };
        var calc = function(el) {
            left = undefined === left ? el.rect.left : Math.min(left, el.rect.left);
            right = undefined === right ? (el.rect.left + el.rect.width) : Math.max(right, (el.rect.left + el.rect.width));
            top = undefined === top ? el.rect.top : Math.min(top, el.rect.top);
            bottom = undefined === bottom ? (el.rect.top + el.rect.height) : Math.max(bottom, (el.rect.top + el.rect.height));
        };
        var currentMainFrameWindowFilter = function(el) { return el.currentMainFrameWindow === me.modules.dispatcher.getFrameWindowIndex(); };
        for (var path in elementsToDrawByPath) {
            elementsToDrawByPath[path]
            .filter(filter)
            .filter(currentMainFrameWindowFilter)
            .map(addFrameCoordinatesMap)
            .filter(calc);
        }
        return {left: left, right: right, top: top, bottom: bottom};
    };
    var getInnerHeight = function() {
        try {
            if (parent.callPhantom) {
                return 600;
            }
        } catch (e) {}
        return me.modules.ui.mainFrameWindow.innerHeight;
    };
    var getInnerWidth = function() {
        return me.modules.ui.mainFrameWindow.innerWidth;
    };
    /**
     * Draws highlighting overlay divs
     * @function CartFiller.UI~drawHighlights
     * @access private
     */
    var drawHighlights = function(){
        scrollIfNecessary();
        deleteOverlaysOfType('highlight');
        var rect = findMaxRect({highlight: true});
        if (rect.left === undefined) {
            return;
        }
        var pageBottom = getInnerHeight();
        var pageRight = getInnerWidth();
        var border = 5;
        createOverlay(0, 0, Math.max(0, rect.left - border), pageBottom);
        createOverlay(Math.min(pageRight, rect.right + border), 0, pageRight, pageBottom);
        createOverlay(Math.max(0, rect.left - border), 0, Math.min(pageRight, rect.right + border), Math.min(pageBottom, rect.top - border));
        createOverlay(Math.max(0, rect.left - border), Math.max(0, rect.bottom + border), Math.min(pageRight, rect.right + border), pageBottom);
    };
    var getDomain = function(url) {
        return url.split('/').slice(0, 3).join('/');
    };
    /**
     * Draws message div
     * @function CartFiller.UI~drawMessage
     * @access private
     */
    var drawMessage = function(){
        deleteOverlaysOfType('message');
        var rect = findMaxRect({highlight: true, arrow: true});
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
            messageDiv.style.top = Math.min(getInnerHeight() - 100, rect.bottom + 5 - currentMessageDivTopShift) + 'px';
            messageDiv.style.left = Math.max(0, (Math.round((rect.left + rect.right) / 2) - currentMessageDivWidth)) + 'px';
            messageDiv.style.width = currentMessageDivWidth + 'px';
            messageDiv.style.height = 'auto';
            messageDiv.style.maxHeight = '100%';
            messageDiv.style.position = 'fixed';
            messageDiv.style.fontSize = '20px';
            messageDiv.className = overlayClassName + ' ' + overlayClassName + 'message';

            var innerDiv = overlayWindow().document.createElement(wrapMessageToSayWithPre ? 'pre' : 'div');
            messageDiv.appendChild(innerDiv);
            if (messageToSayOptions.html) {
                innerDiv.innerHTML = messageToSay;
            } else if (wrapMessageToSayWithPre) {
                innerDiv.textContent = messageToSay;
            } else {
                messageToSay.split('\n').filter(function(lineToSay, i) {
                    if (i) {
                        var br = overlayWindow().document.createElement('br');
                        innerDiv.appendChild(br);
                    }
                    var span = overlayWindow().document.createElement('span');
                    span.textContent = lineToSay;
                    innerDiv.appendChild(span);
                });
            }
            innerDiv.style.backgroundColor = '#fff';
            innerDiv.style.border = 'none';
            innerDiv.onclick = function(e) { e.stopPropagation(); return false; };
            var closeButton = overlayWindow().document.createElement('button');
            messageDiv.appendChild(closeButton);
            closeButton.textContent = messageToSayOptions.nextButton || 'Close';
            closeButton.style.borderRadius = '4px';
            closeButton.style.fontSize = '14px';
            closeButton.style.float = 'right';
            if (messageToSayOptions.nextButton) {
                if (me.modules.dispatcher.running === true) {
                    setTimeout(function() {
                        me.modules.ui.clearOverlaysAndReflect();
                    },0);
                } else {
                    closeButton.onclick = function(e) { 
                        e.stopPropagation(); 
                        me.modules.ui.clearOverlaysAndReflect();
                        return false;
                    };
                }
            }
            messageDiv.onclick = function(){me.modules.ui.clearOverlaysAndReflect();};
            overlayWindow().document.getElementsByTagName('body')[0].appendChild(messageDiv);
            closeButton.focus();
            messageAdjustmentRemainingAttempts = 100;
            me.modules.ui.adjustMessageDiv(messageDiv);
            if (messageToSayOptions.callback) {
                messageToSayOptions.callback.apply(getDocument(), [messageDiv]);
            }
        }
        currentMessageOnScreen = messageToSay;
    };
    /**
     * Function, that maintains arrows on screen, called time to time.
     * @function CartFiller.UI~arrowToFunction
     * @access private
     */
    var arrowToFunction = function(){
        var serialize = function(what) {
            var map = function(e) {
                var src = e.type === 'iframe' ? e.self : e;
                return {
                    rect: {
                        left: src.left,
                        top: src.top,
                        width: src.width,
                        height: src.height,
                        right: src.right,
                        bottom: src.bottom,
                        url: e.element ? e.element.ownerDocument.defaultView.location.href : false
                    },
                    type: e.type,
                    path: e.path,
                    scroll: e.scroll,
                    ts: e.ts,
                    deleted: e.deleted,
                    currentMainFrameWindow: e.currentMainFrameWindow
                };
            };
            var r = {};
            elementsToTrack
                .filter(function(e){ 
                    return what[e.type]; 
                })
                .filter(function(e){ 
                    r[e.path.join('/')] = []; 
                    return true; 
                })
                .map(map)
                .filter(function(e) { 
                    if (! e.discard) {
                        r[e.path.join('/')].push(e);
                    }
                });
            return r;
        };
        try {
            var rebuildElements = findChanges(elementsToTrack);
            var rebuildMessage = currentMessageOnScreen !== messageToSay;
            if (rebuildElements.arrow || rebuildElements.highlight || rebuildMessage || rebuildElements.iframe) {
                // that's real things to draw, let's do that
                var details = {
                    elementsByPath: serialize({arrow: rebuildElements.arrow, highlight: rebuildElements.highlight}),
                    rebuild: rebuildElements,
                    iframesByPath: {}
                };
                if (rebuildMessage) {
                    details.messageToSay = messageToSay;
                    details.rebuild.message = true;
                }
                if (rebuildElements.iframe) {
                    details.iframesByPath = serialize({iframe: true});
                }
                me.modules.ui.drawOverlaysAndReflect(details);
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
    var adjustFrameCoordinates = function(forceRedraw){
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight,
            outerWidth = isFramed ? false : window.outerWidth,
            outerHeight = isFramed ? false : window.outerHeight;

        me.modules.ui.checkAndUpdateCurrentUrl();
        if (currentWindowDimensions.width !== windowWidth ||
            currentWindowDimensions.height !== windowHeight ||
            currentWindowDimensions.outerWidth !== outerWidth ||
            currentWindowDimensions.outerHeight !== outerHeight ||
            currentWindowDimensions.workerFrameSize !== currentWorkerFrameSize ||
            (isFramed && me.modules.ui.currentMainFrameWindow !== me.modules.ui.drawnMainFrameWindow) ||
            forceRedraw) {
            (function() {
                var mainFrameWidthBig = windowWidth * 0.8 - 1,
                    mainFrameWidthSmall = windowWidth * 0.2 - 1,
                    workerFrameWidthBig = windowWidth * 0.8 - 1,
                    workerFrameWidthSmall = windowWidth * 0.2 - 1,
                    slaveFramesHeight = 20,
                    mainFramesHeight = Math.floor(
                        (windowHeight - 15 - (isFramed ? ((me.modules.ui.mainFrames.length - 1) * slaveFramesHeight) : 0)) / (isFramed ? me.modules.ui.mainFrames.length : 1)
                    ),
                    workerFrameHeight = windowHeight - 15,
                    chooseJobFrameLeft = 0.02 * windowWidth + (isFramed ? 0 : 200),
                    chooseJobFrameWidth = 0.76 * windowWidth - (isFramed ? 0 : 200),
                    chooseJobFrameTop = 0.02 * windowHeight,
                    chooseJobFrameHeight = 0.96 * windowHeight;

                    var frameHeights = [];

                    if (isFramed) {
                        me.modules.ui.mainFrames.filter(function(mainFrame, index) {
                            frameHeights[index] = Math.floor(mainFramesHeight * (me.modules.ui.mainFrames.length === 1 ? 1 : (index === me.modules.ui.currentMainFrameWindow ? (0.3 + 0.7 * me.modules.ui.mainFrames.length) : 0.3)));
                            mainFrame.style.height =  frameHeights[index] + 'px';
                            if (index > 0 && me.modules.ui.slaveFrames[index]) {
                                me.modules.ui.slaveFrames[index].style.height = slaveFramesHeight + 'px';
                            }
                        });
                    }
                    try {
                        me.modules.ui.workerFrame.style.height = workerFrameHeight + 'px';
                    } catch (e) {}
                    try {
                        me.modules.ui.chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
                        me.modules.ui.chooseJobFrame.style.top = chooseJobFrameTop + 'px';
                        me.modules.ui.chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
                        me.modules.ui.chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
                    } catch (e) {}
                    if (isFramed) {
                        me.modules.ui.mainFrames.filter(function(mainFrame, index) {
                            try {
                                var mainFrameTop = frameHeights.slice(0, index).reduce(function(acc, v) { return acc + v + slaveFramesHeight; }, 0);
                                mainFrame.style.top = mainFrameTop + 'px';
                                if (index > 0 && me.modules.ui.slaveFrames[index]) {
                                    me.modules.ui.slaveFrames[index].style.top = (mainFrameTop - slaveFramesHeight) + 'px';
                                }
                            } catch (e) {}
                        });
                    }

                    if (currentWorkerFrameSize === 'big') {
                        if (isFramed) {
                            try {
                                me.modules.ui.workerFrame.style.width = workerFrameWidthBig + 'px';
                                me.modules.ui.workerFrame.style.left = mainFrameWidthSmall + 'px';
                            } catch (e) {}
                            me.modules.ui.mainFrames.filter(function(mainFrame, index) {
                                try {
                                    mainFrame.style.width = mainFrameWidthSmall + 'px';

                                    if (index > 0 && me.modules.ui.slaveFrames[index]) {
                                        me.modules.ui.slaveFrames[index].style.width = mainFrameWidthSmall + 'px';
                                    }
                                } catch (e) {}
                            });
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
                            me.modules.ui.mainFrames.filter(function(mainFrame, index) {
                                try {
                                    mainFrame.style.width = mainFrameWidthBig + 'px';
                                    if (index > 0 && me.modules.ui.slaveFrames[index]) {
                                        me.modules.ui.slaveFrames[index].style.width = mainFrameWidthBig + 'px';
                                    }
                                } catch (e) {}
                            });
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
            me.modules.ui.drawnMainFrameWindow = me.modules.ui.currentMainFrameWindow;
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
        div.className = overlayClassName + ' ' + overlayClassName + 'highlight';
        div.onclick = function(){me.modules.ui.clearOverlaysAndReflect();};
        getDocument().getElementsByTagName('body')[0].appendChild(div);

    };

    /**
     * Returns src for worker (job progress) frame
     * @function CartFiller.UI~getWorkerFramSrc
     * @returns {String}
     * @access private
     */
    var getWorkerFrameSrc = function(){
        return me['data-wfu'] ? me['data-wfu'] : (me.baseUrl + '/index' + (me.concatenated ? '' : (/\/src$/.test(me.baseUrl) ? '' : '.uncompressed')) + '.html' + (me.gruntBuildTimeStamp ? ('?' + me.gruntBuildTimeStamp) : ''));
    };
    /**
     * Returns z-index for overlay divs. 
     * @function {integer} CartFiller.UI~getZIndexForOverlay
     * @access private
     */
    var getZIndexForOverlay = function(){
        return 2147483647; // TBD look for max zIndex used in the main frame
    };
    // Launch arrowToFunction
    setInterval(arrowToFunction, 200);
    var discoverPathForElement = function(window, soFar) {
        soFar = soFar || [];
        if (window === me.modules.ui.mainFrameWindow) {
            return soFar;
        }
        var parent = window.parent;
        for (var i = 0; i < parent.frames.length && window !== parent.frames[i]; i ++) {}
        soFar.unshift(i);
        discoverPathForElement(parent, soFar);
        // let's see if we should track iframe ourselves
        try {
            parent.location.href;
            // we can
            var iframes = parent.document.getElementsByTagName('iframe');
            for (i = iframes.length - 1 ; i >= 0 ; i --) {
                if (iframes[i].contentWindow === window) {
                    me.modules.ui.addElementToTrack('iframe', iframes[i], true, [i]);
                }
            }
        } catch(e) {}
        return soFar;
    };
    
    var setMainFrameWindow = function(index) {
        index = index || 0;
        me.modules.ui.currentMainFrameWindow = index;
        me.modules.ui.mainFrameWindow = me.modules.ui.mainFrameWindows[0]; // always set to first
        if (isFramed) {
            // adjust borders
            if (me.modules.ui.mainFrames && me.modules.ui.mainFrames.length > 1) {
                for (var i = me.modules.ui.mainFrames.length - 1 ; i >= 0; i --) {
                    var frame = me.modules.ui.mainFrames[i];
                    frame.style.borderWidth = '5px';
                    if (i === index) {
                        frame.style.borderColor = 'red';
                    } else {
                        frame.style.borderColor = 'transparent';
                    }
                }
            } else {
                me.modules.ui.mainFrames[0].style.borderWidth = '0px';
            }
        }
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
                if ((0 === me['data-choose-job'].indexOf('#')) && (me.localIndexHtml)) {
                    this.chooseJobFrameWindow.document.write(me.localIndexHtml.replace(/data-local-href=""/, 'data-local-href="' + me['data-choose-job'] + '"'));
                } else {
                    this.chooseJobFrameWindow.location.href = me['data-choose-job'];
                }
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
            if (prepareToClearOverlays) {
                this.clearOverlaysAndReflect(true);
            }
            messageToSay = '';
            var i;
            var added = false;

            if (null !== element && 'object' === typeof element && (('string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each) || (element instanceof me.modules.api.getSelectorClass()))){
                element.each(function(i,el){
                    me.modules.ui.addElementToTrack('highlight', el);
                    added = true;
                    if (!allElements) {
                        return false;
                    }
                });
            } else if (element instanceof Array) {
                for (i = element.length -1 ; i >= 0 ; i --){
                    this.addElementToTrack('highlight', element[i]);
                    added = true;
                    if (true !== allElements) {
                        break;
                    }
                }
            } else if (undefined !== element) {
                this.addElementToTrack('highlight', element);
                added = true;
            }
            if (added > 0 && me.modules.dispatcher.haveAccess()) {
                var body = this.mainFrameWindow.document.getElementsByTagName('body')[0];
                body.style.paddingBottom = getInnerHeight() + 'px';
            }
        },
        /**
         * Draw arrow to element(s). 
         * Parameters are same as for {@link CartFiller.UI#highlight}
         * @function CartFiller.UI#arrowTo
         * @access public
         */
        arrowTo: function(element, allElements, noScroll){
            if (prepareToClearOverlays) {
                this.clearOverlaysAndReflect(true);
            }
            if (null !== element && 'object' === typeof element && (('string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each) || (element instanceof me.modules.api.getSelectorClass()))){
                element.each(function(i,el){
                    me.modules.ui.addElementToTrack('arrow', el, noScroll);
                    if (!allElements) {
                        return false;
                    }
                    noScroll = true; // only scroll to first found element;
                });
            } else if (element instanceof Array) {
                for (var i = 0; i < element.length; i++){
                    this.addElementToTrack('arrow', element[i], noScroll);
                    if (!allElements) {
                        break;
                    }
                    noScroll = true; // only scroll to first found element;
                }
            } else if (undefined !== element) {
                this.addElementToTrack('arrow', element, noScroll);
            }
        },
        /**
         * Displays comment message over the overlay in the main frame
         * @function CartFiller.UI#say
         * @param {String} text
         * @param {boolean} pre
         * @param {String|undefined} nextButton
         * @param {boolean} html if set to true then text will be put into innerHtml of wrapper div
         * @param {Function} callback if set then will be called each time div is drawn
         * @access public
         */
        say: function(text, pre, nextButton, html, callback){
            messageToSay = (undefined === text || null === text) ? '' : text;
            messageToSayOptions.nextButton = nextButton;
            messageToSayOptions.html = html;
            messageToSayOptions.callback = callback;
            wrapMessageToSayWithPre = pre;
            currentMessageDivWidth = Math.max(100, Math.round(getInnerWidth() * 0.5));
            currentMessageDivTopShift = 0;
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
            setTimeout(function adjustMessageDivTimeoutFn(){
                var ok = true;
                if (messageAdjustmentRemainingAttempts > 0){
                    if (! div.parentNode) {
                        setTimeout(adjustMessageDivTimeoutFn, 100);
                        return;
                    }
                    ok = false;
                    var rect = div.getBoundingClientRect();
                    if (rect.bottom > ui.mainFrameWindow.innerHeight || (rect.width - 20) < div.scrollWidth){
                        if (rect.width > 0.95 * ui.mainFrameWindow.innerWidth && rect.bottom > ui.mainFrameWindow.innerHeight){
                            currentMessageDivTopShift += Math.min(rect.top, rect.bottom - ui.mainFrameWindow.innerHeight);
                        } else {
                            // let's make div wider
                            currentMessageDivWidth = Math.min(
                                ui.mainFrameWindow.innerWidth - 60, 
                                (
                                    parseInt(div.style.width.replace('px', '')) +
                                    Math.round(ui.mainFrameWindow.innerWidth * 0.4)
                                )
                            );
                        }
                    } else {
                        // that's ok 
                        ok = true;
                    }
                    if (ok){
                        div.style.opacity = '1';
                        messageAdjustmentRemainingAttempts = 0;
                        currentMessageOnScreen = messageToSay;
                    } else {
                        messageAdjustmentRemainingAttempts --;
                        currentMessageOnScreen = undefined;
                        //setTimeout(drawMessage, 100);
                    }
                } else {
                    messageAdjustmentRemainingAttempts = 0;
                    currentMessageOnScreen = messageToSay;
                    div.style.opacity = '1';
                }
                scrollIfNecessary();
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
            this.mainFrameWindows = [
                window.open(window.location.href, '_blank', 'resizable=1, height=1, width=1, scrollbars=1')
            ];
            setMainFrameWindow();
            this.mainFrameWindow = this.mainFrameWindows[0];
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
            if (me.localIndexHtml) {
                this.workerFrameWindow.document.write(me.localIndexHtml);
            } else {
                this.workerFrameWindow.location.href = getWorkerFrameSrc();
            }

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
            this.mainFrames = [document.createElement('iframe')];
            this.mainFrames[0].setAttribute('name', mainFrameName + '-0');
            this.mainFrames[0].style.height = '0px';
            this.mainFrames[0].style.position = 'fixed';
            this.mainFrames[0].style.left = '0px';
            this.mainFrames[0].style.top = '0px';
            this.mainFrames[0].style.borderWidth = '0px';
            this.slaveFrames = [undefined];
            this.slaveFramesWindows = [undefined];
            this.slaveFramesHelperWindows = {};

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
            body.appendChild(this.mainFrames[0]);
            this.mainFrameWindows = [window.frames[mainFrameName + '-0']];
            setMainFrameWindow();

            me.modules.dispatcher.registerLoadWatcher();
            this.mainFrameWindow.location.href=mainFrameSrc;
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            if (me.localIndexHtml) {
                this.workerFrameWindow.document.write(me.localIndexHtml);
            } else {
                this.workerFrameWindow.location.href = getWorkerFrameSrc();
            }
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentWorkerFrameSize === 'big') ? 'small' : 'big';
                }
                currentWorkerFrameSize = size;
                adjustFrameCoordinates();
            };

            this.setSize('small');
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
         * ////
         */
        reportingMousePointerClick: function(x, y, mainFrameWindowIndex, frameLeft, frameTop) {
            // let's see whether it comes to our frame or not
            if (mainFrameWindowIndex === undefined) {
                var frame = window.document.elementFromPoint(x,y);
                if (frame) {
                    var match = /^cartFillerMainFrame-(\d+)$/.exec(frame.getAttribute('name'));
                    if (match) {
                        mainFrameWindowIndex = parseInt(match[1]);
                    }
                }
            }
            if (mainFrameWindowIndex !== undefined) {
                if (mainFrameWindowIndex !== me.modules.dispatcher.getFrameWindowIndex()) {
                    me.modules.dispatcher.onMessage_bubbleRelayMessage({
                        message: 'reportingMousePointerClickForWindow',
                        currentMainFrameWindow: mainFrameWindowIndex,
                        x: x - frameLeft,
                        y: y - frameTop
                    });
                } else {
                    this.reportingMousePointerClickForWindow(x, y);
                }
                return;
            }
            me.modules.dispatcher.postMessageToWorker('mousePointer', {x: x, y: y, stack: [], w: me.modules.dispatcher.getFrameWindowIndex()});
        },
        reportingMousePointerClickForWindow: function(x, y) {
            var stack = [];
            var el = me.modules.ui.mainFrameWindow.document.elementFromPoint(x,y);
            var prev;
            var i, n;
            if (el.nodeName === 'SELECT') {
                // we'd rather report an option for this select, this way user can 
                // build selector for either select element or an option - whichever he likes
                var selectChildren = el.childNodes;
                for (i = selectChildren.length - 1; i >=0 ; i --) {
                    if (selectChildren[i].nodeName === 'OPTION' && selectChildren[i].selected) {
                        el = selectChildren[i]; 
                        break;
                    }
                }
            }
            var libSelectors = me.modules.cf.getLibSelectors();
            var matchedSelectors = {};
            while (el && el.nodeName !== 'BODY' && el.nodeName !== 'HTML' && el !== document) {
                for (i in libSelectors) {
                    for (n = 0; n < libSelectors[i].length; n ++ ) {
                        if (libSelectors[i][n] === el) {
                            matchedSelectors[i] = libSelectors[i];
                            delete libSelectors[i];
                            break;
                        }
                    }
                }
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
                stack.unshift({
                    element: el.nodeName.toLowerCase(), 
                    lib: undefined,
                    attrs: attrs, 
                    classes: ('string' === typeof el.className) ? el.className.split(' ').filter(function(v){return v;}) : [], 
                    id: 'string' === typeof el.id ? el.id : undefined, 
                    index: i,
                    text: String(el.textContent).length < 200 ? String(el.textContent) : ''
                });
                el = el.parentNode;
            }
            for (i in matchedSelectors) {
                stack.unshift({
                    element: undefined, 
                    lib: i,
                    attrs: [],
                    classes: [], 
                    id: undefined, 
                    index: 0,
                    text: ''
                });
            }
            me.modules.dispatcher.postMessageToWorker('mousePointer', {x: x, y: y, stack: stack, w: me.modules.dispatcher.getFrameWindowIndex()});
        },
        /**
         * Starts reporting mouse pointer - on each mousemove dispatcher 
         * will send worker frame a message with details about element
         * over which mouse is now
         * @function CartFiller.UI#startReportingMousePointer
         * @access public
         */
        startReportingMousePointer: function() {
            try {
                me.modules.ui.clearOverlaysAndReflect();
            } catch (e) {}
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
                    x = x || event.clientX;
                    y = y || event.clientY;
                    document.getElementsByTagName('body')[0].removeChild(reportMousePointer);
                    var windowIndex;
                    var frame = window.document.elementFromPoint(x,y);
                    if (frame) {
                        var match = /^cartFillerMainFrame-(\d+)$/.exec(frame.getAttribute('name'));
                        if (match) {
                            windowIndex = parseInt(match[1]);
                        }
                    }
                    var frameRect = frame.getBoundingClientRect();
                    reportMousePointer = false;
                    if (me.modules.dispatcher.reflectMessage({cmd: 'reportingMousePointerClick', x: x, y: y, w: windowIndex, ft: frameRect.top, fl: frameRect.left})) {
                        return;
                    }
                    me.modules.ui.reportingMousePointerClick(x, y, windowIndex, frameRect.left, frameRect.top);
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
        },
        /**
         * Getter for messageToSay
         * @function CartFiller.UI#getMessageToSay
         * @return {String}
         * @access public
         */
        getMessageToSay: function() {
            return messageToSay;
        },
        highlightElementForQueryBuilder: function(details) {
            this.clearOverlays();
            if (details.path) {
                var path = details.path;
                var element = this.mainFrameWindow.document.getElementsByTagName('body')[0];
                for (var i = 0; i < path.length; i ++  ) {
                    var name = path[i][0];
                    var len = element.children.length;
                    for (var j = 0; j < len; j ++ ) {
                        if (element.children[j].nodeName.toLowerCase() === name) {
                            if (path[i][1]) {
                                path[i][1] --;
                            } else {
                                element = element.children[j];
                                name = false;
                                break;
                            }
                        }
                    }
                    if (name) {
                        // not found
                        return;
                    }
                }
                this.arrowTo(element, false, true);
            } else if (details.lib) {
                this.arrowTo(me.modules.cf.getlib(details.lib), true, true);
            }
        },
        prepareTolearOverlaysAndReflect: function() {
            me.modules.dispatcher.onMessage_bubbleRelayMessage({
                message: 'prepareToClearOverlays'
            });
        },
        prepareToClearOverlays: function() {
            prepareToClearOverlays = true;
            messageToSay = '';
            if (me.modules.dispatcher.haveAccess()) {
                drawMessage();
            }
        },
        clearOverlaysAndReflect: function(ignoreNextButton) {
            if (! ignoreNextButton && messageToSayOptions.nextButton) {
                me.modules.api.result();
                messageToSayOptions.nextButton = false;
            }
            me.modules.dispatcher.onMessage_bubbleRelayMessage({
                message: 'clearOverlays'
            });
        },
        clearOverlays: function() {
            prepareToClearOverlays = false;
            elementsToTrack = [];
            elementsToDrawByPath = {};
            messageToSay = '';
            if (me.modules.dispatcher.haveAccess()) {
                drawArrows();
                drawHighlights();
                drawMessage();
            }
        },
        drawOverlays: function(details) {
            var framesUpdated = false, path;
            for (path in details.iframesByPath) {
                trackedIframes[path] = details.iframesByPath[path][0];
                framesUpdated = true;
            }
            for (path in details.elementsByPath) {
                elementsToDrawByPath[path] = details.elementsByPath[path];
            }
            if (me.modules.dispatcher.haveAccess()) {
                // we are going to draw on this page
                if (details.rebuild.arrow || framesUpdated) {
                    drawArrows();
                }
                if (details.rebuild.highlight || framesUpdated) {
                    drawHighlights();
                }
                if (details.rebuild.message || framesUpdated) {
                    messageToDraw = details.messageToSay;
                    drawMessage();
                }
            }
        },
        drawOverlaysAndReflect: function(details) {
            details.message = 'drawOverlays';
            me.modules.dispatcher.onMessage_bubbleRelayMessage(details);
        },
        tellWhatYouHaveToDraw: function() {
            arrowToFunction();
        },
        addElementToTrack: function(type, element, noScroll, addPath) {
            elementsToTrack.push({
                element: element, 
                type: type, 
                scroll: ! noScroll, 
                path: discoverPathForElement(element.ownerDocument.defaultView, addPath),
                ts: (new Date()).getTime(),
                currentMainFrameWindow: me.modules.dispatcher.getFrameWindowIndex()
            });
            if (! noScroll) {
                element.scrollIntoView();
            }
        },
        getMainFrameWindowDocument: function() {
            var mainFrameWindowDocument;
            try { mainFrameWindowDocument = me.modules.ui.mainFrameWindow.document; } catch (e) {}
            return mainFrameWindowDocument;
        },
        setAdditionalWindows: function(descriptors, noResultCall) {
            if (! isFramed) {
                if (descriptors && descriptors.length) {
                    throw new Error('this function is only availabled in framed mode');
                }
                return;
            }
            for (var i = this.mainFrames.length - 1; i >= 1; i --) {
                this.mainFrames[i].parentNode.removeChild(this.mainFrames[i]);
                if (this.slaveFrames[i]) {
                    this.slaveFrames[i].parentNode.removeChild(this.slaveFrames[i]);
                }
            }
            this.mainFrames.splice(1);
            this.slaveFrames.splice(1);
            this.mainFrameWindows.splice(1);
            me.modules.dispatcher.resetRelays();
            var body = document.getElementsByTagName('body')[0];
            var currentSlavesLoaded = -1;
            var waitForNextSlaveToLoad = function() {
                return me.modules.dispatcher.getSlaveCounter() === currentSlavesLoaded + 1;
            };
            var actWhenWaitForFinished = function(result) {
                if (! result) {
                    me.modules.api.result('Unable to load slave');
                } else {
                    currentSlavesLoaded ++;
                    if (currentSlavesLoaded === descriptors.length) {
                        me.modules.api.result();
                    } else {
                        me.modules.ui.slaveFramesWindows[currentSlavesLoaded + 1] = me.modules.ui.slaveFrames[currentSlavesLoaded + 1].contentWindow;
                        me.modules.ui.slaveFramesWindows[currentSlavesLoaded + 1].location.href = descriptors[currentSlavesLoaded].slave + '#launchSlaveInFrame';
                        var next = function() {   
                            me.modules.api.waitFor(waitForNextSlaveToLoad, actWhenWaitForFinished, 300000);
                        };
                        if (descriptors[currentSlavesLoaded].withHelper) {
                            if (! me.modules.ui.slaveFramesHelperWindows[getDomain(descriptors[currentSlavesLoaded].slave)]) {
                                me.modules.dispatcher.openPopup(
                                    {
                                        url: descriptors[currentSlavesLoaded].slave
                                    }, 
                                    function(w) {
                                        me.modules.ui.slaveFramesHelperWindows[getDomain(descriptors[currentSlavesLoaded].slave)] = {w: w, i: currentSlavesLoaded + 1};
                                        next();
                                    }
                                );
                            } else {
                                // we already have such window
                                me.modules.ui.slaveFramesHelperWindows[getDomain(descriptors[currentSlavesLoaded].slave)].i = currentSlavesLoaded + 1;
                                me.modules.ui.slaveFramesHelperWindows[getDomain(descriptors[currentSlavesLoaded].slave)].w.postMessage('cartFillerMessage:{"cmd":"actAsSlaveHelper","slaveIndex":' + (currentSlavesLoaded + 1) + '}', '*');
                                next();
                            }
                        } else {
                            next();
                        }
                    }
                }
            };
            // now let's create additional windows
            for (i = 1; i <= descriptors.length; i ++){
                var mainFrame = document.createElement('iframe');
                mainFrame.setAttribute('name', mainFrameName + '-' + i);
                mainFrame.style.height = '0px';
                mainFrame.style.position = 'fixed';
                mainFrame.style.left = '0px';
                mainFrame.style.top = '0px';
                mainFrame.style.borderWidth = '0px';
                this.mainFrames[i] = mainFrame;

                body.appendChild(mainFrame);
                this.mainFrameWindows[i] = window.frames[mainFrameName + '-' + i];
                this.mainFrameWindows[i].location.href = descriptors[i-1].url;

                var slaveFrame = document.createElement('iframe');
                slaveFrame.setAttribute('name', mainFrameName + '-s' + i);
                slaveFrame.style.height = '0px';
                slaveFrame.style.position = 'fixed';
                slaveFrame.style.left = '0px';
                slaveFrame.style.top = '0px';
                slaveFrame.style.borderWidth = '1px';
                slaveFrame.style.borderColor = '#ccc';
                this.slaveFrames[i] = slaveFrame;

                body.appendChild(slaveFrame);
            }
            setMainFrameWindow();
            adjustFrameCoordinates(true);
            if (! noResultCall) {
                actWhenWaitForFinished(true);
            }
        },
        switchToWindow: function(index) {
            setMainFrameWindow(index);
        },
        checkAndUpdateCurrentUrl: function() {
            try {
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
            } catch(e) {}
        },
        isMessageStable: function() { 
            return messageAdjustmentRemainingAttempts === 0;
        }
    });
}).call(this, document, window);
