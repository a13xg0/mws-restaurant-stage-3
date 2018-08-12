module.exports = function(grunt) {
    grunt.registerTask('prepareImages', [
        'clean:dev',
        'mkdir:dev',
        'copy:dev',
        'blurred_images:dev',
        'responsive_images:dev'
    ]);
};
