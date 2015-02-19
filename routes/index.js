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
	var holidays= convertFileToEventObject(path + "/static/holiday.json", 'utf8');
	u.each(holidays, function (ev){
		ev.className = "holiday";
		ev.editable = false;
		events.push(ev);
	});
	list.forEach(function (v){
		var eventObject;
		console.log(v);
		if(v.match("\.json$")){
			eventObject = processJSON(path+"/"+v);
		} else if (v.match("\.csv$")){
			eventObject = processCSV(path+"/"+v);
		}
		if(eventObject){
			events = events.concat(eventObject.events);
			eventGroupList = eventGroupList.concat(eventObject.eventGroupList);
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
			var eventGroup = { groupId: ev.groupId, groupName: ev.groupName, className: ev.className};
			eventGroupList.push(eventGroup);
		};
	});
	return { events: events, eventGroupList: eventGroupList};
}

function processCSV(filePath) {
	var events = [];
	var eventGroupList = [];
	var contents = fs.readFileSync(filePath, 'utf8');
	var contentsArray = [];
	contentsArray = contents.split("\n");
	var objArray = [];
	var keys;
	var eventCnt = 0;
	u.each(contentsArray, function(line, index, contentsArray) {
		var eventObj = {};
		var values;
		var tmpLine = line.replace("\r", "");

		if(tmpLine != "") {
			if (index === 0) {
				keys = tmpLine.split("\t");
			} else {
				values = tmpLine.split("\t");
				u.each(keys, function(key, index2, keys) {
					eventObj[key] = values[index2];
					console.log("eventCnt[" + eventCnt + "]");
				});
				objArray[eventCnt] = eventObj;
				eventCnt++;
			}
		}
	});
	u.forEach(objArray, function(row){
		var obj =  csvRowToObj(row);
		events.push(obj.event);
		eventGroupList.push(obj.eventGroup);
	});
	eventGroupList = unique(eventGroupList, ["groupName", "groupId"]);
	return {events: events, eventGroupList: eventGroupList};
}

// 配列arrayに格納されたオブジェクトをkeysに関してuniqueを取る。
function unique(array, keys){
	var checkMap = {};
	var ret = [];
	u.forEach(array, function(row) {
		var checkKey = "";
		u.forEach(keys, function(key) {
			checkKey += row[key]+",";
		});
		if (!checkMap[checkKey]){
			ret.push(row);
			checkMap[checkKey] = true;
		}
	});
	return ret;
}

function csvRowToObj(row){
	var KEY_ID = "meta_id_management";
	var KEY_TITLE = "tab1_task_name";
	var KEY_START = "start";
	var KEY_END = "end";
	var KEY_CLASS_NAME = "tab1_information_of_task";
		
	var event = {
		"id": row[KEY_ID],
		"title": row[KEY_TITLE],
		"start": row[KEY_START],
		"end": row[KEY_END],
		"className": row[KEY_CLASS_NAME],
		"groupName": row[KEY_CLASS_NAME],
		"groupId": row[KEY_CLASS_NAME]
	};
	
	var group = {
		"className": row[KEY_CLASS_NAME],
		"groupName": row[KEY_CLASS_NAME],
		"groupId": row[KEY_CLASS_NAME]
	}
		
	return {event: event, eventGroup: group};
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
