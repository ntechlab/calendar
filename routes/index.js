var express = require('express');
var router = express.Router();

/* GET home page. */
var fs = require('fs');
var events = fs.readFileSync('./public/json/events.json', 'utf8');
console.log(events);
router.get('/', function(req, res) {
  res.render('index', { 
	title: '可憐だ',
	data:events
	});
});

module.exports = router;
