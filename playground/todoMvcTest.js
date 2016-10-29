cartfiller = {
    title: 'sample test',
    globals: {
        pure: false
    },
    details: [
        '# Sample test for TodoMVC',
        {if: 'pure', then: [], else: [
            {_say: {message: 'The demo:\n* philosophy\n* test definition syntax\n* browser action syntax', sleepMs: 10000}},
            {_say: {message: 'Philosophy:\n\n1. separate test scenario from browser actions (like FinNesse)\n2. make tests interactive (like Cypress)\n3. do not require any browser-side software or plugins (like Seleinum or Cypress Chrome Extension) and be cross-browser', sleepMs: 15000}},
            {_say: {message: 'Test definition - human readable:\n\ncartfiller = {\n    title: \'sample test\',\n    details: [\n        \'# Sample test for TodoMVC\' // MD heading syntax,\n        {openTodomvc: {}}, // task with no parameters\n\n        \'## Add some items\',\n        {addItem: {name: \'item #one\'}}, // task with parameter\n        {addItem: {name: \'item two\'}},\n        {addItem: {name: \'item three\'}},\n\n        \'## Mark item as completed\',\n        {triggerCheckbox: {name: \'item two\'}}\n    ]\n}', pre: true, sleepMs: 20000}},
            
            {_say: {message: 'Browser action syntax - JS code:\n\ncf.task(\'openTodomvc\')\n    .openUrl(globals.baseUrl)\n    .get(\'input#new-todo:visible\')\n    .exists() // wait for this element to appear\n    .ready() // make sure that document.readyState === \'complete\'\n    .then(function(resultOfPreviousStep) {\n        ... your code here ...\n        api.result(); // or api.result(\'error!\'); if there is an error\n    })\n    .say(\'we are ready\')', pre: true, clear: true, sleepMs: 20000}},
        ]},
        {openTodomvc: {}},

        {if: 'pure', then: [], else: [
            {_say: {message: 'Browser action syntax:\n\ncf.task(\'removeAllItems\')\n    .while( // example of looping\n        cf.get(\n            cf.lib( // store for later reuse\n                \'todolist\' // name of library entry\n                cf.get(\'ul#todo-list:visible\')\n            )\n        )\n        .exists(),\n\n        cf.getlib(\'todolist\') // get selector from library\n        .find(\'button.destroy\')\n        .first()\n        .css(\'display\', \'block\') // otherwise it appears only when hovered\n        .click()\n    )\n    .say(\'all items removed\')', pre: true, clear: true, sleepMs: 20000}},
        ]},
        {removeAllItems: {}},
        
        '## Add some items',
        {if: 'pure', then: [], else: [
            {_say: {message: 'Browser action syntax:\n\ncf.task(\'addItem\')\n    .get(\'#new-todo:visible\')\n    .type(\'${name}\') // simulate keyboard typing\n    .enter() // simulate pressing enter\n    .getlib(\'getItemLi\') // get from library\n    .exists()\n    .say(\'item \'${name}\' added\')', pre: true, clear: true, sleepMs: 15000}},
        ]},
        {addItem: {name: 'item #one'}},
        {addItem: {name: 'item two'}},
        {addItem: {name: 'item three'}},
        '## Mark item as completed',
        {if: 'pure', then: [], else: [
            {_say: {message: 'Browser action syntax:\n\ncf.task(\'triggerCheckbox\')\n    .lib(   \n        \'getItemLi\', \n        cf\n            .getlib(\'todolist\') \n            .find(\'label:visible\')  \n            .withText(\'${name}\') \n            .closest(\'li:visible\') \n    )\n    .getlib(\'getItemLi\') \n    .find(\'input[type="checkbox"]:visible\') \n    .click()', pre: true, clear: true, sleepMs: 25000}},
        ]},
        {triggerCheckbox: {name: 'item two'}},
        '## Set filter to show only active items',
        {if: 'pure', then: [], else: [
            {_say: {message: 'Browser action syntax:\n\ncf.task(\'filter\')\n    .get(\'#filters:visible a:visible\')\n    .withText(\'${type}\')\n    .ifNot(\n        cf.is(\'.selected\'),\n        cf.click()\n        // let\'s make sure filter became selected\n        .is(\'.selected\')\n    )', pre: true, clear: true, sleepMs: 25000}},
        ]},
        {filter: {type: 'Active'}},
        '## Verifications', 
        {if: 'pure', then: [], else: [
            {_say: {message: 'Browser action syntax:\n\ncf.task(\'makeSureItemIsNotThere\')\n    .getlib(\'getItemLi\')\n    .absent()', pre: true, clear: true, sleepMs: 12000}},
        ]},
        {makeSureItemIsNotThere: {name: 'item two'}},
        {if: 'pure', then: [], else: [
            {_say: {message: 'Browser action syntax:\n\ncf.task(\'makeSureItemIsThere\')\n    .getlib(\'getItemLi\')\n    .exists()', pre: true, clear: true, sleepMs: 12000}},
        ]},
        {makeSureItemIsThere: {name: 'item #one'}},
        {makeSureItemIsThere: {name: 'item three'}},
        {triggerCheckbox: {name: 'item #one'}},
        {makeSureItemIsNotThere: {name: 'item #one'}},

        '# Ok, now we want random item name',
        {if: 'pure', then: [], else: [
            {_say: {message: 'It is often necessary to give random names to items,\nfor example to let several tests run concurrently\nagainst same application and do not collide with each\nother. It can be done purely in test definition without\nany changes in browser actions. For example here\nwe will put random item name into a randomItemName\nglobal variable and then refer to it from following tasks.\n\n    {_set: {ref: [\'randomItemName\'], value: [\'_random\']}},\n    {addItem: {name: [\'randomItemName\']}},\n    {makeSureItemIsThere: {name: [\'randomItemName\']}},', pre: true, sleepMs: 25000, clear: true}},
        ]},
        {_set: {ref: ['randomItemName'], value: ['_random']}},
        {addItem: {name: ['randomItemName']}},
        {makeSureItemIsThere: {name: ['randomItemName']}},
        
        {if: 'pure', then: [], else: [
            {_say: {message: 'That\'s it for now, thank you', clear: true}},
            {_say: {message: '', clear: true}},
        ]},
    ]
}
