/**
 * Represents the cf.* task Wrapper
 * 
 * cases: 
 * * linear
 * cf
 *  .find(...)
 *  .click()
 *  .then(function(){
 *    ...
 *    cf.result(...);
 *  })
 *  .export('task - click the button')
 * 
 * * static step list -
 * cf
 *  .find(...)
 *  .click()
 *  .share('myTwoSteps')
 *  .export('task - find and click')
 * 
 * cf
 *  .use('myTwoSteps')
 *  
 * * parametrized generator
 * cf
 *  .generator('buildSomeSteps', function (opts) {
 *   return cf
 *     .find(... opts.b ... opts.c ... )
 *     .click()
 *     .use(opts.a && cf
 *        .find(...)
 *        .click()
 *     )
 *     // no save here
 *   })
 *  .use('buildSomeSteps', {a: 'a0', b: 'b0', c: 'c0'})
 *  .export('task - generated with a0, b0 and c0)
 * 
 * cf
 *  .use('buildSomeSteps', {a: 'a', b: 'b', c: 'c'})
 *  .export('task - generated with a, b and c)
 *
 * cf
 *  .use('buildSomeSteps', {a: 'a1', b: 'b1', c: 'c1'})
 *  .export('task - gnerated with a1, b1 and c1)
 * 
 * * step slice reuse
 * cf
 *  .find(...)
 *  .click()
 *  .name('find theButton').find(...)
 *  .click()
 *  .since('find theButton').share('helperToFindAndClickTheButton')
 *  .find(...)
 *  .click()
 * 
 * cf
 *  .use('helperToFindAndClickTheButton')
 *  ...
 * 
 * * referencing results of earlier steps
 * cf
 *  .find(...).as('thelink')
 *  .find(...).as('theheading')
 *  .with('thelink').click()
 *  .with('thelink', 'theheading').then(function(a, th) {
 *    ... 
 *    cf.result();
 *  })
 *  .then(function(repeat10) {
 *    cf.result(cf.get('a').length || cf.get('th').length ? '' : 'not found');
 *  })
 * 
 * * repeat/skip/nop and conditional flow (skip/repeat)
 * cf
 *  .find(...).click()
 *  .repeatTask()
 * 
 * cf
 *  .name('a').find(...).click()
 *  .name('b').find(...).click()
 *  .then(function(){
 *    if (cf.find(...).length) cf.skipTask().result();
 *  })
 *  .repeatStep('b')
 * 
 * cf
 *  .ifNot(cf('isLoggedIn'), cf
 *    .find(cf('loginLink')).click().waitFor(cf('findLoginDialog'))
 *    .find('#username').type('login')
 *    .find('#password').type('password')
 *    .find('#rememberMe').ifNot(cf.is(':checked'), cf.click())
 *    .find('#loginButton').click().waitFor(cf('isLoggedIn'))
 *  )
 *  .share('loginIfNecessary')
 * * 
 * * declarative waitfors
 * cf
 *  .waitFor(function(){ return cf.find().length; }, <then>, <timeout>, <checkPeriod>)
 * 
 * * declaring and referencing lib element finders (page objects) and other lib helpers
 * 
 * cf
 *  .find('#navBar ul li.welcome span:nth-child(1)')
 *  ...
 * => 
 * cf
 *  .lib('welcomeSpan', cf.find('#navBar ul li.welcome span:nth-child(1)'))
 *  .find('welcomeSpan')
 *  .lib('isAdmin', cf.find('welcomeSpan').is('.admin'))
 *  ...
 * 
 * 
 * cf
 *  .lib('welcomeSpan', function() { return cf.find(...); })
 *  .lib('welcomeSpan', cf.find(...))
 *  .lib('isLoggedIn', function() { 
 *    return lib('welcomeSpan').length;
 *  })
 *  .lib('isLoggedIn', function(opts) {
 *    if (opts.isAdmin) return lib('welcomeSpan').length && lib('welcomeSpan').is('.admin');
 *    return lib('welcomeSpan').length;
 *  })
 *  .find(...).click().waitFor(lib('isLoggedIn', {isAdmin: true}))
 * 
 * cf
 *  .lib('findCellInTheTable', function(opts) { ... })
 *  .find(lib('findCellInTheTable', {header: 'Name', value: cf.task('name')}))
 *  .find(function(){
 *    return lib('findCellInTheTable', {header: 'Name', value: task.name});
 *  })
 *  .find(function(){
 *    return lib('findCellInTheTable', {header: 'Name', value: cf.task('name')});
 *  })
 * 
 * 
 * * make sure, that...
 * cf
 *  .find(...)
 *  .click()
 *  .name('is logged in').assertTrue(lib('isLoggedIn'))
 *  .name('is logged in as Michael').assertEquals(lib('welcomeSpan').text().trim(), 'Hello Michael!')
 *  .assertTrue(function(){
 *    return lib('welcomeSpan').text().trim() === 'Hello Michael!';
 *  })
 *  .then(function(){ 
 *    cf.result(cf.compare(lib('welcomeSpan').text().trim(), 'Hello Michael!'));
 *  })
 *  .name('is logged in as username specified in task').assertEquals(lib('welcomeSpan').text().trim(), cf.task('name'))
 */
(function(document, window, undefined){
    'use strict';
    
    var me = this.cartFillerConfiguration;
    var i;
    var api = function(method, args) { 
        return me.modules.api[method].apply(me.modules.api, args);
    };
    // during build - things are more specific
    var Wrapper;
    var Runtime;
    var niceArgs = function(args) {
        return JSON.stringify(args).replace(/^\[/, '(').replace(/\]$/, ')');
    };
    var copyArguments = function(src) {
        var args = [];
        for (var argIndex = 0; argIndex < src.length; argIndex ++ ) {
            args.push(src[argIndex]);
        }
        return args;
    };
    var cutSince = function(arr, name) {
        for (var i = 0; i < arr.length; i ++) {
            if (arr[i][0] === 'name' && arr[i][1][0] === name) {
                return arr.slice(i);
            }
        }
        throw new Error('when trying to do .since("' + name + '") the preceding .name("' + name + '") was not found');
    };
    var flattenAndReplaceName = function(arr, name) {
        var flatten = me.modules.dispatcher.recursivelyCollectSteps(arr);
        if (name && (flatten instanceof Array) && (flatten.length > 0) && ('string' === typeof flatten[0])) {
            flatten[0] = name;
        }
        return flatten;
    };
    var findStepIndexByName = function(name, steps) {
        for (var i = steps.length - 2; i >= 0; i -= 2) {
            if (steps[i] === name) {
                return i / 2;
            }
        }
        throw new Error('step not found: [' + name + ']');
    };
    var actualWrapper = false;
    var onLoaded = function() {
        Runtime = function() {

        };
        Runtime.prototype = Object.create({});
        // during runtime most methods are just proxying to api
        ['find', 'result', 'say', 'onload', 'nop'].filter(function(method) {
            Runtime.prototype[method] = function() { return api(method, arguments); };
        });

        Wrapper = function(){
            this.mode = 0;
            this.tasks = {};
            this.shares = {};
            this.lib = {};
            this.unexportedTasks = {};
            var wrapper = this;
            actualWrapper = this;
            this.runtime = new Runtime();
            var LibReferencePromise = this.LibReferencePromise = function(name) {
                this.name = name;
            };
            var BuilderPromise = this.BuilderPromise = function(method, args, prev) {
                this.arr = ((prev.length === 1 && prev[0][0] === '') ? [] : prev.slice()).concat(method ? [[method, args]] : []);
                var taskNames = prev.filter(function(v) { return v[0] === 'task'; });
                if (taskNames.length) {
                    wrapper.unexportedTasks[taskNames[taskNames.length - 1][1][0]] = this.arr;
                }
            };
            var decodeLibReferences = function(arr) {
                if (arr[0][0] === 'get' && arr[0][1][0] instanceof LibReferencePromise) {
                    return wrapper.lib[arr[0][1][0].name].arr.concat(arr.slice(1));
                } else if (arr[0][0] === 'lib' || arr[0][0] === 'getlib') {
                    return wrapper.lib[arr[0][1][0]].arr.concat(arr.slice(1));
                }
                return arr;
            };
            var wrapSelectorBuilderPromise = this.wrapSelectorBuilderPromise = function(arr) {
                arr = decodeLibReferences(arr);
                if (arr.length === 1) {
                    if (arr[0][0] !== 'get') {
                        throw new Error('only get is allowed as first step of selector promise, we have [' + arr[0][0] + '] instead');
                    }
                    if (arr[0][1][0] instanceof BuilderPromise) {
                        return wrapSelectorBuilderPromise(arr[0][1][0].arr);
                    } else {
                        return me.modules.dispatcher.injectTaskParameters(function(){ return api('find', arr[0][1]); }, [arr[0][1]]);
                    }
                } else {
                    var prev = arr.slice();
                    var step = prev.pop();
                    var prevBuilderPromise = wrapSelectorBuilderPromise(prev);
                    return me.modules.dispatcher.injectTaskParameters(function(){
                        var prevResult = prevBuilderPromise();
                        return prevResult[step[0]].apply(prevResult, step[1]);
                    }, [prevBuilderPromise].concat(step[1]));
                }
            };
            BuilderPromise.prototype = Object.create({});
            BuilderPromise.prototype.export = function(name) {
                if (! name) {
                    if (this.arr[0][0] === 'task') {
                        name = this.arr[0][1][0];
                    }
                    if (! name) {
                        throw new Error('When using export without parameters, you should name task at the very beginning using cf.task(\'thename\')');
                    }
                }
                if (wrapper.tasks[name] || wrapper.shares[name]) {
                    throw new Error('task or share or generator [' + name + '] already exists, looks like you try to overwrite it by cf.export() another time');
                }
                wrapper.tasks[name] = this.$since ? cutSince(this.arr, this.$since[0]) : this.arr;
                return this;
            };
            BuilderPromise.prototype.lib = function(name, body) {
                if (wrapper.lib[name]) {
                    throw new Error('lib [' + name + '] is already defined, you are trying to redefined it');
                }
                if (('function' === typeof body) || (body instanceof BuilderPromise)) {
                    wrapper.lib[name] = body;
                }
                return new BuilderPromise('lib', [name], this.arr);
            };
            BuilderPromise.prototype.const = function(value) {
                return function() { return value; };
            };
            BuilderPromise.prototype.share = function(name) {
                if (wrapper.tasks[name] || wrapper.shares[name]) {
                    throw new Error('task or share or generator [' + name + '] already exists, looks like you try to overwrite it by cf.share() another time');
                }
                wrapper.shares[name] = this.$since ? cutSince(this.arr, this.$since[0]) : this.arr;
                return this;
            };
            BuilderPromise.prototype.generator = function(name, fn) {
                if (wrapper.tasks[name] || wrapper.shares[name]) {
                    throw new Error('task or share or generator [' + name + '] already exists, looks like you try to overwrite it by cf.generator() another time');
                }
                wrapper.shares[name] = fn;
                return this;
            };
            ['since'].filter(function(f) {
                BuilderPromise.prototype[f] = function() {
                    var p = new BuilderPromise(undefined, undefined, this.arr);
                    p['$' + f] = copyArguments(arguments);
                    return p;
                };
            });
            this.cf = new BuilderPromise('', [], []); // the root
            if (! this.cf) {
                console.log('no this.cf, checking BuilderPromise');
                console.log(BuilderPromise);
                console.log(typeof BuilderPromise);
                console.log(BuilderPromise.prototype);
                console.log(typeof BuilderPromise.prototype);
                throw new Error('unable to use declarative mode - probably browser incompatibility');
            }

            var makeBooleanBuilderPromise = function(condition) {
                if (condition instanceof Function) {
                    return condition;
                } else if ('string' === typeof condition) {
                    return function() {
                        return me.modules.dispatcher.interpolateText(condition).length;
                    };
                } else if (condition instanceof BuilderPromise) {
                    var arr = condition.arr.slice();
                    var check = arr.pop();
                    var promise;
                    switch (check[0]) {
                        case 'exists': 
                            promise = wrapSelectorBuilderPromise(arr);
                            return function() {
                                var e = promise();
                                if (e.length) {
                                    e.arrow(true);
                                }
                                return e.length;
                            };
                        case 'absent': 
                            promise = wrapSelectorBuilderPromise(arr);
                            return function() {
                                var e = promise();
                                if (e.length) {
                                    e.arrow(true);
                                }
                                return ! e.length;
                            };
                        case 'find':
                        case 'closest':
                        case 'first':
                        case 'get':
                            promise = wrapSelectorBuilderPromise(condition.arr);
                            return function() {
                                var e = promise();
                                if (e.length) {
                                    e.arrow();
                                }
                                return e.length;
                            };
                        default: 
                            throw new Error('unknown selector tail for boolean expression: [' + check[0] + ']');
                    }
                } else {
                    throw new Error('unknown condition for boolean evaluation: [' + JSON.stringify(condition) + ']');
                }
            };
            var Builder = this.Builder = function() {
                this.namedResults = {};
            };
            Builder.prototype = Object.create({});
            Builder.prototype.getlib = function(args) {
                var promise = wrapSelectorBuilderPromise(wrapper.lib[args[0]].arr);
                return ['get' + niceArgs(args), me.modules.dispatcher.injectTaskParameters(function() {
                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                        debugger; // jshint ignore:line
                    }
                    promise().arrow(1).result(); 
                }, [promise])];
            };
            Builder.prototype.clear = function(){
                return ['remove all arrows', function() {
                    api('arrow'); 
                    api('nop');
                }];
            };
            Builder.prototype.get = function(args) {
                if (args[0] instanceof BuilderPromise || args[0] instanceof LibReferencePromise) {
                    var promise;
                    if (args[0] instanceof BuilderPromise) {
                        if (args[0].arr[0][0] === 'lib') {
                            promise = wrapSelectorBuilderPromise(wrapper.lib[args[0].arr[0][1][0]].arr);
                        } else {
                            promise = wrapSelectorBuilderPromise(args[0].arr);
                        }
                    } else { //args[0] instanceof LibReferencePromise
                        promise = wrapSelectorBuilderPromise(wrapper.lib[args[0].name].arr);
                    }
                    return ['get' + niceArgs(args), me.modules.dispatcher.injectTaskParameters(function() {
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        promise().arrow(1).nop(); 
                    }, [promise])];
                } else {
                    return ['get' + niceArgs(args), function() { 
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        api('find', args).arrow(1).nop(); 
                    }];
                }
            };
            Builder.prototype.as = function(args, index) {
                this.namedResults[args[0]] = index;
                return [];                
            };
            var withFactory = function(name, argumentOffset) { 
                return ['with("' + name + '")', function() { arguments[argumentOffset].arrow().result(); }];
            };
            Builder.prototype.with = function(args, index) {
                var result = [];
                var extraOffset = 0;
                for (var i = args.length - 1; i >= 0 ; i -- ){
                    result.push.apply(result, withFactory(args[i], extraOffset + index - this.namedResults[args[i]]));
                    extraOffset ++;
                }
                return result;
            };
            var buildProxyFunction = function(name, rename, afterWait) {
                return function(args) {
                    if (name === 'exists') {
                        return [(rename || name) + niceArgs(args), function(p) {
                            api('waitFor', [function() {
                                if(me.modules.api.debug && me.modules.api.debug.stop) {
                                    debugger; // jshint ignore:line
                                }
                                p.reevaluate(); 
                                return p.length;
                            }, afterWait || function(r) {
                                p.arrow(1).result(r ? '' : 'element did not appear within timeout');
                            }, args[0] || undefined, undefined, [p]]);
                        }];
                    } else if (name === 'absent') {
                        return [(rename || name) + niceArgs(args), function(p) {
                            api('waitFor', [function() { 
                                if(me.modules.api.debug && me.modules.api.debug.stop) {
                                    debugger; // jshint ignore:line
                                }
                                p.reevaluate();
                                return ! p.length;
                            }, afterWait || function(r) {
                                p.arrow(1).result(r ? '' : 'element did not disappear within timeout');
                            }, args[0] || undefined, undefined, [p]]);
                        }];
                    } else if ((rename || name) === 'add') {
                        var selectorPromises = args.map(function(arg) {
                            if (arg instanceof BuilderPromise) {
                                return wrapSelectorBuilderPromise(arg.arr);
                            } else {
                                return function() {
                                    return arg;
                                };
                            }
                        });
                        return [(rename || name) + niceArgs(args), me.modules.dispatcher.injectTaskParameters(function(p) {
                            if(me.modules.api.debug && me.modules.api.debug.stop) {
                                debugger; // jshint ignore:line
                            }
                            var s = p;
                            for (var i = 0; i < selectorPromises.length; i ++) {
                                s = s.add(selectorPromises[i]());
                            }
                            s.arrow(1).nop();
                        }, args)];
                    } else {
                        return [(rename || name) + niceArgs(args), me.modules.dispatcher.injectTaskParameters(function(p) {
                            if(me.modules.api.debug && me.modules.api.debug.stop) {
                                debugger; // jshint ignore:line
                            }
                            var s = p[name].apply(p, args);
                            s.arrow(1).nop();
                        }, args)];
                    }
                };
            };
            for (i in me.modules.api.getSelectorClass().prototype) {
                if (i !== 'arrow' && i !== 'highlight' && i !== 'result' && i !== 'nop') {
                    Builder.prototype[i] = buildProxyFunction(i);
                }
            }
            ['say', 'repeatTask', 'repeatStep', 'skipTask', 'skipStep', 'repeatJob', 'skipJob', 'openUrl', 'sleep'].filter(function(fn) {
                wrapper.Builder.prototype[fn] = function(args, index) {
                    return [fn + niceArgs(args), function(p) {
                        var tweakedArgs;
                        if (fn === 'repeatStep' || fn === 'skipStep') {
                            var target = findStepIndexByName(args[0], me.modules.api.env.taskSteps);
                            tweakedArgs = [fn === 'repeatStep' ? (index - target + 1) : (target - index + 1)].concat(args.slice(1));
                        } else {
                            tweakedArgs = args.slice();
                        }
                        var submitResult = true;
                        if (fn === 'say') {
                            tweakedArgs[0] = me.modules.dispatcher.interpolateText(tweakedArgs[0]);
                            if (tweakedArgs[2]) {
                                submitResult = false;
                            }
                        }
                        var apiOrElement;
                        if (fn === 'say' && p instanceof me.modules.api.getSelectorClass()) {
                            apiOrElement = p[fn].apply(p, tweakedArgs);
                        } else {
                            apiOrElement = api(fn, tweakedArgs);
                        }
                        if (fn === 'say' && ! tweakedArgs[2]) {
                            api('sleep');
                            if (submitResult) {
                                api('waitFor', [function() {
                                    return me.modules.ui.isMessageStable();
                                }]);
                                return;
                            }
                        }
                        if (submitResult) {
                            apiOrElement.result();
                        }
                    }];
                };
            });
            Builder.prototype.pause = function(args) {
                var ms = args[0];
                return ['pause for [' + ms + '] ms', function(){
                    api('setTimeout', [function(){
                        api('result');
                    }, ms]);
                }];
            };
            Builder.prototype.nop = function() {
                return ['nop', function(){ api('nop'); }];
            };
            /**
             * wait for element, ms
             */
            Builder.prototype.click = function(args) {
                return buildProxyFunction('exists', 'click', function(r, p) {
                    if (r) {
                        api('clicker')[1](p.arrow(1));
                    } else {
                        p.result('element did not appear within timeout');
                    }
                })(args);
            };
            Builder.prototype.ready = function() {
                return ['wait for readyState become complete', function() {
                    api('waitFor', [function() {
                        return api('getDocument').readyState === 'complete';
                    }]);
                }];
            };
            /**
             * string text to type
             * boolean dont clear text before typing
             */
            Builder.prototype.type = function(args) {
                return buildProxyFunction('exists', 'type', function(r, p) {
                    if (r) {
                        api('typer', [
                            function() {
                                return me.modules.dispatcher.interpolateText(args[0]);
                            },
                            undefined,
                            args[1]
                        ])[1](p.arrow(1));
                    } else {
                        p.result('element did not appear within timeout');
                    }
                })([]);
            };
            Builder.prototype.enter = function() {
                return buildProxyFunction('exists', 'enter', function(r, p) {
                    if (r) {
                        api('typer', [
                            function() {
                                return '\r';
                            },
                            undefined,
                            true
                        ])[1](p.arrow(1));
                    } else {
                        p.result('element did not appear within timeout');
                    }
                })([]);
            };
            Builder.prototype.then = function(args) {
                return ['then(' +niceArgs(args) + ')', me.modules.dispatcher.injectTaskParameters(function() {
                    args[0].apply(this, arguments);
                }, args)];
            };
            Builder.prototype.onload = function(args) {
                return ['onload(' +niceArgs(args) + ')', me.modules.dispatcher.injectTaskParameters(function() {
                    api('onload', args);
                }, args)];
            };
            Builder.prototype.waitFor = function(args) {
                var name = 'waitFor(' + niceArgs(args) + ')';
                if (args[0] instanceof Function) {
                    return [name, function() { 
                        api('waitFor', args);
                    }];
                } else if (args[0] instanceof BuilderPromise) {
                    // ok, this is the case where we should get promise of selector
                    var promise = makeBooleanBuilderPromise(args[0]);
                    return ['waitFor' + niceArgs(args), function() {
                        api('waitFor', [promise].concat(args.slice(1)));
                    }];
                }
            };
            Builder.prototype.use = function(args) {
                if ('string' === typeof args[0]) {
                    var name = args[0];
                    var steps = wrapper.tasks[name] || wrapper.shares[name];
                    if (! steps) { 
                        throw new Error('share or task or generator [' + name + '] is not defined');
                    }
                    if (steps instanceof Function) {
                        // generator
                        steps = steps.apply(null, args.slice(1)).arr;
                    }
                    return this.build(steps);
                } else if (args[0] instanceof BuilderPromise) {
                    return this.build(args[0].arr);
                }
            };
            Builder.prototype.useIf = function(args) {
                return args[0] ? this.use(args.slice(1)) : [];
            };
            Builder.prototype.useIfNot = function(args) {
                return args[0] ? [] : this.use(args.slice(1));
            };
            Builder.prototype.name = function() { return []; };
            var generateIfOrIfNotSteps = function(args, builder, ifNot, isWhile) {
                var condition = args[0];
                var action = args[1];
                var actionSteps = builder.build(action.arr);
                var actionStepsLen = actionSteps.length / 2;
                if (isWhile) {
                    actionStepsLen ++;
                    actionSteps.push('repeat', function() {
                        api('repeatStep', [actionStepsLen + 1]);
                        api('result');
                    });
                }
                var booleanBuilderPromise = makeBooleanBuilderPromise(condition);
                return ['if' + (ifNot ? 'Not' : '') + niceArgs([condition]), function() {
                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                        debugger; // jshint ignore:line
                    }
                    var result = booleanBuilderPromise();
                    if ((! ifNot && ! result) || (ifNot && result)) {
                        api('skipStep', [actionStepsLen]);
                    }
                    api('result');
                }].concat(actionSteps);
            };
            Builder.prototype.if = function(args) { 
                return generateIfOrIfNotSteps(args, this);
            };
            Builder.prototype.ifNot = function(args) { 
                return generateIfOrIfNotSteps(args, this, true);
            };
            Builder.prototype.while = function(args) { 
                return generateIfOrIfNotSteps(args, this, false, true);
            };
            Builder.prototype.whileNot = function(args) { 
                return generateIfOrIfNotSteps(args, this, true, true);
            };
            Builder.prototype.task = function() {
                // just declare task name
                return [];
            };
            var promiseProxyFactory = function(name){
                return function() { 
                    if (wrapper.mode) {
                        return this.runtime[name].apply(this.runtime, arguments);
                    } else {
                        return new BuilderPromise(name, copyArguments(arguments), this.arr); 
                    }
                };
            };
            for (i in Builder.prototype) {
                if (Builder.prototype.hasOwnProperty(i)) {
                    BuilderPromise.prototype[i] = promiseProxyFactory(i);
                }
            }
            Builder.prototype.build = function(steps, prev) {
                var result = (prev || []).slice();
                var builder = this;
                var rememberedName;
                steps.filter(function(step) {
                    if (step[0] === 'lib') {
                        return;
                    }
                    if (! builder[step[0]]) {
                        throw new Error('step [' + step[0] + '] is not known to builder');
                    }
                    result.push.apply(result, flattenAndReplaceName(builder[step[0]](step[1], result.length / 2), rememberedName));
                    rememberedName = step[0] === 'name' ? (rememberedName ? rememberedName : step[1][0]) : undefined;
                });
                return result;
            };
        };
        Wrapper.prototype = Object.create({});
        Wrapper.prototype.switchMode = function() {
            this.mode = 1;
        };
        Wrapper.prototype.getCf = function() {
            return this.cf;
        };
        Wrapper.prototype.libFunction = function(){
            var name = arguments[0];
            var args = copyArguments(arguments).slice(1);
            if (this.mode === 0) {
                if (name instanceof this.BuilderPromise) {
                    var libElement = name.arr.filter(function(v) { return v[0] === 'lib'; });
                    if (libElement.length) {
                        name = libElement[0][1][0];
                    }
                }
                // tbd this is wrong, we should return promise that
                // will anyway be resolved later at runtime
                if ('function' === typeof this.lib[name]) {
                    throw new Error('this is not implemented');
                } else if (this.lib[name] instanceof this.BuilderPromise) {
                    return this.lib[name];
                } else {
                    return new this.LibReferencePromise(name);
                }
            } else {
                // proxy
                if ('function' === typeof this.lib[name]) {
                    return this.lib[name].apply(null, args);
                } else if (this.lib[name] instanceof this.BuilderPromise) {
                    return wrapSelectorBuilderPromise(this.lib[name].arr)();
                } else {
                    throw new Error('not sure how to handle lib item: ' + JSON.stringify(this.lib[name]));
                }
            }
        };
        Wrapper.prototype.getLib = function() {
            var wrapper = this;
            return function(){ 
                return wrapper.libFunction.apply(wrapper, arguments);
            };
        };
        Wrapper.prototype.buildTasks = function(existingTasks) {
            var i;
            for (i in this.unexportedTasks) {
                if (! this.tasks[i]) {
                    this.tasks[i] = this.unexportedTasks[i];
                }
            }
            var result = existingTasks || {};
            // build shared steps and generators
            for (i in this.tasks) {
                result[i] = this.buildTask(this.tasks[i]);
            }
            return result;
        };
        Wrapper.prototype.buildTask = function(steps) {
            var builder = new this.Builder();
            return builder.build(steps, []);
        };
    };

    me.scripts.push({
        getName: function(){ return 'cf'; },
        onLoaded: function() {
            onLoaded();
        },
        create: function() {
          return new Wrapper();
        },
        getlib: function(name) {
            return actualWrapper ? actualWrapper.wrapSelectorBuilderPromise(actualWrapper.lib[name].arr)() : me.modules.api.find();
        },
        getLibSelectors: function() {
            var result = {};
            if (actualWrapper) {
                for (var i in actualWrapper.lib) {
                    if (actualWrapper.lib[i] instanceof actualWrapper.BuilderPromise) {
                        var selector = actualWrapper.wrapSelectorBuilderPromise(actualWrapper.lib[i].arr)();
                        if (selector.length) {
                            result[i] = selector;
                        }
                    }
                }
            }
            return result;
        }
    });
}).call(this, document, window);
