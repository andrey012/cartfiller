module.exports = function(grunt) {
    var processWorkerFrameHtml = function(content, uncompressed) {
        return content
            .replace(
                /bootstrap\.css\"/, 
                'bootstrap' + (uncompressed ? '' : '.min') + '.css?__inline=true"')
            .replace(
                /\<script\s+data-main=\"scripts\/main\" src="\.\.\/lib\/requirejs\/require\.js\"\>/,
                '<script src="worker-app-scripts' + (uncompressed ? '' : '.min') + '.js?__inline=true">')
            .replace(
                /\<html\>/,
                '<html manifest="self.appcache">')
    };
    var processLocal = function(content, uncompressed) {
        var chunk = function(content, uncompressed) {
            var result = [];
            var block;
            for (var i = 0; i < content.length; i += block) {
                block = 90;
                while (content.substr(i, block).indexOf('</script') !== -1) block --;
                result.push(JSON.stringify(new Buffer(content.substr(i, block)).toString('base64')));
            }
            return '[' + result.join(uncompressed ? ',\n' : ',') + '].map(atob).join(\'\')';
        };
        return content
            .replace(
                /\<script\s+src="\.\.\/\.\.\/lib\/requirejs\/require\.js\"\>/,
                '<script src="scripts-for-local' + (uncompressed ? '' : '.min') + '.js?__inline=true">')
            .replace(
                "var injectjs = ''", 
                function() {
                    return "var injectjs = " + 
                        chunk(
                            grunt.file.read('dist/inject' + (uncompressed ? '' : '.min') + '.js')
                                .replace(
                                    /\.localIndexHtml\s*=\s*(''|"")/, 
                                    function() { 
                                        return '.localIndexHtml=' + chunk(
                                            grunt.file.read('dist/index' + (uncompressed ? '.uncompressed' : '') + '.html'),
                                            uncompressed
                                        );
                                    }
                                ),
                            true
                        );
                }
        );
    };
	grunt.initConfig({

		// Import package manifest
		pkg: grunt.file.readJSON("package.json"),

		// Banner definitions
		meta: {
			banner: "/*\n" +
				" *  <%= pkg.title || pkg.name %> - v<%= pkg.version %>\n" +
				" *  <%= pkg.description %>\n" +
				" *  <%= pkg.homepage %>\n" +
				" *\n" +
				" *  Made by <%= pkg.author.name %>\n" +
				" *  Under <%= pkg.license %> License\n" +
				" */\n"
		},

		// Concat definitions
		concat: {
            options: {
                banner: "<%= meta.banner %>",
                process: function(content, path){
                    var time = global.gruntBuildTimeStamp ? global.gruntBuildTimeStamp : (global.gruntBuildTimeStamp = (new Date()).getTime());
                    return content
                        .replace(
                            /config.gruntBuildTimeStamp=\'\'\;/g,
                            'config.gruntBuildTimeStamp=\'' + time + '\';')
                        .replace(
                            /var isDist = false\;/g,
                            'var isDist = true;')
                        .replace(
                            /\?0000000000/g,
                            '?' + time);
                }
            },
            inject: {
                src: [
                    "src/boot/misc/concat-header.js", 
                    "src/boot/inject.js", 
                    "src/boot/helpers/*.js",
                    "src/boot/misc/concat-footer.js"
                ],
                dest: "dist/inject.js"
            },
            jQueryPlugin: {
                src: ["src/jquery-cartFiller.js"],
                dest: "dist/jquery-cartFiller.js"
            },
            workerAngularApp: {
                src: [
                    "src/scripts/*.js",
                    "src/jquery-cartFiller-require-prepend.js",
                    "src/jquery-cartFiller.js",
                    "src/jquery-cartFiller-require-append.js"
                ],
                dest: "build/worker-app-scripts-without-libs.js"
            },
            scriptsForLocal: {
                src: [
                    "src/jquery-cartFiller-require-prepend.js",
                    "src/jquery-cartFiller.js",
                    "src/jquery-cartFiller-require-append.js"
                ],
                dest: "build/scripts-for-local-without-libs.js"
            },
            appCache: {
                options: {
                    banner: ''
                },
                src: ["src/self.appcache"],
                dest: "dist/self.appcache"
            }
		},
        copy: {
            injectFrame: {
                src: "src/boot/i.htm",
                dest: "dist/i.htm"
            },
            local: {
                options: {
                    process: function(content, srcpath) {
                        return processLocal(content);
                    }
                },
                src: "src/local/local.html",
                dest: "build/local.html"
            },
            localUncompressed: {
                options: {
                    process: function(content, srcpath) {
                        return processLocal(content, true);
                    }
                },
                src: "src/local/local.html",
                dest: "build/local.uncompressed.html"
            },
            workerFrame: {
                options: {
                    process: function(content, srcpath){
                        return processWorkerFrameHtml(content);
                    }
                },
                files : [
                    {expand: true, cwd: "src/", src: ["index.uncompressed.html"], dest: "build/", rename: function() { return "build/index.html"; }},
                ]
            },
            workerFrameUncompressed: {
                options: {
                    process: function(content, srcpath){
                        return processWorkerFrameHtml(content, true);
                    }
                },
                files : [
                    {expand: true, cwd: "src/", src: ["index.uncompressed.html"], dest: "build/"},
                ]
            },
            workerFrameWithGA: {
                options: {
                    process: function(content, srcpath){
                        var gaSnippetFile = 'ga-snippet.html';
                        var gaSnippet = grunt.file.exists(gaSnippetFile) ? grunt.file.read(gaSnippetFile) : '';
                        return processWorkerFrameHtml(content)
                            .replace(
                                /\<\/head\>/,
                                gaSnippet + '</head>');
                    }
                },
                files : [
                    {expand: true, cwd: "src/", src: ["index.uncompressed.html"], dest: "dist/", rename: function() { return "build/index.ga.html"; }},
                ]
            },
            workerFrameWithGAUncompressed: {
                options: {
                    process: function(content, srcpath){
                        var gaSnippetFile = 'ga-snippet.html';
                        var gaSnippet = grunt.file.exists(gaSnippetFile) ? grunt.file.read(gaSnippetFile) : '';
                        return processWorkerFrameHtml(content, true)
                            .replace(
                                /\<\/head\>/,
                                gaSnippet + '</head>');
                    }
                },
                files : [
                    {expand: true, cwd: "src/", src: ["index.uncompressed.html"], dest: "dist/", rename: function() { return "build/index.ga.uncompressed.html"; }},
                ]
            }

        },
		// Lint definitions
		jshint: {
			files: ["src/**/*.js"],
			options: {
				jshintrc: ".jshintrc"
			}
		},

		// Minify definitions
		uglify: {
			options: {
				banner: "<%= meta.banner %>",
                compress: {
                    drop_debugger: false
                }
			},
			inject: {
				src: ["dist/inject.js"],
				dest: "dist/inject.min.js"
			},
			jQueryPlugin: {
				src: ["dist/jquery-cartFiller.js"],
				dest: "dist/jquery-cartFiller.min.js"
			}
		},
        // Build one JS package from jQuery, requireJs, Angular
        requirejs : {
            cmn : {
                options : {
                    waitSeconds : 0,
                    baseUrl : '.',
                    out : 'build/worker-app-scripts.min.js',
                    optimize : 'uglify2',
                    generateSourceMaps : false,
                    preserveLicenseComments : false,
                    inlineText : true,
                    findNestedDependencies : true,
                    paths : {
                      requireLib : 'lib/requirejs/require',
                      angular: 'lib/angular/angular',
                      'angular-route': 'lib/angular-route/angular-route',
                      jquery: 'lib/jquery/dist/jquery',
                      app: 'build/worker-app-scripts-without-libs'
                    },
                    include : [
                      'requireLib',
                      'app',
                      'angular',
                      'angular-route',
                      'jquery'
                    ],
                    exclude : [
                    ],
                    onBuildRead: function(moduleName, path, contents) {
                        return contents.replace(/<\/script>/g, '');
                    }
                }
            },
            uncompressed : {
                options : {
                    waitSeconds : 0,
                    baseUrl : '.',
                    out : 'build/worker-app-scripts.js',
                    optimize : 'none',
                    generateSourceMaps : false,
                    preserveLicenseComments : false,
                    inlineText : true,
                    findNestedDependencies : true,
                    paths : {
                      requireLib : 'lib/requirejs/require',
                      angular: 'lib/angular/angular',
                      'angular-route': 'lib/angular-route/angular-route',
                      jquery: 'lib/jquery/dist/jquery',
                      app: 'build/worker-app-scripts-without-libs'
                    },
                    include : [
                      'requireLib',
                      'app',
                      'angular',
                      'angular-route',
                      'jquery'
                    ],
                    exclude : [
                    ],
                    onBuildRead: function(moduleName, path, contents) {
                        return contents.replace(/<\/script>/g, '');
                    }
                }
            },
            local : {
                options : {
                    waitSeconds : 0,
                    baseUrl : '.',
                    out : 'build/scripts-for-local.min.js',
                    optimize : 'uglify2',
                    generateSourceMaps : false,
                    preserveLicenseComments : false,
                    inlineText : true,
                    findNestedDependencies : true,
                    paths : {
                        requireLib : 'lib/requirejs/require',
                        jquery: 'lib/jquery/dist/jquery',
                        app: 'build/scripts-for-local-without-libs'
                    },
                    include : [
                        'requireLib',
                        'jquery',
                        'app'
                    ],
                    exclude : [
                    ],
                    onBuildRead: function(moduleName, path, contents) {
                        return contents.replace(/<\/script>/g, '');
                    }
                }
            },
            localUncompressed : {
                options : {
                    waitSeconds : 0,
                    baseUrl : '.',
                    out : 'build/scripts-for-local.js',
                    optimize : 'none',
                    generateSourceMaps : false,
                    preserveLicenseComments : false,
                    inlineText : true,
                    findNestedDependencies : true,
                    paths : {
                        requireLib : 'lib/requirejs/require',
                        jquery: 'lib/jquery/dist/jquery',
                        app: 'build/scripts-for-local-without-libs'
                    },
                    include : [
                        'requireLib',
                        'jquery',
                        'app',
                    ],
                    exclude : [
                    ],
                    onBuildRead: function(moduleName, path, contents) {
                        return contents.replace(/<\/script>/g, '');
                    }
                }
            },
        },
        // Build one single-file application
        inline: {
            distUncompressed: {
                src: 'build/index.uncompressed.html',
                dest: 'dist/index.uncompressed.html'
            },
            dist: {
                src: 'build/index.html',
                dest: 'dist/index.html'
            },
            distWithGAUncompressed: {
                src: 'build/index.ga.uncompressed.html',
                dest: 'dist/index.ga.uncompressed.html',
            },
            distWithGA: {
                src: 'build/index.ga.html',
                dest: 'dist/index.ga.html'
            },
            local: {
                src: 'build/local.html',
                dest: 'dist/local.html'
            },
            localUncompressed: {
                src: 'build/local.uncompressed.html',
                dest: 'dist/local.uncompressed.html'
            }
        },
        // Generate JSDoc documentation
        shell: {
            build_docs: {
                command: "./node_modules/jsdoc/jsdoc.js src/* samples/worker.js -c .jsdoc.json -r -p -R src/README.md -d docs"
            }
        },

		// watch for changes to source
		// Better than calling grunt a million times
		// (call 'grunt watch')
		watch: {
		    files: ['src/*'],
		    tasks: ['default']
		}

	});

	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks("grunt-contrib-coffee");
	grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-inline');

	grunt.registerTask("build", ["concat", "uglify", "shell", "copy:injectFrame", "copy:workerFrame", "copy:workerFrameUncompressed", "copy:workerFrameWithGA", "copy:workerFrameWithGAUncompressed", "requirejs", "inline:distUncompressed", "inline:dist", "inline:distWithGAUncompressed", "inline:distWithGA", "copy:local", "copy:localUncompressed", "inline:local", "inline:localUncompressed"]);
	grunt.registerTask("default", ["jshint", "build"]);
	grunt.registerTask("travis", ["default"]);

};
