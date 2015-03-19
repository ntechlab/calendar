var express = require('express');
var router = express.Router();
var logger = require('../Log.js').getLogger('users');

/* GET users listing. */
router.get('/', function(req, res) {
  res.send('respond with a resource');
});

module.exports = router;
