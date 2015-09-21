var system = require('system');
var webPage = require('webpage');
var page = webPage.create();
page.viewportSize = {
      width: 1024,
      height: 600 
};
page.onConsoleMessage = function(msg) {
    console.log(msg);
};
console.log(system.args);
page.open(system.args[1], function() {});
