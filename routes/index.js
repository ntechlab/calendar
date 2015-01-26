var express = require('express');
var router = express.Router();
var um_utils = require('../lib/um_utils');
var u = require('underscore');
var fs = require('fs');

var path = './public/json/';

function getEvents(){
	var list = fs.readdirSync(path);
	var events = [];
	var eventGroupList = [];
	var eventObject = [];
	var holidays= convertFileToEventObject(path + "/static/holiday.json", 'utf8');
	u.each(holidays, function (ev){
		ev.className = "holiday";
		ev.editable = false;
		events.push(ev);
	});
	list.forEach(function (v){
		console.log(v);
		if(v.match("\.json$")){
			eventObject = processJSON(path+"/"+v);
			events = events.concat(eventObject.events);
			eventGroupList = eventGroupList.concat(eventObject.eventGroupList);
		} else if (v.match("\.csv$")){
			eventObject = processCSV(path+"/"+v);
		}
	});
	console.dir(events);
	return { events: events, eventGroupList: eventGroupList};
}

function processJSON(filePath) {
	var events = [];
	var eventGroupList = [];
	var obj = convertFileToEventObject(filePath, 'utf8');
	var fileInfo = obj.fileInfo;
	var globalProperty = fileInfo.globalProperty;
	u.each(obj.event, function (ev){
		// 各イベントにグローバルプロパティを設定
		u.each(globalProperty, function (value, key){
			if(value){
				ev[key] = value;
			}
		});
		events.push(ev);
		
		// 新規グループをグループIDリストに追加
		var isFirstGroup = !u.some(eventGroupList, function (eg) {
			return eg.groupId == ev.groupId;
		});
		if(isFirstGroup){
			var eventGroup = { groupId: ev.groupId, groupName: ev.groupName};
			eventGroupList.push(eventGroup);
		};
	});
	return { events: events, eventGroupList: eventGroupList};
}
function processCSV(filePath) {
	var contents = fs.readFileSync(filePath, 'utf8');

	var contentsArray = new Array();
	contentsArray = contents.split("\n");
	var objArray = new Array();
	var keys = [];
	u.each(contentsArray, function(line, index, contentsArray) {
		var eventObj = {};
		var tmpLine = line.replace("\r", "");
		if (index === 0) {
			keys = tmpLine.split("\t");
		} else {
			values = tmpLine.split("\t");
			u.each(keys, function(key, index, keys) {
				eventObj[key] = values[index];
			});
		}
		objArray[index-1] = eventObj;
	});
	console.dir(objArray);
	return objArray;
}

function convertFileToEventObject(path, encoding){
	var contents = fs.readFileSync(path, encoding);
	contents = contents.replace(/\/\*[\s\S]*?\*\//g, '');
	var obj = JSON.parse(contents);
	return obj;
}

router.get('/', function(req, res) {
  var map = um_utils.getNavbarInfo(req, res);

  // 認証されていない場合には、ログイン画面に遷移する。
  if(req.isAuthenticated()){
	  map.title = 'Calendar';
	  var eventObj = getEvents();
	  var evv = JSON.stringify(eventObj.events);

	  map.data = evv;
	  map.eventGroupList = eventObj.eventGroupList;
	  return res.render('index', map);
  } else {
	  return res.redirect('/auth/login');
  }
});

module.exports = router;
