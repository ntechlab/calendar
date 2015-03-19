var express = require('express');
var router = express.Router();
var um_utils = require('../lib/um_utils');
var u = require('underscore');
var fs = require('fs');
var moment = require('../public/javascripts/lib/moment.min');
var logger = require('../Log.js').getLogger('index');

var path = './public/json/';

function getEvents(){
	logger.debug("getEvents call");
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
		if(v.match("\.json$")){
			eventObject = processJSON(path+"/"+v);
		}
//		else if (v.match("\.csv$")){
//			eventObject = processCSV(path+"/"+v);
//		}
		if(eventObject){
			events = events.concat(eventObject.events);
			eventGroupList = eventGroupList.concat(eventObject.eventGroupList);
		}
	});
	logger.debug("getEvents return: [events:" + events.length+ "][eventGroupList:" + eventGroupList.length + "]");
	return { events: events, eventGroupList: eventGroupList};
}

function processJSON(filePath) {
	logger.debug("processJSON call: ["+filePath+"]");
	var events = [];
	var eventGroupList = [];
	var obj = convertFileToEventObject(filePath, 'utf8');
	var fileInfo = obj.fileInfo;
	var globalProperty = fileInfo.globalProperty;
	var fileName = filePath.substring(filePath.lastIndexOf('/')+1, filePath.length);
	u.each(obj.event, function (ev){
		// 各イベントにグローバルプロパティを設定
		var classes = [];
		// 編集可能なイベントにeditableクラスを追加する。祝日イベントを編集禁止にするため。
		classes.push("editable");
		u.each(globalProperty, function (value, key){
			if(value){
				// JSONファイルのグローバルプロパティーにgroupId, classNameが設定されている場合にはクラスとして追加する。
				// クラスgroupIdによって、イベントの表示・非表示を制御するため。
				if(key === "groupId" || key === "className"){
					classes.push(value);
				}
				ev[key] = value;
			}
		});
		// CSSクラスの設定
		// イベントオブジェクトのクラスに指定した内容は、カレンダー上のイベントのクラスとして、
		// そのまま利用される。これを利用して、指定したグループＩＤのイベントの表示非表示処理を行う。
		ev.className = classes.join(' ');
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
	logger.debug("processJSON return");
	return { events: events, eventGroupList: eventGroupList};
}

//function processCSV(filePath) {
//	var events = [];
//	var eventGroupList = [];
//	var contents = fs.readFileSync(filePath, 'utf8');
//	var contentsArray = [];
//	contentsArray = contents.split("\n");
//	var objArray = [];
//	var keys;
//	var eventCnt = 0;
//	u.each(contentsArray, function(line, index, contentsArray) {
//		var eventObj = {};
//		var values;
//		var tmpLine = line.replace("\r", "");
//
//		if(tmpLine != "") {
//			if (index === 0) {
//				keys = tmpLine.split("\t");
//			} else {
//				values = tmpLine.split("\t");
//				u.each(keys, function(key, index2, keys) {
//					eventObj[key] = values[index2];
//					// logger.debug("eventCnt[" + eventCnt + "]");
//				});
//				objArray[eventCnt] = eventObj;
//				eventCnt++;
//			}
//		}
//	});
//	u.forEach(objArray, function(row){
//		var obj =  csvRowToObj(row);
//		events.push(obj.event);
//		eventGroupList.push(obj.eventGroup);
//	});
//	eventGroupList = unique(eventGroupList, ["groupName", "groupId"]);
//	return {events: events, eventGroupList: eventGroupList};
//}

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

//function csvRowToObj(row){
//	var KEY_ID = "meta_id_management";
//	var KEY_TITLE = "tab1_task_name";
//	var KEY_START = "start";
//	var KEY_END = "end";
//	var KEY_CLASS_NAME = "tab1_information_of_task";
//
//	var event = {
//		"id": row[KEY_ID],
//		"title": row[KEY_TITLE],
//		"start": row[KEY_START],
//		"end": row[KEY_END],
//		"className": row[KEY_CLASS_NAME],
//		"groupName": row[KEY_CLASS_NAME],
//		"groupId": row[KEY_CLASS_NAME]
//	};
//
//	var group = {
//		"className": row[KEY_CLASS_NAME],
//		"groupName": row[KEY_CLASS_NAME],
//		"groupId": row[KEY_CLASS_NAME]
//	}
//
//	return {event: event, eventGroup: group};
//}

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
router.post('/processEvent', function(req, res) {
	logger.info("post call: req.body=["+JSON.stringify(req.body)+"]");

	// JSON編集中ステータスファイル
	var edittingFile = path + "editting.pid";

	try {
		// 画面のリクエストデータから追加するイベント情報を取得
		var jsonEventData = req.body.data;
		logger.debug("jsonEventData[" + jsonEventData +"]");

		var eventData = JSON.parse(jsonEventData);
		var event = eventData.event;
		var options = eventData.options;
		var errorMessage;

		var addEventName = event.title;
		var targetEventFile = options.fileName;

		// JSONファイル編集中にする
		var processOK = createEmptyFile(edittingFile);

		// 誰かがJSONファイル編集中の場合は以降の処理を行わずに終了する
		if (!processOK) {
			errorMessage = "別ユーザがイベント編集中のため処理に失敗しました：[" + addEventName + "]";
			logger.error(errorMessage);
			res.message(errorMessage, "alert-warning");
			return renderCalendar(req, res);
		}

		// 変更するJSONファイルをバックアップする
		var timestamp = moment().format("YYYYMMDDHHmmssSSS");
		processOK = copyFile(path + targetEventFile, path + "bk/" + targetEventFile + "." + timestamp, "UTF-8");
		// JSONファイルをバックアップに失敗した場合は終了する
		if (!processOK) {
			errorMessage = "ファイル操作に失敗しました：[" + addEventName + "]";
			logger.error(errorMessage+"[copyFile]");
			res.message(errorMessage, "alert-danger");
			return renderCalendar(req, res);
		}

		// JSONファイルからイベント情報を取得
		var contents = convertFileToEventObject(path + targetEventFile, 'utf8');

		// アクションに応じてイベントオブジェクト配列を加工する。
		var id = options.id || "EV_" + contents.fileInfo.globalProperty.groupId + "_" + timestamp;
		var message = processEventObject(contents, options.action, id, event);

		// JSONファイル更新
		processOK = writeFile(path + targetEventFile, JSON.stringify(contents, '', '    '), "UTF-8");
		if (processOK) {
			logger.info(message);
			res.message(message, "alert-success");
		} else {
			var errorMessage = "ファイル操作に失敗。イベント[" + addEventName +" ("+id+")]を追加できませんでした。";
			logger.error(errorMessage + "[writeFile]");
			res.message(errorMessage, "alert-danger");
		}
	} finally {
		deleteFile(edittingFile);
	}
	logger.debug("post return");
	return renderCalendar(req, res);
});

function processEventObject(contents, action, id, event) {
	logger.debug("processEventObject call: ["+contents.length+"]["+action+"]["+id+"]["+JSON.stringify(event)+"]");
	var message;
	if(action === "add"){
		// イベントIDの採番して新規イベントを作成
		var addEventObject = {
				id: id
		};
		// リクエスト情報から連携されたデータをマージする
		u.extend(addEventObject, event);

		logger.debug("追加するイベント情報:[" + JSON.stringify(addEventObject));

		// イベント情報にeventを追加する
		contents.event.push(addEventObject);
		message = "イベント["+event.title+" ("+id+")]を追加しました。";
	} else if(action === "update"){
		var row = u.findWhere(contents.event, {id: id});
		u.extend(row, event);
		message = "イベント["+event.title+" ("+id+")]を更新しました。";
	} else if(action === "delete"){
		var list = u.reject(contents.event, function(ev){
			return ev.id === id;
		});
		contents.event = list;
		message = "イベント["+event.title +" ("+id+")]を削除しました。";
	} else {
		message = "想定外のアクションが指定されました["+action+"]";
	}
	logger.debug("processEventObject return: [" + message + "]");
	return message;
}

/**
 * カレンダー画面を表示する
 *
 * @param req リクエストオブジェクト
 * @param res レスポンスオブジェクト
 * @returns カレンダー画面の表示
 */
function renderCalendar(req, res){
	logger.debug("renderCalendar call");
	var map = um_utils.getNavbarInfo(req, res);
	map.title = 'Calendar';
	var eventObj = getEvents();
	var evv = JSON.stringify(eventObj.events);
	map.data = evv;
	map.eventGroupList = eventObj.eventGroupList;
	logger.debug("renderCalendar return");
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
	logger.debug("createEmptyFile call: [" + filePath + "]");
	var success = false;
	try {
		// 空ファイル作成（すでに存在していたらエラー）
		fs.writeFileSync(filePath, "", {flag: "wx"});
		success = true;
	} catch (err) {
		logger.error("ファイル[" + filePath + "]はすでに存在します。");
	}
	logger.debug("createEmptyFile return: [" + success + "]");
	return success;
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
	logger.debug("copyFile call: [" + orgFilePath + "][" + copyFilePath + "]");
	var success = false;
	try {
		var contents = fs.readFileSync(orgFilePath, encoding);
		// ファイルをコピーして書き込み（すでに存在していたらエラー）
		fs.writeFileSync(copyFilePath, contents, {flag: "wx"});
		success = true;
	} catch (err) {
		logger.error("ファイル[" + copyFilePath + "]のコピーに失敗にしました。");
	}
	logger.debug("copyFile return: [" + success + "]");
	return success;
}

/**
 * ファイルを削除する
 *
 * @param filePath ファイルパス
 * @returns {Boolean} ファイルが削除できなかったら false<br>
 *                    ファイルを削除したら true
 */
function deleteFile(filePath){
	logger.debug("deleteFile call: [" + filePath + "]");
	var success = false;
	try {
		// ファイル削除
		fs.unlinkSync(filePath);
		success = true;
	} catch (err) {
		logger.error("ファイル[" + filePath + "]が削除できませんでした。");
	}
	logger.debug("deleteFile return: [" + success + "]");
	return success;
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
	logger.debug("writeFile call: [" + filePath + "]");
	var success = false;
	try {
		fs.writeFileSync(filePath, contents, {encoding: encoding});
		success = true;
	} catch (err) {
		logger.error("ファイル[" + filePath + "]に書き込めませんでした。");
		logger.error("書き込み内容[" + contents + "]");
	}
	logger.debug("writeFile return: [" + success + "]");
	return success;
}

