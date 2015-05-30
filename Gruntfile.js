module.exports = function(grunt) {
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
                banner: "<%= meta.banner %>"
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
                src: ["src/scripts/*.js"],
                dest: "dist/worker-app-scripts.js"
            }
		},
        copy: {
            injectFrame: {
                src: "src/boot/i.htm",
                dest: "dist/i.htm"
            },
            workerFrame: {
                files : [
                    {expand: true, cwd: "src/", src: ["index.html"], dest: "dist/"},
                    {expand: true, cwd: "src/", src: ["scripts/**"], dest: "dist/"}
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
				banner: "<%= meta.banner %>"
			},
			inject: {
				src: ["dist/inject.js"],
				dest: "dist/inject.min.js"
			},
			jQueryPlugin: {
				src: ["dist/jquery-cartFiller.js"],
				dest: "dist/jquery-cartFiller.min.js"
			},
            workerAngularApp: {
                src: ["dist/worker-app-scripts.js"],
                dest: "dist/worker-app-scripts.min.js"
            }
		},
        requirejs : {
            cmn : {
                options : {
                    waitSeconds : 0,
                    baseUrl : '.',
//                      name : 'test',
                    out : 'dist/worker-app-scripts.min.js',
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
                      app: 'dist/worker-app-scripts'
                    },
                    include : [
                      'requireLib',
                      'app',
                      'angular',
                      'angular-route',
                      'jquery'
                    ],
                    exclude : [
                    ]
                }
            }
        },
        // Generate JSDoc documentation
        shell: {
            build_docs: {
                command: "./lib/jsdoc/jsdoc src/* samples/worker.js -c .jsdoc.json -r -p -R src/README.md -d docs"
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

	grunt.registerTask("build", ["concat", "uglify", "shell", "copy"]);
	grunt.registerTask("default", ["jshint", "build"]);
	grunt.registerTask("travis", ["default"]);

};
