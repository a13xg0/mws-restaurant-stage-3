module.exports = function(grunt) {
    grunt.config.set('clean', {
        dev: {
            src: ['public/img', 'public/js/*.min.js', 'public/css/*.min.css'],
        },
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
};
