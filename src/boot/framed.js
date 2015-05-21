(function(document, window, undefined){
    var getCartFillerUrls = function(){
        var scripts = document.getElementsByTagName('script');
        var src;
        var pattern = /\/boot\/framed.js$/;
        for (var i = scripts.length - 1; i >= 0; i--){
            src = scripts[i].getAttribute('src');
            if (pattern.test(src)) return {cartFillerUrl: src.replace(pattern, '/'), chooseJobUrl: scripts[i].getAttribute('data-choose-job')};
        }
        alert('could not find URL for bootloader');
    }
    var body = document.getElementsByTagName('body')[0];
    while (body.children.length) body.removeChild(body.children[0]);
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
        currentSize = 'big';

    var mainFrame = document.createElement('iframe');
    mainFrame.setAttribute('name', mainFrameName);
    mainFrame.setAttribute('src', mainFrameSrc);
    mainFrame.style.height = framesHeight + 'px';
    mainFrame.style.position = 'fixed';
    mainFrame.style.left = '0px';
    mainFrame.style.top = '0px;';

    var workerFrame = document.createElement('iframe');
    workerFrame.setAttribute('name', workerFrameName);
    workerFrame.setAttribute('src', workerFrameSrc);
    workerFrame.style.height = framesHeight + 'px';
    workerFrame.style.position = 'fixed';
    workerFrame.style.top = '0px';

    var chooseJobFrame = document.createElement('iframe');
    chooseJobFrame.setAttribute('name', chooseJobFrameName);
    chooseJobFrame.setAttribute('src', chooseJobFrameSrc);
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
        postMessage('bootstrap', {angular : workerFrameSrc.replace(/src\//, 'bower_components')});

    };
    mainFrame.onload = function(){
        mainFrameLoaded = true;
        if (workerFrameLoaded){
            bootstrapCartFiller();
        }
    };
    window.addEventListener('message', function(event) {
        var pattern = /^cartFillerMessage:(.*)$/;
        var test = pattern.exec(event.data);
        if (null != test){
            var message = JSON.parse(test[1]);
            if (message.cmd == 'register'){
                workerFrameLoaded = true;
                if (mainFrameLoaded){
                    bootstrapCartFiller();
                }
            } else if (message.cmd == 'makeSmaller') {
                setSize('small');
            } else if (message.cmd == 'makeBigger') {
                setSize('big');
            } else if (message.cmd == 'toggleSize') {
                setSize();
            } else if (message.cmd == 'chooseJob') {
                showHideChooseJobFrame(true);
            } else if (message.cmd == 'chooseJobCancel') {
                showHideChooseJobFrame(false);
            } else if (message.cmd == 'jobDetails') {
                showHideChooseJobFrame(false);
                postMessage('jobDetails', message);
            }
        }
    }, false);
    body.appendChild(mainFrame);
    body.appendChild(workerFrame);
    body.appendChild(chooseJobFrame);
})(document, window);
