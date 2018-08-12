module.exports = function(grunt) {
    grunt.config.set('copy', {
        dev: {
            files: [{
                expand: true,
                src: '**',
                cwd: 'public/img_src/fixed/',
                dest: 'public/img/'
            }]
        }
    });

    grunt.loadNpmTasks('grunt-contrib-copy');

};
