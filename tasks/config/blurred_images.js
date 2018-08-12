module.exports = function(grunt) {
    grunt.config.set('blurred_images', {
        dev: {
            options: {
                levels: [{
                    name: 'low',
                    level: 10,
                    quality: 40
                }]
            },
            files: [{
                expand: true,
                src: ['*.{jpg,gif,png}'],
                cwd: 'public/img_src/',
                dest: 'public/img/'
            }]
        }
    });

    grunt.loadNpmTasks('grunt-blurred-images');

};
