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

Tests are in /playground. 

## To build

```
npm install
bower install
node_modules/grunt-cli/bin/grunt
```


