(function(document, window, undefined){
    'use strict';
    var me = this.cartFillerConfiguration;
    var currentSize;
    var overlayClassName = 'cartFillerOverlayDiv';
    var mainFrameName = 'cartFillerMainFrame',
        workerFrameName = 'cartFillerWorkerFrame',
        chooseJobFrameName = 'cartFillerChooseJobFrame';

    var getDocument = function(){
        return me.modules.ui.mainFrameWindow.document;
    }
    var getScrollLeft = function(){
        return getDocument().documentElement.scrollLeft || getDocument().body.scrollLeft;
    }
    var getScrollTop = function(){
        return  getDocument().documentElement.scrollTop || getDocument().body.scrollTop;

    }
    var createOverlay = function(left, top, right, bottom){
        var div =  getDocument().createElement('div');
        div.style.position = 'absolute';
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = (right - left) + 'px';
        div.style.height = (bottom - top) + 'px';
        div.style.backgroundColor = 'rgba(0,0,0,0.3)';
        div.style.zIndex = 100000;
        div.className = overlayClassName;
        div.onclick = function(){removeOverlay();};
        getDocument().getElementsByTagName('body')[0].appendChild(div);

    };
    var scrollTo = function(left, top, right, bottom){
        var centerX = (right + left ) / 2;
        var centerY = (bottom + top) / 2;
        var currentX, currentY;
        var destX = centerX - ( getDocument().documentElement.clientWidth / 2);
        var destY = centerY - ( getDocument().documentElement.clientHeight / 2);
        while (true){
            currentX = getScrollLeft();
            currentY = getScrollTop();
            me.modules.ui.mainFrameWindow.scrollBy(destX - currentX, destY -  currentY);
            if (getScrollLeft() == currentX &&
                getScrollTop() == currentY) {
                break;
            }
        }

    };
    var removeOverlay = function(){
        var divs =  getDocument().getElementsByClassName(overlayClassName);
        for (var i = divs.length - 1; i >= 0 ; i--){
            divs[i].parentNode.removeChild(divs[i]);
        }
    };

    var getWorkerFrameSrc = function(){
        return me.baseUrl + '/index.html';        
    }
    me.scripts.push({
        getName: function(){ return 'ui'; },
        setSize: function() {},
        showHideChooseJobFrame: function() {},
        highlight: function(element, allElements){
                var rect;
                if (undefined != this.mainFrameWindow.jQuery && (element instanceof this.mainFrameWindow.jQuery)){
                    if (1 > element.length) {
                        element = undefined;
                    } else {
                        if (true === allElements) {
                            rect = {left: undefined, right: undefined, top: undefined, bottom: undefined};
                            element.each(function(i,el){
                                var thisRect = el.getBoundingClientRect();
                                rect.left = (undefined === rect.left) ? thisRect.left : Math.min(rect.left, thisRect.left);
                                rect.right = (undefined === rect.right) ? thisRect.right : Math.max(rect.right, thisRect.right);
                                rect.top = (undefined === rect.top) ? thisRect.top : Math.min(rect.top, thisRect.top);
                                rect.bottom = (undefined === rect.bottom) ? thisRect.bottom : Math.max(rect.bottom, thisRect.bottom);
                            });
                         } else {
                            rect = element[0].getBoundingClientRect();                
                         }
                    }
                } else if (undefined !== element) {
                    rect = element.getBoundingClientRect();                
                }
                var body = this.mainFrameWindow.document.getElementsByTagName('body')[0];
                var full = body.getBoundingClientRect();
                var scrollTop = getScrollTop();
                var scrollLeft = getScrollLeft();
                var pageRight = Math.max(full.right + scrollLeft, body.scrollWidth, this.mainFrameWindow.innerWidth) - 1;
                var pageBottom = Math.max(full.bottom + scrollTop, body.scrollHeight, this.mainFrameWindow.innerHeight) - 1;
                removeOverlay();
                if (undefined !== element) {
                    var border = 5;
                    createOverlay(0, 0, Math.max(0, rect.left + scrollLeft - border), pageBottom);
                    createOverlay(Math.min(pageRight, rect.right + scrollLeft + border), 0, pageRight, pageBottom);
                    createOverlay(Math.max(0, rect.left + scrollLeft - border), 0, Math.min(pageRight, rect.right + scrollLeft + border), Math.min(pageBottom, rect.top + scrollTop - border));
                    createOverlay(Math.max(0, rect.left + scrollLeft - border), Math.max(0, rect.bottom + scrollTop + border), Math.min(pageRight, rect.right + scrollLeft + border), pageBottom);
                    scrollTo(rect.left + scrollLeft, rect.top + scrollTop, rect.right + scrollLeft, rect.bottom + scrollTop);
                } else {
                    createOverlay(0, 0, pageRight, pageBottom);
                }

            },
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
            this.mainFrameWindow.addEventListener('load', function(event){
                me.modules.dispatcher.onMainFrameLoaded();
            }, true);
            var ui = this;
            var loadWatcher = function(){
                if (ui.mainFrameWindow.document && 
                    (ui.mainFrameWindow.document.readyState === "complete")){
                    me.modules.dispatcher.onMainFrameLoaded(true);
                }
                setTimeout(loadWatcher, 100);
            }
            setTimeout(loadWatcher, 100);
////            var script = w.document.createElement('script');
////            script.innerText = "(function(){window.addEventListener('message', function(event) { window.opener.postMessage(event.data, '*'); }, false)})();";
////            w.document.getElementsByTagName('head')[0].appendChild(script);

            var body = window.document.getElementsByTagName('body')[0];
            while (body.children.length) body.removeChild(body.children[0]);

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentSize == 'big') ? 'small' : 'big';
                }
                currentSize = size;
                if (size == 'big') {
                    this.workerFrame.style.width = workerFrameWidthBig + 'px';
                    this.workerFrame.style.left = (windowWidth - workerFrameWidthBig - 5) + 'px';
                } else if (size == 'small') {
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
            this.chooseJobFrameWindow.location.href=me['data-choose-job'];

            this.showHideChooseJobFrame = function(show){
                this.chooseJobFrame.style.display = show ? 'block' : 'none';
            }

        },
        framed: function(document, window) {
            me.modules.dispatcher.init();
            var body = document.getElementsByTagName('body')[0];
            var mainFrameSrc = window.location.href,
                chooseJobFrameSrc = me['data-choose-job'],
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



            while (body.children.length) body.removeChild(body.children[0]);
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
            }

            this.mainFrameWindow.location.href=mainFrameSrc;
            body.appendChild(this.workerFrame);
            this.workerFrameWindow = window.frames[workerFrameName];
            this.workerFrameWindow.location.href=getWorkerFrameSrc();
            body.appendChild(this.chooseJobFrame);
            this.chooseJobFrameWindow = window.frames[chooseJobFrameName];
            this.chooseJobFrameWindow.location.href=chooseJobFrameSrc;

            this.setSize = function(size){
                if (undefined === size) {
                    size = (currentSize == 'big') ? 'small' : 'big';
                }
                currentSize = size;
                if (size == 'big') {
                    this.workerFrame.style.width = workerFrameWidthBig + 'px';
                    this.mainFrame.style.width = mainFrameWidthSmall + 'px';
                    this.workerFrame.style.left = mainFrameWidthSmall + 'px';
                } else if (size == 'small') {
                    this.workerFrame.style.width = workerFrameWidthSmall + 'px';
                    this.mainFrame.style.width = mainFrameWidthBig + 'px';
                    this.workerFrame.style.left = mainFrameWidthBig + 'px';
                }
            };

            this.showHideChooseJobFrame = function(show){
                this.chooseJobFrame.style.display = show ? 'block' : 'none';
            }

            this.setSize('big');
        }
    });
}).call(this, document, window);