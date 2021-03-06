
# Use as a testing tool

Example testsuite deployment: [https://andrey012.github.io/cartfiller/dist?root=https://andrey012.github.io/cartfiller/testsuite]

## Files

You will need
  * worker(s) -- JS files that run in the scope of target website (website being tested) and do the job. You can have several workers. Example worker is [https://andrey012.github.io/cartfiller/testsuite/worker.js]
  * test scenarios -- JSON files, see below for the format description. Example scenario is [https://andrey012.github.io/cartfiller/testsuite/suite1/test11.json]
  * cartfiller.json -- file, that lists test scenario files, and may optionally parametrise them. Example is [https://andrey012.github.io/]
  


# Use as a website automation tool

To use CartFiller 3 things are necessary besides the CartFiller itself: 

  - Worker JS code, that will do actual things on target website. See [samples/worker.js](samples_worker.js.html) as an example. URL to worker should be in the bookmarklet. Worker JS code delivers pieces of code for particular steps of particular tasks, that will be executed in context of target website. Task is i.e. "clear cart" or "add item to cart", when item details are submitted separately through task variable.
  - Choose Job HTML page, that will be displayed in the frame. Normally this is a page of another application, which provides data for CartFiller. This page should use jquery-cartFiller.js jQuery plugin to submit job details and receive results. URL to choose job HTML page should be in the bookmarklet. See [samples/choose-job.html](../samples/choose-job.html) as a simpliest example.
  - The bookmarklet itself, there are different types of JS injection and different types of opening target website (in frame or as a popup). Bookmarks can be generated using jquery-cartFiller.js jQuery plugin. See [samples/sample-shop.html](../samples/sample-shop.html) for code, that creates bookmarklets. 

Bookmarklet should then be dragged by user to his bookmark bar or other bookmarks store, then user should navigate to target website and click on bookmarklet. This lets CartFiller to appear within context of target website, and get control over target website.