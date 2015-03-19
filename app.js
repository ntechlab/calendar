var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');

// ロガーとしてmorganではなく、log4jsを利用する。
//var logger = require('morgan');
var log4js = require('log4js');
var logger = require('./Log.js').getLogger('app');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var flash = require("connect-flash");
var passport = require('passport');
var session = require('express-session');

var messages = require('./lib/um_messages');
var auth = require('./routes/um_auth');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
// Exressのデフォルトログとしてlog4jsを利用。ログレベルはDEBUGとしているが、log4js設定ファイルで、
// appのログレベルをINFOにしているため、ログは表示されない。必要に応じて適宜変更する。
app.use(log4js.connectLogger(logger, { level: log4js.levels.DEBUG }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({secret: 'secret'}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(messages);

app.use('/', routes);
app.use('/users', users);
app.use('/auth', auth);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
