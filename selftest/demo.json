cartfiller = {
    "title": "Demo",
    "globals": {
        "baseUrl": "",
    },
    "details": [
        {"task": "open start page"},
        {"task": "say", "message": "CartFiller is a functional test framework/interactive test execution tool for web applications. CartFiller's UI consists of 3 frames. This frame is the testsuite, you can see list of tests here. This frame pops up to select test, and is hidden during test execution. Let's load one test and see what happens.", "highlight": "chooseJobFrame"},
        {"task": "load test", "testIndex": 0},
        {"task": "say", "message": "This is interactive test dashboard - it shows steps of the test being executed, lets you pause test, resume test, replay particular steps and even change test details. Since CartFiller is purely in-browser application itself, it can test itself as well, and this \"CartFiller in CartFiller\"  happens in this demo. That's why you can see another faded out dashboard at the right side of the page.", "highlight": "workerFrame", "clearArrow": true},
        {"task":"toggle ChooseJob frame"},
        {"task": "say", "message": "The idea is that you can read scenario of any test as a story and interactively get to any step of any test. Let's click \"Expand\" to open test scenario:", "highlight": "chooseJobFrame", "clearArrow": true},
        {"task": "click expand", "testIndex": "0"},
        {"task": "highlight all test headings"},
        {"task": "say", "message": "These are headings - they do nothing, just let you structure test scenario is a more readable way"},
        {"task": "highlight all test tasks"},
        {"task": "say", "message": "These are test tasks. Each task may have parameters, which can be either explicitly specified in test scenario or derived from global parameters. Each task consists of steps, but steps are too small to be shown in the scenario."},
        {"task": "find task", "taskIndex": "7."},
        {"task": "say", "message":"If we click on this link, CartFiller will guide us quickly to this step of the test"},
        {"task": "click"},
        {"task": "wait for inner CartFiller to stop"},
        {"task": "find task in worker", "taskName": "7. addToCart"},
        {"task": "say", "message":"Here it is, you can now play around with page under test or proceed step by step. In this demo we'll proceed step by step."},
        {"task": "find step button"},
        {"task": "say", "message":"Here is button to make one step, by clicking it you may move forward and see how it works"},
        {"task": "click", "clicks": "5", "interval": "1000"},
        {"task": "say", "message": "You can try clicking this button youself now"},
    ]
}