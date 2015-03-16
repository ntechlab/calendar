var express = require('express');
var router = express.Router();
var um_utils = require('../lib/um_utils');
var u = require('underscore');
var fs = require('fs');
var moment = require('../public/javascripts/lib/moment.min');

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
//		console.log(v);
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
//	console.dir(events);
	return { events: events, eventGroupList: eventGroupList};
}

function processJSON(filePath) {
	var events = [];
	var eventGroupList = [];
	var obj = convertFileToEventObject(filePath, 'utf8');
	var fileInfo = obj.fileInfo;
	var globalProperty = fileInfo.globalProperty;
	var fileName = filePath.substring(filePath.lastIndexOf('/')+1, filePath.length);
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
			var eventGroup = { groupId: ev.groupId, groupName: ev.groupName, className: ev.className, fileName: fileName};
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

/**
 * イベント追加
 * カレンダーよりイベント追加リクエストを受けて、JSONファイルにイベントを追加する。
 * 処理後、カレンダーを表示する。
 * アクション名：「/addEvent」
 */
router.post('/addEvent', function(req, res) {

	console.log("リクエストデータ");
	console.log(req.body);
	// TODO リクエストデータをJSONに変換する
//	var data = JSON.parse(req.body.data);
//	console.log("リクエストデータ");
//	console.log(data);

	// JSON編集中ステータスファイル
	var edittingFile = path + "editting.pid";
	// JSONファイル編集中にする
	var processOK = createEmptyFile(edittingFile);
	
	// 誰かがJSONファイル編集中の場合は以降の処理を行わずに終了する
	if (!processOK) {
		res.message("別ユーザがイベント編集中のためイベント[" + addEventName + "]を追加できませんでした。", "alert-success");
		return renderCalendar(req, res);
	}
	
	try {
		// 画面のリクエストデータから追加するイベント情報を取得
		// TODO 項目名は暫定（タイトルとファイル名を取得する）
		var addEventName = req.body.title;
		var targetEventFile = req.body.group;

		// 変更するJSONファイルをバックアップする
		var timestamp = moment().format("YYYYMMDDHHmmssSSS");
		processOK = copyFile(path + targetEventFile, path + "bk/" + targetEventFile + "." + timestamp, "UTF-8");
		// JSONファイルをバックアップに失敗した場合は終了する
		if (!processOK) {
			res.message("ファイル操作に失敗。イベント[" + addEventName + "]を追加できませんでした。", "alert-success");
			return renderCalendar(req, res);
		}
		
		// JSONファイルからイベント情報を取得
		var contents = convertFileToEventObject(path + targetEventFile, 'utf8');
		// イベントIDの採番して新規イベントを作成
		var addEventObject = {
				id: "AE_" + contents.fileInfo.globalProperty.groupId + "_" + timestamp
		};
		// リクエスト情報から連携されたデータをマージする
		// TODO リクエストデータをすべてマージしているが、イベント情報のみをマージするようにする
		u.extend(addEventObject, req.body);
		// TODO イベント情報のみをマージするようにしたら以下のdeleteは削除する
		delete addEventObject.group;
		
		console.log("追加するイベント情報");
		console.log(addEventObject);

		// イベント情報にeventを追加する
		contents.event.push(addEventObject);
		
		// JSONファイル更新
		processOK = writeFile(path + targetEventFile, JSON.stringify(contents, '', '    '), "UTF-8");
		if (processOK) {
			console.log("イベント[" + addEventName + "]を追加しました。");
			res.message("イベント[" + addEventName + "]を追加しました。", "alert-success");
		} else {
			console.log("ファイル操作に失敗。イベント[" + addEventName + "]を追加できませんでした。");
			res.message("ファイル操作に失敗。イベント[" + addEventName + "]を追加しませんでした。", "alert-success");
		}
	} finally {
		deleteFile(edittingFile);
	}
	return renderCalendar(req, res);

});

/**
 * カレンダー画面を表示する
 * 
 * @param req リクエストオブジェクト
 * @param res レスポンスオブジェクト
 * @returns カレンダー画面の表示
 */
function renderCalendar(req, res){
	var map = um_utils.getNavbarInfo(req, res);
	map.title = 'Calendar';
	var eventObj = getEvents();
	var evv = JSON.stringify(eventObj.events);

	map.data = evv;
	map.eventGroupList = eventObj.eventGroupList;
	return res.render('index', map);

}

/**
 * 空ファイルを作成する
 * 
 * @param filePath ファイルパス
 * @returns {Boolean} ファイルがすでに存在していたら false<br>
 *                    ファイルを新規作成したら true
 */
function createEmptyFile(filePath){
	console.log("ファイル[" + filePath + "]を作成します。");
	try {
		// 空ファイル作成（すでに存在していたらエラー）
		fs.writeFileSync(filePath, "", {flag: "wx"});
	} catch (err) {
		console.log("ファイル[" + filePath + "]はすでに存在します。");
		return false;
	}
	console.log("ファイル[" + filePath + "]を作成しました。");
	return true;
}

/**
 * ファイルをコピーする作成する
 * 
 * @param orgFilePath コピー元ファイルパス
 * @param copyFilePath コピー先ファイルパス
 * @param encoding エンコード
 * @returns {Boolean} ファイルがすでに存在していたら false<br>
 *                    ファイルを新規作成したら true
 */
function copyFile(orgFilePath, copyFilePath, encoding){
	console.log("ファイル[" + orgFilePath + "]を[" + copyFilePath + "]にコピーします。");
	try {
		var contents = fs.readFileSync(orgFilePath, encoding);
		// ファイルをコピーして書き込み（すでに存在していたらエラー）
		fs.writeFileSync(copyFilePath, contents, {flag: "wx"});
	} catch (err) {
		console.log("ファイル[" + copyFilePath + "]はすでに存在します。");
		return false;
	}
	console.log("ファイル[" + orgFilePath + "]を[" + copyFilePath + "]にコピーしました。");
	return true;
}

/**
 * ファイルを削除する
 * 
 * @param filePath ファイルパス
 * @returns {Boolean} ファイルが削除できなかったら false<br>
 *                    ファイルを削除したら true
 */
function deleteFile(filePath){
	console.log("ファイル[" + filePath + "]を削除します。");
	try {
		// ファイル削除
		fs.unlinkSync(filePath);
	} catch (err) {
		console.log("ファイル[" + filePath + "]が削除せきませんでした。");
		return false;
	}
	console.log("ファイル[" + filePath + "]を削除しました。");
	return true;
}

/**
 * ファイルに書き込む
 * 
 * @param filePath ファイルパス
 * @param contents 書き込む内容
 * @param encoding エンコード
 * @returns {Boolean} ファイルに書き込めなかったら false<br>
 *                    ファイルに書き込みしたら true
 */
function writeFile(filePath, contents, encoding){
	console.log("ファイル[" + filePath + "]に書き込みします。");
	try {
		fs.writeFileSync(filePath, contents, {encoding: encoding});
	} catch (err) {
		console.log("ファイル[" + filePath + "]に書き込めませんでした。");
		console.log("書き込み内容[" + contents + "]");
		return false;
	}
	console.log("ファイル[" + filePath + "]に書き込みしました。");
	return true;
}

