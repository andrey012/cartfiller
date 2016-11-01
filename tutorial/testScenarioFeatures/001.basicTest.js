cartfiller = {
/**
 * This cartfiller = { is used when serving tests straight from file:/// schema. Normally you
 * can't make Ajax calls against file:/// schema, but you can add <script> tag with src pointing
 * to file:/// so this trick is used for compatibility. If you are never going to serve from 
 * file:///, which is rarely needed, you can just start you test file with {
 * If cartfiller = { is used, then it should be the very first line, so you should not put 
 * anything above it. 
 */
    /**
     * Tests can define their own globals. If not overriden in cartfiller.js these values will get
     * into globals, otherwise they will be overwritten by values from cartfiller.js or from test. 
     * Usual case is to store e.g. logins and passwords in globals, this way you can override them 
     * easily in order to launch tests agains production deployment. This is also way to declare,
     * that this test uses these globals. 
     */
    globals: {
        globalParameterOne: 'theLocalValue1',
        globalParameterThree: 'theLocalValue3',
    },
    /**
     * This is main part of test - list of tasks. This example is flat, but other tests show other
     * options to organize tasks.
     * Empty tests are forbidden, you have to have at least one task in the test.
     */
    details: [
        /**
         * First of all you can decorate your tests with headings and pieces of texts
         */
        '# The heading',
        '## The subheading',
        '### The smaller subheading',
        'Just text comment',
        /**
         * If you want to put something fancy and are not eager to escape it, you can use following 
         * feature - all functions are converted to strings by fetching comment between /* and */
        /** Like this
         */
        function() {/* I don't want to escape quotes when I say "Hello World!".
            And this way I can write multiline comments.*/},
        /**
         * Tasks are defined as nested object, whoes key is name of task and value keeps task 
         * parameters. If task have no parameters you still have to specify empty object.
         * Task names are case sensitive. In test scenarios you refer to a task, and in 
         * workers (which contain browser objects) you define what actions should a task do.
         * This task is defined in workers/001.basic.js
         */
        {openTodomvc: {}},
        /**
         * Task may also have parameters. Parameter 'task' is forbidden right now, so you can't say
         * {addTask: {task: 'myTask'}}
         */
        {addItem: {name: 'item one'}},
        /**
         * There are some predefined tasks, which start with _ (underscore): 
         */
        {_say: {message: 'Hello World!'}},
        /**
         * Of course task names can be more human readable, i.e. not camelcase
         */
        {'More human readable task name': {}},

    ]
}