/**
 * see playground/todoMvcWorker.js
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
    var addMakePauseBeforeStepToFirstStep = function(steps) {
        if ('function' === typeof steps[1]) {
            steps[1].cartFillerMakePauseBeforeStep = true;
        }
        return steps;
    };
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

            var Builder = this.Builder = function() {
                this.namedResults = {};
            };
            Builder.prototype = Object.create({});
            Builder.prototype.getlib = function(args) {
                if (! wrapper.lib[args[0]]) {
                    throw new Error('lib entry \'' + args[0] + '\' is not defined');
                }
                var steps = this.build(wrapper.lib[args[0]].arr).map(function(v, index) {
                    if (index % 2 === 0) {
                        return 'getlib(\'' + args[0] + '\')->' + v;
                    } else {
                        return v;
                    }
                });
                return steps;
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
            var wrapIntoImplicitSelectorWaitForWrapperIf = function(condition, fn, msg, afterWait, timeout) {
                return condition ? 
                    implicitSelectorWaitForWrapper(fn, msg, afterWait, timeout) : 
                    function(p) {
                        p.reevaluate();
                        api('result', [fn(p) ? '' : msg]);
                    };
            };
            var implicitSelectorWaitForWrapper = function(fn, msg, afterWait, timeout) {
                return me.modules.dispatcher.injectTaskParameters(function(p) {
                    api('waitFor', [function() {
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        p.reevaluate();
                        return fn(p);
                    }, afterWait || function(r) {
                        p.arrow(1).result(r ? '' : msg);
                    }, timeout || undefined, undefined, [p]]);
                }, [fn, msg, afterWait]);
            };
            var buildProxyFunction = function(name, rename, afterWait) {
                return function(args, coords, flavor) {
                    if (name === 'exists' || name === 'absent') {
                        return [
                            (rename || name) + niceArgs(args),
                            wrapIntoImplicitSelectorWaitForWrapperIf(
                                flavor !== 'condition',
                                function(p) {
                                    if (name === 'exists') {
                                        return p.length;
                                    } else {
                                        return ! p.length;
                                    }
                                },
                                name === 'exists' ? 'element did not appear within timeout' : 'element did not disappear within timeout',
                                afterWait,
                                args[0]
                            )
                        ];
                    } else if (name === 'add') {
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
                    } else if (name === 'is' || name === 'isNot') {
                        return [
                            (rename || name) + niceArgs(args),
                            wrapIntoImplicitSelectorWaitForWrapperIf(
                                flavor !== 'condition',
                                function(p) {
                                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                                        debugger; // jshint ignore:line
                                    }
                                    if (name === 'is') {
                                        return p.arrow(1).is(args[0]);
                                    } else {
                                        return ! p.arrow(1).is(args[0]);
                                    }
                                },
                                name === 'is' ? ('element.is(\'' + args[0] + '\') is not true') : ('element.is(\'' + args[0] + '\') is true but should not be'),
                                afterWait,
                                args[1]
                            )
                        ];
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
                return addMakePauseBeforeStepToFirstStep(
                    buildProxyFunction('exists', 'click', function(r, p) {
                        if (r) {
                            api('clicker')[1](p.arrow(1));
                        } else {
                            p.result('element did not appear within timeout');
                        }
                    })(args)
                );
            };
            Builder.prototype.isNot = function(args) {
                return buildProxyFunction('isNot')(args);
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
                return addMakePauseBeforeStepToFirstStep(
                    buildProxyFunction('exists', 'type', function(r, p) {
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
                    })([])
                );
            };
            Builder.prototype.paste = function(args) {
                return addMakePauseBeforeStepToFirstStep(
                    buildProxyFunction('exists', 'type', function(r, p) {
                        if (r) {
                            api('paster', [
                                function() {
                                    return me.modules.dispatcher.interpolateText(args[0]);
                                },
                                undefined,
                                args[1]
                            ])[1](p.arrow(1));
                        } else {
                            p.result('element did not appear within timeout');
                        }
                    })([])
                );
            };
            Builder.prototype.enter = function() {
                return addMakePauseBeforeStepToFirstStep(
                    buildProxyFunction('exists', 'enter', function(r, p) {
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
                    })([])
                );
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
                var conditionSteps = builder.build(condition.arr, [], 'condition');
                var conditionStepsLen = conditionSteps.length / 2;
                var actionSteps = builder.build(action.arr);
                var actionStepsLen = actionSteps.length / 2 + (isWhile ? 1 : 0);
                if (isWhile) {
                    actionStepsLen ++;
                    actionSteps.push('repeat', function() {
                        if(me.modules.api.debug && me.modules.api.debug.stop) {
                            debugger; // jshint ignore:line
                        }
                        api('repeatStep', [actionStepsLen + conditionStepsLen]);
                        api('nop');
                    });
                }
                conditionSteps[conditionSteps.length - 1].cartFillerCaptureResult = true;
                conditionSteps.push((isWhile ? 'while' : 'if') + (ifNot ? 'Not' : '') + ' - check condition evaluation result', function(result) {
                    if(me.modules.api.debug && me.modules.api.debug.stop) {
                        debugger; // jshint ignore:line
                    }
                    if (result[2]) {
                        api('arrow', [result[1], 1]);
                    } else {
                        api('return', [result[1]]);
                    }
                    // result is notnull if evaluation failed
                    if ((! ifNot && result[0]) || // if used with if/whilie, then we skip if evaluation failed
                        (ifNot && ! result[0])) // if used with ifNot/whileNot, then we skip if evaluation succeeded
                    {
                        api('skipStep', [actionStepsLen]);
                    }
                    api('nop');
                });
                return conditionSteps.concat(actionSteps);
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
            Builder.prototype.build = function(steps, prev, flavor) {
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
                    result.push.apply(result, flattenAndReplaceName(builder[step[0]](step[1], result.length / 2, flavor), rememberedName));
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
