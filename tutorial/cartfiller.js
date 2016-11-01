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
        'workers/005.passingDataBetweenSteps.js',
        'workers/006.library.js',
        'workers/007.globals.js',
        'workers/008.ifElse.js',
        'workers/009.while.js',
        'workers/010.taskParameters.js',
        'workers/011.customSteps.js',
        'workers/012.messagesAndModals.js',
        'workers/013.sharingSteps.js',
        'workers/014.stepGenerators.js',
        'workers/015.frames.js',
        'workers/016.multipleWindows.js',
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
            '002.builtinTasksTest': true,
            '003.parametrizedTest': true,
            /**
             * Tests can have parameters in a url style
             */
            '003.parametrizedTest?parameter1=1&parameter2=thevalue&withParameters=true': true,
            '004.referencingGlobalsTest': true,
            '005.loopingTest': true,
            '006.testThatIncludesAnotherTest': true,
            '007.includedTest': true,
            '008.anotherIncludedTest': true,
            '009.cdataTest': true,
        },
        browserActionsAkaWorkersFeatures: {
            workersDemo: true,
        }
    }
}