(function(document, window, undefined){
    var getCartFillerUrls = function(){
        var scripts = document.getElementsByTagName('script');
        var src;
        var pattern = /\/boot\/framed.js(\?\d+)?$/;
        for (var i = scripts.length - 1; i >= 0; i--){
            src = scripts[i].getAttribute('src');
            if (pattern.test(src)) return {
                cartFillerUrl: src.replace(pattern, '/'), 
                chooseJobUrl: scripts[i].getAttribute('data-choose-job'), 
                debug: scripts[i].getAttribute('data-debug'),
                workerSrc: scripts[i].getAttribute('data-worker')
            };
        }
        alert('could not find URL for bootloader');
    }
    var body = document.getElementsByTagName('body')[0];
    var cartFillerUrls = getCartFillerUrls(),
        mainFrameName = 'cartFillerMainFrame',
        mainFrameSrc = window.location.href,
        workerFrameName = 'cartFillerWorkerFrame',
        workerFrameSrc = cartFillerUrls.cartFillerUrl,
        chooseJobFrameName = 'cartFillerChooseJobFrame',
        chooseJobFrameSrc = cartFillerUrls.chooseJobUrl,
        windowWidth = window.innerWidth,
        windowHeight = window.innerHeight,
        mainFrameWidthBig = windowWidth * 0.8 - 1,
        mainFrameWidthSmall = windowWidth * 0.2 - 1,
        workerFrameWidthBig = windowWidth * 0.8 - 1,
        workerFrameWidthSmall = windowWidth * 0.2 - 1,
        framesHeight = windowHeight - 15,
        chooseJobFrameLeft = 0.05 * windowWidth,
        chooseJobFrameWidth = 0.9 * windowWidth,
        chooseJobFrameTop = 0.05 * windowHeight,
        chooseJobFrameHeight = 0.9 * windowHeight,
        mainFrameLoaded = false,
        workerFrameLoaded = false, 
        currentSize = 'big',
        worker = false,
        workerCurrentTaskIndex = false,
        workerCurrentStepIndex = false,
        workerOnLoadHandler = false,
        overlayClassName = 'cartFillerOverlayDiv',
        cartFillerAPIGlobalVarName = 'cartFillerAPI';

    if (undefined !== window[cartFillerAPIGlobalVarName]) {
        alert('CartFiller already attached, please refresh page to reattach');
        return;
    }
    while (body.children.length) body.removeChild(body.children[0]);
    var mainFrame = document.createElement('iframe');
    mainFrame.setAttribute('name', mainFrameName);
    mainFrame.style.height = framesHeight + 'px';
    mainFrame.style.position = 'fixed';
    mainFrame.style.left = '0px';
    mainFrame.style.top = '0px';

    var workerFrame = document.createElement('iframe');
    workerFrame.setAttribute('name', workerFrameName);
    workerFrame.style.height = framesHeight + 'px';
    workerFrame.style.position = 'fixed';
    workerFrame.style.top = '0px';

    var chooseJobFrame = document.createElement('iframe');
    chooseJobFrame.setAttribute('name', chooseJobFrameName);
    chooseJobFrame.style.display = 'none';
    chooseJobFrame.style.height = chooseJobFrameHeight + 'px';
    chooseJobFrame.style.top = chooseJobFrameTop + 'px';
    chooseJobFrame.style.left = chooseJobFrameLeft + 'px';
    chooseJobFrame.style.width = chooseJobFrameWidth + 'px';
    chooseJobFrame.style.position = 'fixed';
    chooseJobFrame.style.background = 'white';

    var setSize = function(size){
        if (undefined === size) {
            size = (currentSize == 'big') ? 'small' : 'big';
        }
        currentSize = size;
        if (size == 'big') {
            workerFrame.style.width = workerFrameWidthBig + 'px';
            mainFrame.style.width = mainFrameWidthSmall + 'px';
            workerFrame.style.left = mainFrameWidthSmall + 'px';
        } else if (size == 'small') {
            workerFrame.style.width = workerFrameWidthSmall + 'px';
            mainFrame.style.width = mainFrameWidthBig + 'px';
            workerFrame.style.left = mainFrameWidthBig + 'px';
        }
    };
    var showHideChooseJobFrame = function(show){
        chooseJobFrame.style.display = show ? 'block' : 'none';
    };

    setSize(currentSize);
    var postMessage = function(cmd, details){
        if (undefined === details) {
            details = {};
        }
        details.cmd = cmd;
        workerFrame.contentWindow.postMessage(
            'cartFillerMessage:' + JSON.stringify(details),
            '*'
        );

    };
    var bootstrapCartFiller = function(){
        postMessage('bootstrap', {lib : workerFrameSrc.replace(/src\//, 'lib'), debug: cartFillerUrls.debug});

    };
    var setMainFrameOnLoadHadler = function(){
        mainFrame.onload = function(){
            if (!mainFrameLoaded){
                mainFrameLoaded = true;
                if (workerFrameLoaded){
                    bootstrapCartFiller();
                }
            } else {
                if (workerOnLoadHandler) {
                    workerOnLoadHandler();
                }
            }
        }
    };
    setMainFrameOnLoadHadler();
    var resetWorker = function(){
        workerCurrentTaskIndex = workerCurrentStepIndex = workerOnLoadHandler = false;
    }
    var getScrollLeft = function(){
        var d = window.frames[mainFrameName].document;
        return d.documentElement.scrollLeft || d.body.scrollLeft
    }
    var getScrollTop = function(){
        var d = window.frames[mainFrameName].document;
        return d.documentElement.scrollTop || d.body.scrollTop

    }


    var createOverlay = function(left, top, right, bottom){
        var d = window.frames[mainFrameName].document;
        var div = d.createElement('div');
        div.style.position = 'absolute';
        div.style.left = left + 'px';
        div.style.top = top + 'px';
        div.style.width = (right - left) + 'px';
        div.style.height = (bottom - top) + 'px';
        div.style.backgroundColor = 'rgba(0,0,0,0.2)';
        div.style.zIndex = 100000;
        div.className = overlayClassName;
        div.onclick = function(){removeOverlay();};
        d.getElementsByTagName('body')[0].appendChild(div);

    };
    var scrollTo = function(left, top, right, bottom){
        var d = window.frames[mainFrameName].document;
        var centerX = (right + left ) / 2;
        var centerY = (bottom + top) / 2;
        var currentX, currentY;
        var destX = centerX - (d.documentElement.clientWidth / 2);
        var destY = centerY - (d.documentElement.clientHeight / 2);
        while (true){
            currentX = getScrollLeft();
            currentY = getScrollTop();
            window.frames[mainFrameName].scrollBy(destX - currentX, destY -  currentY);
            if (getScrollLeft() == currentX &&
                getScrollTop() == currentY) {
                break;
            }
        }

    };
    var removeOverlay = function(){
        var d = window.frames[mainFrameName].document;
        var divs = d.getElementsByClassName(overlayClassName);
        for (var i = divs.length - 1; i >= 0 ; i--){
            divs[i].parentNode.removeChild(divs[i]);
        }
    };
    var highlightedElement = false;
    var api = {
        registerWorker: function(cb){
            worker = cb(window.frames[mainFrameName], undefined, api);
            var list = {};
            for (var taskName in worker){
                if (worker.hasOwnProperty(taskName)){
                    var taskSteps = [];
                    for (var i = 0 ; i < worker[taskName].length; i++){
                        if ("string" === typeof worker[taskName][i]){
                            taskSteps.push(worker[taskName][i]);
                        }
                    }
                    list[taskName] = taskSteps;
                }
            }
            postMessage('workerRegistered', {jobTaskDescriptions: list});
            return api;
        },
        result: function(message, recoverable){
            var status;
            if ((undefined === message) || ("" === message)) {
                status = 'ok';
            } else if ("string" === typeof message){
                status = recoverable ? 'skip' : 'error';
            } else {
                throw "invalid message type " + typeof(message);
            }
            postMessage('workerStepResult', {index: workerCurrentTaskIndex, step: workerCurrentStepIndex, status: status, message: message});
            resetWorker();
            return api;
        },
        onload: function(cb){
            workerOnLoadHandler = cb;
            setMainFrameOnLoadHadler();
            return api;
        },
        highlight: function(element, allElements){
            highlightedElement = element;
            var rect;
            if (undefined != window.frames[mainFrameName].jQuery && (element instanceof window.frames[mainFrameName].jQuery)){
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
            removeOverlay();
            var body = window.frames[mainFrameName].document.getElementsByTagName('body')[0];
            var full = body.getBoundingClientRect();
            var scrollTop = getScrollTop();
            var scrollLeft = getScrollLeft();
            var pageRight = Math.max(full.right + scrollLeft, body.scrollWidth);
            var pageBottom = Math.max(full.bottom + scrollTop, body.scrollHeight);
            if (undefined !== element) {
                var border = 5;
                createOverlay(0, 0, rect.left + scrollLeft - border, pageBottom);
                createOverlay(rect.right + scrollLeft + border, 0, pageRight, pageBottom);
                createOverlay(rect.left + scrollLeft - border, 0, rect.right + scrollLeft + border, rect.top + scrollTop - border);
                createOverlay(rect.left + scrollLeft - border, rect.bottom + scrollTop + border, rect.right + scrollLeft + border, pageBottom);
                scrollTo(rect.left + scrollLeft, rect.top + scrollTop, rect.right + scrollLeft, rect.bottom + scrollTop);
            } else {
                createOverlay(0, 0, pageRight, pageBottom);
            }
            return api;
        },
    }
    window[cartFillerAPIGlobalVarName] = api;

    window.addEventListener('message', function(event) {
        var pattern = /^cartFillerMessage:(.*)$/;
        var test = pattern.exec(event.data);
        if (null != test){
            var message = JSON.parse(test[1]);
            if ('register' === message.cmd){
                workerFrameLoaded = true;
                if (mainFrameLoaded){
                    bootstrapCartFiller();
                }
            } else if ('makeSmaller' === message.cmd) {
                setSize('small');
            } else if ('makeBigger' === message.cmd) {
                setSize('big');
            } else if ('toggleSize' === message.cmd) {
                setSize();
            } else if ('chooseJob' === message.cmd) {
                showHideChooseJobFrame(true);
            } else if ('chooseJobCancel' === message.cmd) {
                showHideChooseJobFrame(false);
            } else if ('jobDetails' === message.cmd) {
                showHideChooseJobFrame(false);
                postMessage('jobDetails', message);
            } else if ('loadWorker' === message.cmd) {
                if ("string" === typeof cartFillerUrls.workerSrc){
                    message.src = cartFillerUrls.workerSrc;
                }
                var workerScript = document.createElement('script');
                if (/\?/.test(message.src)){
                    message.src += '&';
                } else {
                    message.src += '?';
                }
                message.src += (new Date()).getTime();
                workerScript.setAttribute('src', message.src);
                worker = false;
                body.appendChild(workerScript);
            } else if ('invokeWorker' === message.cmd) {
                if ((false !== workerCurrentTaskIndex) || (false !== workerCurrentStepIndex)){
                    var err = 'ERROR: worker task is in still in progress';
                    alert(err);
                    postMessage('workerStepResult', {index: message.index, step: message.step, result: err});
                } else {
                    workerCurrentTaskIndex = message.index;
                    workerCurrentStepIndex = message.step;
                    var env = {
                        messageIndex: message.index
                    }
                    try {
                        worker[message.task][(message.step * 2) + 1](message.details, highlightedElement, env);
                    } catch (err){
                        alert(err);
                        debugger;
                        throw err;
                    }
                }
            } else if ('resetWorker' === message.cmd){
                resetWorker();
            }
        }
    }, false);
    body.appendChild(mainFrame);
    window.frames[mainFrameName].location.href=mainFrameSrc;
    body.appendChild(workerFrame);
    window.frames[workerFrameName].location.href=workerFrameSrc;
    body.appendChild(chooseJobFrame);
    window.frames[chooseJobFrameName].location.href=chooseJobFrameSrc;
})(document, window);
