var express = require('express');
var router = express.Router();
var um_utils = require('../lib/um_utils');

/* GET home page. */
var fs = require('fs');
var events = fs.readFileSync('./public/json/events.json', 'utf8');
console.log(events);
router.get('/', function(req, res) {
  var map = um_utils.getNavbarInfo(req, res);
  map.title = 'Calendar';
  map.data = events;
  res.render('index', map);
});

module.exports = router;
