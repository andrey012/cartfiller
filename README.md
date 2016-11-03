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
- <a href="https://andrey012.github.com/cartfiller/playground/selectorBuilder/demo.html">This page</a> will contain a ***SelectorBuilder*** link: 
- Click the link
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


