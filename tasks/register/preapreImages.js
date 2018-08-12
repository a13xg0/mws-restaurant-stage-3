module.exports = function(grunt) {
    grunt.registerTask('prepareImages', [
        'mkdir:dev',
        'copy:dev',
        'blurred_images:dev',
        'responsive_images:dev'
    ]);
};
