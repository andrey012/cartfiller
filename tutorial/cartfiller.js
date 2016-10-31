cartfiller = {
    /**
     * This is testsuite configuration file. It consists of 3 sections
     */
    /**
     * Globals are configurable parameters - which means that you can override them in your url in same
     * way as you pass things to your applications via environment variables. 
     */
    globals: {
        globalParameterOne: "globalParameterOneValue",
        globalParameterTwo: "globalParameterTwoValue"
    },
    /**
     * Workers are browser actions. You can have many, but all of them should be listed here. 
     */
    worker: [
        'workers/001.basic.js',
        'workers/002.selectors.js',
        'workers/003.actions.js',
        'workers/004.assertions.js',
        'workers/005.library.js',
        'workers/006.globals.js',
        'workers/007.ifElse.js',
        'workers/008.loops.js',
        'workers/009.taskParameters.js',
        'workers/010.customSteps.js',
        'workers/011.messagesAndModals.js',
        'workers/012.sharingSteps.js',
        'workers/013.stepGenerators.js',
        'workers/014.frames.js',
        'workers/015.multipleWindows.js',
        '../testsuite/otherTutorialStuff.js',
    ],
    /**
     * Tests are test scenarios. True of false values mean - whether particular test should be executed when
     * all tests in the testsuite are run. If you say false - this test will not executed on CI or when you
     * click "run all", but you can still execute it manually.
     */
    tests: {
        testScenarioFeatures: {
            '001.basicTest': true,
            '002.parametrizedTest': true,
            /**
             * Tests can have parameters in a url style
             */
            '002.parametrizedTest?parameter1=1&parameter2=thevalue&withParameters=true': true,
            '003.referencingGlobalsTest': true,
            '004.loopingTest': true,
            '005.testThatIncludesAnotherTest': true,
            '006.includedTest': true,
            '007.anotherIncludedTest': true,
            '008.cdataTest': true,
        },
        browserActionsAkaWorkersFeatures: {
            workersDemo: true,
        }
    }
}