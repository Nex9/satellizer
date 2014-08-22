'use strict';

var gulp = require('gulp');
var rename = require('gulp-rename');
var ngAnnotate = require('gulp-ng-annotate');
var plumber = require('gulp-plumber');
var uglify = require('gulp-uglify');
var complexity = require('gulp-complexity');
var ngClassify = require('gulp-ng-classify');
var coffee     = require('gulp-coffee');
var coffeelint = require('gulp-coffeelint');
var gutil      = require('gutil');
var Notification = require('node-notifier');
var notifier     = new Notification();

function reportError (err) {
  // gutil.beep();
  notifier.notify({
    title: 'Error running Gulp',
    message: err.message
  });
  gutil.log(err.message);
  this.emit('end');
}

gulp.task('minify', function() {
  return gulp.src('satellizer.js')
    .pipe(plumber())
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(rename('satellizer.min.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('copy', function() {
  return gulp.src('satellizer.js')
    .pipe(gulp.dest('examples/client/vendor'));
});

gulp.task('complexity', function() {
  return gulp.src('satellizer.js')
    .pipe(complexity());
});

gulp.task('watch', function() {
  gulp.watch('satellizer.coffee', ['copy', 'coffee', 'minify']);
});

gulp.task('coffee', function() {
  return gulp.src('satellizer.coffee')
    .pipe(plumber(
      {errorHandler: reportError}
    ))
      .pipe(ngClassify({
        animation: {
          format: 'camelCase',
          prefix: ''
        },
        constant: {
          format: 'camelCase',
          prefix: ''
        },
        controller: {
          format: 'camelCase',
          prefix: ''
        },
        factory: {
          format: 'camelCase'
        },
        filter: {
          format: 'camelCase'
        },
        provider: {
          format: 'camelCase',
          suffix: ''
        },
        service: {
          format: 'camelCase',
          suffix: ''
        },
        value: {
          format: 'camelCase'
        }
      }))
      .pipe(coffee()).on('error', reportError)
      .pipe(coffeelint())
      .pipe(gulp.dest('.'));
});

gulp.task('default', ['copy', 'coffee', 'minify', 'watch']);
