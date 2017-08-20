Inject scenarios: 
* initial
  * bookmarklet
  * opening index.html
  * opening local.html and then injecting special bookmarklet for local deployment
  * using special bookmarklet for local deployment straight away and then opening local.html in the tab that will open. Looks like it is abandoned now. 
* slave/helpers
  * bookmarklet for injecting from internet (loads all the normal codebase)
  * bookmarklet to get code from parent (used for local deployment as well)
  * opening index.html directly
  * slave + helper mode - when new tab is only used to ignite the slave tab in multi-window mode


Todo: 
* make absolutely clean aproach when dispatcher is in popup window, so, that window being tested have no clue of automation at all. Make it intially flexible for dashboard to be either as popup or as frame (current approach). Then drop current popup mode by replacing it with new one. 
* make it possible to automate few websites communicating through localStorage
* optimize slave tabs to appear as microframes within dispatcher window (whether popup or framed mode)