module.exports = function(grunt) {
    grunt.config.set('clean', {
        dev: {
            src: ['public/img'],
        },
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
};
