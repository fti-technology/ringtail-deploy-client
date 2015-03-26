module.exports = function(grunt) {
  
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    jshint: {
      options: {
        'jshintrc': true
      },
      grunt: {
        src: [ 'Gruntfile.js' ]
      },
      lib: {
        src: [ 'lib/**/*.js' ]
      },
      test: {
        src: [ 'test/**/*.js' ]
      }
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: [ 'test/**/*.js' ]
      }
    }
  });

  grunt.registerTask('test', [ 'mochaTest' ]);
  grunt.registerTask('validate', [ 'jshint', 'test' ]);

};