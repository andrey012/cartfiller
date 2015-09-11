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
        overlayWindow().document.getElementsByTagName('body')[0].appendChild(div);
        return div;
    };
    var deleteOverlaysOfType = function(type) {
        var divs = overlayWindow().document.getElementsByClassName(overlayClassName + (type ? type : ''));
        for (var i = divs.length - 1; i >= 0; i --) {
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
                delete elements[i]; 
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
            height: element.rect.height
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
    /**
     * Draws arrow overlay divs
     * @function CartFiller.UI~drawArrows
     * @access private
     */
    var drawArrows = function(){
        deleteOverlaysOfType('arrow');
        for (var path in elementsToDrawByPath) {
            drawArrowsForPath(elementsToDrawByPath[path]);
        }
    };
    var drawArrowsForPath = function(elements) {
        var top, left, bottom;
        elements
        .filter(function(el) { return 'arrow' === el.type; })
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
            return 'undefined' === typeof what ||
                what[el.type];
        };
        var calc = function(el) {
            left = undefined === left ? el.rect.left : Math.min(left, el.rect.left);
            right = undefined === right ? (el.rect.left + el.rect.width) : Math.max(right, (el.rect.left + el.rect.width));
            top = undefined === top ? el.rect.top : Math.min(top, el.rect.top);
            bottom = undefined === bottom ? (el.rect.top + el.rect.height) : Math.max(bottom, (el.rect.top + el.rect.height));
        };
        for (var path in elementsToDrawByPath) {
            elementsToDrawByPath[path]
            .filter(filter)
            .map(addFrameCoordinatesMap)
            .filter(calc);
        }
        return {left: left, right: right, top: top, bottom: bottom};
    };
    /**
     * Draws highlighting overlay divs
     * @function CartFiller.UI~drawHighlights
     * @access private
     */
    var drawHighlights = function(){
        deleteOverlaysOfType('highlight');
        var rect = findMaxRect({highlight: true});
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
            messageDiv.style.top = (rect.bottom + 5) + 'px';
            messageDiv.style.left = Math.max(0, (Math.round((rect.left + rect.right) / 2) - currentMessageDivWidth)) + 'px';
            messageDiv.style.width = currentMessageDivWidth + 'px';
            messageDiv.style.height = 'auto';
            messageDiv.style.maxHeight = '100%';
            messageDiv.style.position = 'fixed';
            messageDiv.style.fontSize = '20px';
            messageDiv.className = overlayClassName + ' ' + overlayClassName + 'message';
            if (! wrapMessageToSayWithPre) {
                messageDiv.textContent = messageToSay;
            } else {
                var pre = overlayWindow().document.createElement('pre');
                messageDiv.appendChild(pre);
                pre.textContent = messageToSay;
                pre.style.backgroundColor = '#fff';
                pre.style.border = 'none';
            }
            messageDiv.onclick = function(){me.modules.ui.clearOverlaysAndReflect();};
            overlayWindow().document.getElementsByTagName('body')[0].appendChild(messageDiv);
            messageAdjustmentRemainingAttempts = 100;
            me.modules.ui.adjustMessageDiv(messageDiv);
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
                        url: e.element.ownerDocument.defaultView.location.href
                    },
                    type: e.type,
                    path: e.path
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
        return me['data-wfu'] ? me['data-wfu'] : (me.baseUrl + '/index' + (me.concatenated ? '' : '.uncompressed') + '.html' + (me.gruntBuildTimeStamp ? ('?' + me.gruntBuildTimeStamp) : ''));
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
            messageToSay = '';
            var i;
            var added = false;

            if (null !== element && 'object' === typeof element && 'string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each){
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
                body.style.paddingBottom = this.mainFrameWindow.innerHeight + 'px';
            }
        },
        /**
         * Draw arrow to element(s). 
         * Parameters are same as for {@link CartFiller.UI#highlight}
         * @function CartFiller.UI#arrowTo
         * @access public
         */
        arrowTo: function(element, allElements, noScroll){
            if (null !== element && 'object' === typeof element && 'string' === typeof element.jquery && undefined !== element.length && 'function' === typeof element.each){
                element.each(function(i,el){
                    me.modules.ui.addElementToTrack('arrow', el, noScroll);
                    if (!allElements) {
                        return false;
                    }
                });
            } else if (element instanceof Array) {
                for (var i = 0; i < element.length; i++){
                    this.addElementToTrack('arrow', element[i], noScroll);
                    if (!allElements) {
                        break;
                    }
                }
            } else if (undefined !== element) {
                this.addElementToTrack('arrow', element, noScroll);
            }
        },
        /**
         * For selector builder
         * @function CartFiller.UI#arrowToSingleElementNoScroll
         * @param {HtmlElement} element
         * @access public
         */
        arrowToSingleElementNoScroll: function(element) {
            arrowToElements = [{element: element, path: me.modules.dispatcher.getFrameToDrill()}];
        },
        /**
         * Displays comment message over the overlay in the main frame
         * @function CartFiller.UI#say
         * @param {String} text
         * @param {boolean} pre
         * @access public
         */
        say: function(text, pre){
            messageToSay = undefined === text ? '' : text;
            wrapMessageToSayWithPre = pre;
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
                        currentMessageOnScreen = undefined;
                    }
                } else {
                    div.style.opacity = '1';
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
         * ////
         */
        reportingMousePointerClick: function(x, y) {
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
                stack.unshift({element: el.nodeName.toLowerCase(), attrs: attrs, classes: el.className.split(' ').filter(function(v){return v;}), id: el.id, index: i, text: String(el.textContent).length < 200 ? String(el.innerText) : ''});
                el = el.parentNode;
            }
            me.modules.dispatcher.postMessageToWorker('mousePointer', {x: x, y: y, stack: stack});
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
                div.addEventListener('click', function() {
                    document.getElementsByTagName('body')[0].removeChild(reportMousePointer);
                    reportMousePointer = false;
                    if (me.modules.dispatcher.reflectMessage({cmd: 'reportingMousePointerClick', x: x, y: y})) {
                        return;
                    }
                    me.modules.ui.reportingMousePointerClick(x, y);
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
        highlightElementForQueryBuilder: function(path) {
            if (! path) {
                this.arrowToSingleElementNoScroll();
            } else {
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
                        this.arrowToSingleElementNoScroll();
                        return;
                    }
                }
                this.arrowToSingleElementNoScroll(element);
            }
        },
        clearOverlaysAndReflect: function() {
            me.modules.dispatcher.onMessage_bubbleRelayMessage({
                message: 'clearOverlays'
            });
        },
        clearOverlays: function() {
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
        setSerializedAssets: function(message) {
            if (message.iframes !== null) {
                for (var i = 0; i < message.iframes.length; i++){
                    trackedIframeElements[message.iframes[i].path.join('/')] = message.iframes[i];
                }
            }
            if (message.arrows !== null) {
                arrowToElements = message.arrows;
            }
            if (message.highlighted !== null) {
                highlightedElements = message.highlighted;
            }
            if (message.say !== null) {
                messageToSay = message.say;
            }
        },
        trackIframePosition: function(iframe, path) {
            arrowToElements = [];
            highlightedElements = [];
            messageToSay = '';
            iframeElementsToTrack[path.join('/')] = {element: iframe, path: path};
        },
        addElementToTrack: function(type, element, noScroll, addPath) {
            elementsToTrack.push({
                element: element, 
                type: type, 
                scroll: ! noScroll, 
                path: discoverPathForElement(element.ownerDocument.defaultView, addPath)
            });
        }
    });
}).call(this, document, window);
