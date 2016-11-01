cartfiller = {
    details: [
        {openTodomvc: {}},
        {removeAllItems: {}},
        {addItem: {name: 'item one'}},
        {toggleItem: {name: 'item one'}},
        {selectorsDemo: {taskParam: 'All'}},

        {removeAllItemsUsingWhileNot: {}},
        {addItem: {name: 'item one'}},

        {ifDemo: {}},
        {_assertEquals: {ref: ['ifDemo'], value: 'label exists'}},
        {_assertEquals: {ref: ['ifNotDemo'], value: 'iframe does not exist'}},
        {_assertEquals: {ref: ['ifLibDemo'], value: 'input exists'}},
        {_assertEquals: {ref: ['customCondition1'], value: 'YES'}},
        {_assertEquals: {ref: ['customCondition2'], value: 'NO'}},
        {removeAllItems: {}},

        {passingData: {}},

        {makeSureItemExists: {name: "myNewTodo Item"}},
        {removeAllItems: {}},

        {typeExampleWithStaticText: {}},
        {makeSureThatNewItemInputHasText: {text: 'static text'}},
        {makeSureThatNoItemsExist: {}},

        {typeExampleWithTextFromTaskParameters: {textToType: 'text from task parameter'}},
        {makeSureThatNewItemInputHasText: {text: 'text from task parameter'}},
        {makeSureThatNoItemsExist: {}},

        {pressEnterExample: {}},
        {makeSureItemExists: {name: "text from task parameter"}},
        {makeSureItemIsNotChecked: {name: "text from task parameter"}},
        {clickExample: {}},
        {makeSureItemIsChecked: {name: "text from task parameter"}},

/* commenting this out since paste simulation is not working on PhantomJs
        {pasteExample: {text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'}},
        {makeSureThatNewItemInputHasText: {text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'}},
*/
        
        {someDirtyAction: {message: 'AGGGHHHRRR'}},
        {makeSureThatWholeBodyElementContainsOnly: {text: "AGGGHHHRRR"}},
        {openTodomvc: {}},
        {removeAllItems: {}},

        {sayExample: {message: 'Hello World!'}},
        {sayPreExample: {message: 'function helloWorld() {\n    return \'Hello World!\';\n}'}},
        {sayPreExampleWithNextButton: {message: 'function helloWorld() {\n    return \'Hello World!\';\n}'}},

        {addItem: {name: "globalParameterTwoValue"}},
        {readGlobalIntoItemName: {referencedGlobalVariable: ['globalParameterOne']}},
        {makeSureThatNewItemInputHasText: {text: 'globalParameterOneValue'}},
    ]
}