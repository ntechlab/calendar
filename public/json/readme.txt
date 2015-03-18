/*!
 * JSONファイルテンプレート
 */
{
  /*!
   * ファイル制御定義
   *
   * @param String global_property: このファイル内のカレンダーイベント共通属性に使用
   * @param String groupId: [必須] このファイル内のイベントのグループID（チェックボックスのIDに使用）
   * @param String groupName: [必須] このファイル内のイベントのグループ名（チェックボックスでイベントを表示/非表示する際のラベルに使用）
   * @param String className: [必須] styleSheetクラス名. 表示／非表示制御、オブジェクトスタイル指定に使用
   */
  "fileInfo":{
    "globalProperty": {
      "groupId": "event1",
      "groupName": "カテゴリ1",
      "className": "class-c"
    }
  },
  /*!
   * カレンダーイベント定義
   *
   * @param String id: [必須] イベントを識別するためのID
   * @param String title: [必須] タイトル
   * @param datetime [必須] start: 開始日時  ex) "2014-09-01", "2014-09-09T16:00:00"
   * @param datetime end: 終了日時  ex) "2014-09-01", "2014-09-09T16:00:00"
   * @param String url: イベントクリックした際に遷移するURL
   * @param boolean editable: 編集可否
   * @param boolean startEditable: 開始日時の変更可否
   * @param boolean durationEditable: イベントの間隔（開始日時～終了日時の期間）の変更可否
   * @param String source: jsonデータやgoogleカレンダーのデータを取り込む際に使用
   * @param String description: イベントの説明文
   */
  "event":[
    {
      "id": "a-01",
      "title": "All Day Event",
      "start": "2014-11-01",
      "description": "イベントの説明文です。。。。。"
    },
    {
      "id": "a-02",
      "title": "Long Event",
      "start": "2014-11-07",
      "end": "2014-11-10"
    },
    {
      "id": "a-03",
      "title": "Repeating Event",
      "start": "2014-11-09T16:00:00-05:00"
    },
    {
      "id": "a-04",
      "title": "Repeating Event",
      "start": "2014-11-16T16:00:00-05:00"
    },
    {
      "id": "a-05",
      "title": "Conference",
      "start": "2014-11-11",
      "end": "2014-11-13"
    },
    {
      "id": "a-06",
      "title": "Meeting",
      "start": "2014-11-12T10:30:00-05:00",
      "end": "2014-11-12T12:30:00-05:00"
    }
  ]
}
