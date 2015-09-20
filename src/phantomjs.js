var system = require('system');
var webPage = require('webpage');
var page = webPage.create();
console.log(system.args);
page.open(system.args[1], function() {});

