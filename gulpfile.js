var gulp = require('gulp');
var webp = require('gulp-webp');
var browserify = require('browserify');
var babelify = require('babelify');
var sourcemaps = require('gulp-sourcemaps');
var cleanCSS = require('gulp-clean-css');
var autoprefixer = require('gulp-autoprefixer');
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

var gulpSequence = require('gulp-sequence');
var htmlmin = require('gulp-htmlmin');
var clean = require('gulp-clean');
var minifyInline = require('gulp-minify-inline');

var gzip = require('gulp-gzip');
var gzipStatic = require('connect-gzip-static');

var connect = require('gulp-connect');

var jsSrcMainList = ['js/dbhelper.js', 'js/main.js'];
var jsSrcRestaurantList = ['js/dbhelper.js', 'js/restaurant_info.js'];

// ===================== Default Task =====================
gulp.task('default', ['prod:serve']);

// ===================== Build & Serve Production Build =====================
gulp.task('prod:serve', gulpSequence('build', 'serve'));

// ===================== Production Build =====================
gulp.task('build', gulpSequence('clean', 'scripts:prod', 'html:prod', 'styles:prod', 'copy:prod', 'webp:prod', 'gzip:prod'));

// Copy app contents to dist directory
gulp.task('copy:prod', function () {
    return gulp.src(['!node_modules/**', '**/*.{png,jpg}', 'service-worker.js', 'manifest.json', '!gulpfile.js'])
        .pipe(gulp.dest('./dist'));
});

// ===================== Clean Build =====================
gulp.task('clean', function () {
    return gulp.src('./dist', {
            read: false
        })
        .pipe(clean());
});

// ===================== Minify HTML =====================
gulp.task('html:prod', function () {
    return gulp.src(['!node_modules/**', '**/*.html'])
        .pipe(htmlmin({
            collapseWhitespace: true,
            removeComments: true
        }))
        .pipe(minifyInline())
        .pipe(gulp.dest('./dist'));
});

// ===================== WebP Image Conversion =====================
gulp.task('webp:prod', function () {
    gulp.src('img/*.jpg')
        .pipe(webp({
            method: 6
        }))
        .pipe(gulp.dest('./dist/img/webp'));
});

// ===================== Styles =====================
gulp.task('styles:prod', function () {
    gulp.src('css/styles.css')
        .pipe(cleanCSS({
            compatibility: 'ie8'
        }))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(rename('styles.min.css'))
        .pipe(gulp.dest('./dist/css'));
});

// ===================== Scripts =====================
gulp.task('scripts:prod', gulpSequence('script:index', 'script:restaurant'));

gulp.task('script:index', function () {
    jsSrcMainList.map(function (jsFile) {
        return browserify({
                entries: [jsFile]
            })
            .transform(babelify.configure({
                presets: ['env']
            }))
            .bundle()
            .pipe(source('index.min.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init({
                loadMaps: true
            }))
            .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./dist/js'));
    });
});

gulp.task('script:restaurant', function () {
    jsSrcRestaurantList.map(function (jsFile) {
        return browserify({
                entries: [jsFile]
            })
            .transform(babelify.configure({
                presets: ['env']
            }))
            .bundle()
            .pipe(source('restaurant.min.js'))
            .pipe(buffer())
            .pipe(sourcemaps.init())
            .pipe(uglify())
            .pipe(sourcemaps.write('./'))
            .pipe(gulp.dest('./dist/js'));
    });
});

// ===================== Gzip Build =====================
gulp.task('gzip:prod', gulpSequence('gzip-html', 'gzip-css', 'gzip-js'));

gulp.task('gzip-html', function () {
    gulp.src('./dist/**/*.html')
        .pipe(gzip())
        .pipe(gulp.dest('./dist'));
});

gulp.task('gzip-css', function () {
    gulp.src('./dist/css/**/*.min.css')
        .pipe(gzip())
        .pipe(gulp.dest('./dist/css'));
});

gulp.task('gzip-js', function () {
    gulp.src('./dist/js/**/*.js')
        .pipe(gzip())
        .pipe(gulp.dest('./dist/js'));
});

// ===================== Serve Build =====================
gulp.task('serve', function () {
    connect.server({
        root: "dist/index.html",
        port: 9000,
        middleware: function () {
            return [
                gzipStatic(__dirname, {
                    maxAge: 31536000000
                })
            ]
        }
    });
});