/*

chromium-browser --no-sandbox --ignore-certificate-errors --user-data-dir=/tmp/mytests-chrome-data-dir --no-first-run --disable-web-security --load-extension=src/browser-extension/ --auto-open-devtools-for-tabs --disable-popup-blocking 'https://localhost/cartfiller/src/index.html#extension-bootstrap&root=../testsuite/multidomain&url=http://127.0.0.1/cartfiller/testsuite/multidomain/'

optional &chooseJobUrl=...

 */
// Called when the user clicks on the browser action.
var bookmark = false;
var initialized = {};
var mark = '#extension-bootstrap&';

chrome.webNavigation.onCompleted.addListener(function(details) {
  if (false === bookmark && details.url && details.url.indexOf(mark) !== -1) {
    setTimeout(function f() {
      chrome.tabs.executeScript(details.tabId, {
        frameId: details.frameId,
        code: 'document.getElementsByTagName("body")[0].getAttribute("cartfiller-extension-bootstrap-bookmark")'
      }, function(scriptResult) {
        var discoveredBookmark = scriptResult[0];
        if (!discoveredBookmark) {
          setTimeout(f, 10);
          return;
        }
        bookmark = discoveredBookmark;
        var url = ('&' + details.url.split(mark)[1]).split('&url=')[1].split('&')[0];
        chrome.tabs.executeScript(details.tabId, {
          frameId: 0, 
          code: 'window.location.href = ' + JSON.stringify(url) + ';'
        });
      });
    }, 0);
  } else if (bookmark && !initialized[details.tabId] && details.frameId === 0 && details.url !== 'about:blank') {
    initialized[details.tabId] = true;
    setTimeout(function(){
      chrome.tabs.executeScript(details.tabId, {
        frameId: 0, 
        code: 'var s = document.createElement("script"); s.textContent = ' + JSON.stringify(bookmark) + '; document.getElementsByTagName("head")[0].appendChild(s);'
      });
    }, 0);
  }
});
