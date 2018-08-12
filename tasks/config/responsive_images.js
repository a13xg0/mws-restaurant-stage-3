module.exports = function(grunt) {
    grunt.config.set('responsive_images', {
        dev: {
            options: {
                engine: 'im',
                sizes: [{
                    width: 800,
                    suffix: '_1x',
                    quality: 80

                },
                    {
                        width: 1600,
                        suffix: '_2x',
                        quality: 80

                    },
                    {
                        width: 400,
                        suffix: '_1x',
                        quality: 80

                    },
                    {
                        width: 800,
                        suffix: '_2x',
                        quality: 80

                    }]
            },

            /*
            You don't need to change this part if you don't change
            the directory structure.
            */
            files: [{
                expand: true,
                src: ['*.{gif,jpg,png}'],
                cwd: 'public/img_src/',
                dest: 'public/img/'
            }]
        }
    });

    grunt.loadNpmTasks('grunt-responsive-images');
};
