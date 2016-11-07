cartfiller = function(){/*
    testScenarioFeatures/010.cucumberStyle
    
    Given TodoMVC is open
    And task list is empty
    When user types some task name in the input textbox
    And presses enter
    Then some task name should appear in the list of tasks

    # you can also refer to globals/test parameters
    When user types <globalParameterOne> in the input textbox
    And presses enter
    Then <globalParameterOne> should appear in the list of tasks

    # you can also use globals/test parameters as part of values
    # So, here we have a step defined as 
    # ^When user types ${value} in the input textbox
    # which means, that value is 
    # "globalParameterOne value is <globalParameterOne>"
    # So, <globalParameterOne> is a reference to globals/test parameters
    # and value will be resolved to 
    # globalParameterOne value is globalParameterOneValue"
    When user types globalParameterOne value is <globalParameterOne> in the input textbox
    And presses enter
    Then globalParameterOne value is globalParameterOneValue should appear in the list of tasks
    
*/}