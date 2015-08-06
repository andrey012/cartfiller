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
                banner: "<%= meta.banner %>",
                process: function(content, path){
                    return content
                        .replace(
                            /config.gruntBuildTimeStamp=\'\'\;/,
                            'config.gruntBuildTimeStamp=\'' + (new Date()).getTime() + '\';')
                        .replace(
                            /var isDist = false\;/,
                            'var isDist = true;');
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
                dest: "dist/worker-app-scripts.js"
            }
		},
        copy: {
            injectFrame: {
                src: "src/boot/i.htm",
                dest: "dist/i.htm"
            },
            workerFrame: {
                options: {
                    process: function(content, srcpath){
                        return content
                        .replace(
                            /bootstrap\.min\.css\"/, 
                            'bootstrap.min.css?__inline=true"')
                        .replace(
                            /\<script\s+data-main=\"scripts\/main\" src="\.\.\/lib\/requirejs\/require\.js\"\>/,
                            '<script src="worker-app-scripts.min.js?__inline=true">')
                        .replace(
                            /\<html\>/,
                            '<html manifest="self.appcache">');
                    }
                },
                files : [
                    {expand: true, cwd: "src/", src: ["index.uncompressed.html", "self.appcache"], dest: "dist/"},
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
			}
		},
        // Build one JS package from jQuery, requireJs, Angular
        requirejs : {
            cmn : {
                options : {
                    waitSeconds : 0,
                    baseUrl : '.',
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
        // Build one single-file application
        inline: {
            dist: {
                src: 'dist/index.uncompressed.html',
                dest: 'dist/index.html'
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

	grunt.registerTask("build", ["concat", "uglify", "shell", "copy", "requirejs", "inline"]);
	grunt.registerTask("default", ["jshint", "build"]);
	grunt.registerTask("travis", ["default"]);

};
