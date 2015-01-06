var express = require('express');
var router = express.Router();
var um_utils = require('../lib/um_utils');

var path = './public/json/';

var fs = require('fs');

function getEvents(){
	var list = fs.readdirSync(path);
	var events = [];
	var classList = [];
	list.forEach(function (v){
		console.log(v);
		var className = v.replace(/\.json$/, "");
		classList.push(className);
		var tmp = fs.readFileSync(path+"/"+v, 'utf8');

		// JSONコメントを削除
		tmp = tmp.replace(/\/\*[\s\S]*?\*\//g, '');

		var obj = JSON.parse(tmp);
		obj.forEach(function (ev){
			ev["className"] = className;
			events.push(ev);
		});
	});
	return { events: events, classList: classList};
}

router.get('/', function(req, res) {
  var map = um_utils.getNavbarInfo(req, res);

  // 認証されていない場合には、ログイン画面に遷移する。
  if(req.isAuthenticated()){
	  map.title = 'Calendar';
	  var eventObj = getEvents();
	  var evv = JSON.stringify(getEvents().events);

	  map.data = evv;
	  map.eventClassList = eventObj.classList;
	  return res.render('index', map);
  } else {
	  return res.redirect('/auth/login');
  }
});

module.exports = router;
