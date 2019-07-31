function main() {
  deleteTrigger();
  if(isHoliday()) {
    const t = "今日は休日なので更新はありません！";
    postSlackMessage(t);
    return;
  }
  const url = 'https://ws-tcg.com/todays-card/';
  const html = getHtml(url);
  const regexp = /\/wordpress\/wp-content\/uploads\/today_card\/[\S]*?.png/g;
  const r = html.match(regexp);
  const text = "今日のカードが更新されました！\n今日は"+r.length+"枚です！";
  postSlackMessage(text);
  getProducts(html);
  r.forEach(function( v ) {
    const wsUrl = 'https://ws-tcg.com' + v;
    const image = getImage(wsUrl);
    postSlackImage(image);
  });
  ssRecord(r);
}

function setTrigger() {
  const today = new Date();
  today.setHours(12);
  today.setMinutes(15);
  ScriptApp.newTrigger("main").timeBased().at(today).create();
}

function deleteTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for(var i = 0; i < triggers.length; i++) {
    if(triggers[i].getHandlerFunction() == "main")
      ScriptApp.deleteTrigger(triggers[i]);
  }
}

function getImage(url, name, folder) {
  const response = UrlFetchApp.fetch(url);
  const fileBlob = response.getBlob();
  return fileBlob;
}

function saveImage(fileBlob, folder) {
  var file = DriveApp.createFile(fileBlob);
  file.makeCopy(file.getName(), folder);
  file.setTrashed(true);
}

function postSlackMessage(text){
  const url = "Slack APIのエンドポイント";
  const payload = {
    "text": text,
    "username": "今日のカード"
  };
  const options = {
    "method" : "POST",
    "headers": {"Content-type": "application/json"},
    "payload" : JSON.stringify(payload)
  };
  UrlFetchApp.fetch(url, options);
}

function postSlackImage(image) {
  const TOKEN = '画像送信用のトークン';
  const data={
    token:TOKEN,
    file:image,
    channels:'送信チャンネル',
    title:'今日のカード'
  };
  const option={
    'method':'POST',
    'payload':data
  };
  UrlFetchApp.fetch('https://slack.com/api/files.upload',option);
}

function getProducts() {
  const url = 'https://ws-tcg.com/todays-card/';
  const html = getHtml(url);
  const result = getMatchList(html, /.*?\/">.*?(<br \/>|<\/a><\/h3>)/g);
  var text = "今日の更新タイトル\n";
  var value = [];
  for(var i = 0; i < result.length; i++) {
    var r = result[i];
    var searchTag = getMatchList(r, /.*?\/">/g)[0];
    var fIndex = r.indexOf(searchTag);
    var spResult = r.substring(fIndex + searchTag.length);
    var endTag = getMatchList(spResult, /(<br \/>)|(<\/a><\/h3>)/g)[0];
    var sIndex = spResult.indexOf(endTag);
    value[i] = spResult.substring(0, sIndex);
  }
  for(var i = 0; i < value.length; i++) {
    if(i !== 0)
      text += '\n';
    text += value[i];
  }
  postSlackMessage(text);
}

function isHoliday() {
  const today = new Date();
  const day = parseInt(today.getDay());
  if(day == 0 || day == 6)
    return true;
  const calendarId = "ja.japanese#holiday@group.v.calendar.google.com";
  const calendar = CalendarApp.getCalendarById(calendarId);
  const events = calendar.getEventsForDay(today);
  if(events.length > 0)
    return true;
  return false;
}

function getHtml(url) {
  const response = UrlFetchApp.fetch(url);
  const html = response.getContentText('UTF-8');
  return html;
}

function getMatchList(text, regex) {
  return text.match(regex);
}

function ssRecord(images) {
  const ss = SpreadsheetApp.getActiveSheet();
  const row = ss.getDataRange().getLastRow() + 1;
  const col1 = 1;
  const col2 = 2;
  const today = new Date();
  
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  const viewDate = year + '/' + month + '/' + date;
  
  ss.getRange(row, col1).setValue(viewDate);
  ss.getRange(row, col2).setValue(images.length + '枚');
  for(var i = 0; i < images.length; i++) {
    var setCol = i + 3;
    ss.getRange(row, setCol).setValue(images[i]);
  }
  resizeColumn(ss, images.length);
}

function resizeColumn(ss, count) {
  for(var i = 0; i < count; i++) {
    ss.autoResizeColumn(i + 3);
  }
}

function getPastImages(rowNum) {
  var ss = SpreadsheetApp.getActiveSheet();
  var getRow = rowNum + ':' + rowNum;
  var rowVals = ss.getRange(getRow).getValues()[0];
  var lastCol = rowVals.filter(function(e){return !(e === null || e === undefined || e === "");}).length;
  return lastCol;
}