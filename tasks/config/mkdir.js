module.exports = function(grunt) {
    grunt.config.set('mkdir', {
        dev: {
            options: {
                create: ['public/img']
            },
        },
    });

    grunt.loadNpmTasks('grunt-mkdir');
};
