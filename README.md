# CartFiller [![Build Status](https://secure.travis-ci.org/andrey012/cartfiller.svg?branch=master)](https://travis-ci.org/andrey012/cartfiller)

[Demo one](http://andrey012.github.io/cartfiller/dist/#root=..%2Fplayground&job=todoMvcTest&task=0&step=1&slow=1)

[Demo two](https://andrey012.github.io/cartfiller/dist/index.ga.html#root=https%3A%2F%2Fandrey012.github.io%2Fcartfiller%2Fselftest&job=demo&task=0&step=1&slow=1)

## What is it

CartFiller is a functional testing framework.

Main features: 
* Test scenarios are seaparated from browser action code (similar to FitNesse)
* Test execution can be interactive (similar to Cypress)
* Does not require any software (i.e. Selenium) or browser plugins/extensions, and is cross-browser. 

Some sugar: 
* CSS query builder
* Permalinks to particular test steps
* Search inside tests and get straight to the step
* Video recording and adding audio recorded through dashboard
* Code and test hotswap, you can change your test during test execution. 
* CI execution using any browser including PhantomJS

## To try

```
git clone https://github.com/andrey012/cartfiller.git
cd cartfiller 
npm install 
bower install
npm run demo
```

Tests are in /playground and /tutorial

## To try Selector Builder without cloning
### Right here
- Click the link: <a href="(javascript:try{(function(f,d,u,v,i,w,y,p){y=window.open('about:blank','_blank','resizable=1,height=1,width=1,scrollbars=1')||alert('Allow popups and retry');y.eval('var u=\''+u+'\',v=\''+v+'\',d=document,f,p;p=/^\'cartFillerEval\'/;window.addEventListener(\'message\',function(e){if(f)return;try{if(p.test(x=e.data)){f=1;eval(\'(function(){\'+x+\'}).call({cartFillerEval:[\\\'\'+u+\'\\\',2,\\\'https://andrey012.github.io/cartfiller/dist/?cfv1505723763721#root=..%2Fplayground%2FselectorBuilder&job=selectorBuilder\\\',1,,\\\'\\\',\\\'\\\']});\');}}catch(e){alert(e);}},true);i=d.createElement(\'iframe\');d.getElementsByTagName(\'body\')[0].appendChild(i);i.contentWindow.location.href=u+v+\'?\'+(new Date()).getTime();setTimeout(function(){if(!f)alert(\'error\');},5000);');})(0,document,'https://andrey012.github.io/cartfiller/dist','/i.htm');}catch(e){alert(e);})">SelectorBuilder</a>
- Your browser will probably complain about popup windows, enable popups and click link again
- When the popup window will appear look for ***Search*** button and click it
- In your main browser window (not popup) point your mouse to the element that you want to build selector for and click
- You will see DOM tree buttons in the popup window, click them to build selector.
- When UI is damaged if browser window looses focus - use shift+mousemove instead of click everywhere. It will let you preserve focus in the target browser window and still build selector.

### On other websites
- Drag-and-drop the ***SelectorBuilder*** link from above to your bookmarks bar.
- Open target page
- Click SelectorBuilder bookmark 

## Tutorial

[Check out tutorial README](tutorial)

## To build

```
npm install
bower install
node_modules/grunt-cli/bin/grunt
```


