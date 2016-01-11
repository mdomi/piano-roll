module.exports = function (grunt) {
    grunt.initConfig({
        pkg : grunt.file.readJSON('package.json'),
        uglify : {
            main : {
                files : {
                    'piano-roll.min.js': 'piano-roll.js'
                }
            },
            options : {
                mangle : true,
                report : 'min',
                preserveComments: 'some'
            }
        },
        jshint : {
            all : [
                'Gruntfile.js',
                'piano-roll.js',
                'demo/demo.js'
            ],
            options : {
                jshintrc : true
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('default', ['lint']);

    grunt.registerTask('lint', ['jshint']);

    grunt.registerTask('release', ['default', 'uglify:main']);

};
