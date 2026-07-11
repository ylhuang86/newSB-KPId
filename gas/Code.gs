// =============================================================
//  KPI 填報系統 — Google Apps Script 後端
//  試算表 ID: 1pELlWCkWPgaRBUUe52cX_UawI1M9R5UMxOjU-Ft1goI
// =============================================================

var SPREADSHEET_ID = '1pELlWCkWPgaRBUUe52cX_UawI1M9R5UMxOjU-Ft1goI';

// 各校填寫開放起始日（每月 24 日起開放，至月底截止）
var OPEN_DAY = 24;

// 取得目前台北時間的「日」（1~31）
function getTaipeiDay_() {
  return parseInt(Utilities.formatDate(new Date(), 'Asia/Taipei', 'd'), 10);
}

var SCHOOLS = ['nycu','tku','nthu','tmu','ntou','niu','kmu','tcu','cycu','cmu','clut'];

var SCHOOL_NAMES = {
  nycu: '國立陽明交通大學',
  tku:  '淡江大學',
  nthu: '國立清華大學',
  tmu:  '臺北醫學大學',
  ntou: '國立臺灣海洋大學',
  niu:  '國立宜蘭大學',
  kmu:  '高雄醫學大學',
  tcu:  '慈濟大學',
  cycu: '中原大學',
  cmu:  '中國醫藥大學',
  clut: '致理科技大學'
};

// 22 個填報月份（2026-06 ~ 2028-03）
var VALID_MONTHS = (function() {
  var months = [];
  var start = new Date(2026, 5, 1); // 2026-06
  var end   = new Date(2028, 2, 1); // 2028-03
  var cur   = new Date(start);
  while (cur <= end) {
    var y = cur.getFullYear();
    var m = String(cur.getMonth() + 1).padStart(2, '0');
    months.push(y + '-' + m);
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
})();

// KPI 列順序（共 16 欄）
var KPI_ROWS = ['1-1','1-2','1-3','1-4','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2','4-3','4-4','4-5','4-6'];

// KPI 說明文字
var KPI_LABELS = {
  '1-1': '磨課師課程開設數（門）',
  '1-2': '推廣對象母語課程數',
  '1-3': '英語課程數',
  '1-4': '多語言課程數',
  '2-1': '註冊人次（境內＋境外）',
  '2-2': '境內註冊人次',
  '2-3': '境外註冊人次',
  '3-1': '使用人次（境內＋境外）',
  '3-2': '境內使用人次',
  '3-3': '境外使用人次',
  '4-1': '通過人次（境內＋境外）',
  '4-2': '境內通過人次',
  '4-3': '境外通過人次',
  '4-4': '取得證書數',
  '4-5': '核與學分人數',
  '4-6': '核與學分數'
};

// =============================================================
//  進入點
// =============================================================
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'KPI System API Ready', version: '1.0' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var params = JSON.parse(e.postData.contents);
    var action = params.action;
    var result;

    switch (action) {
      case 'login':          result = handleLogin(params);          break;
      case 'submitKPI':      result = handleSubmitKPI(params);      break;
      case 'getKPI':         result = handleGetKPI(params);         break;
      case 'getSummary':     result = handleGetSummary(params);     break;
      case 'changePassword': result = handleChangePassword(params); break;
      case 'adminSubmitKPI': result = handleAdminSubmitKPI(params); break;
      case 'adminGetKPI':    result = handleAdminGetKPI(params);    break;
      default:
        result = { success: false, message: '未知的 action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: '伺服器錯誤：' + err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =============================================================
//  Helper：依表頭名稱取得欄位索引（0-based），找不到回傳 -1
// =============================================================
function getColIndex(headerRow, colName) {
  for (var i = 0; i < headerRow.length; i++) {
    if (String(headerRow[i]).trim() === colName) return i;
  }
  return -1;
}

// =============================================================
//  登入驗證
// =============================================================
function handleLogin(params) {
  var username     = params.username;
  var passwordHash = params.passwordHash;

  if (!username || !passwordHash) {
    return { success: false, message: '請輸入帳號與密碼' };
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('users');
  if (!sheet) return { success: false, message: '找不到 users 工作表' };

  var data    = sheet.getDataRange().getValues();
  var headers = data[0];

  // 依表頭名稱動態找欄位，不依賴固定索引
  var colSchoolId   = getColIndex(headers, 'school_id');
  var colSchoolName = getColIndex(headers, 'school_name');
  var colUsername   = getColIndex(headers, 'username');
  var colPassword   = getColIndex(headers, 'password_hash');
  var colRole       = getColIndex(headers, 'role');

  if (colUsername === -1 || colPassword === -1) {
    return { success: false, message: 'users 工作表缺少必要欄位（username / password_hash）' };
  }

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[colUsername]).trim() === username &&
        String(row[colPassword]).trim() === passwordHash) {
      return {
        success:     true,
        school_id:   colSchoolId   !== -1 ? String(row[colSchoolId]).trim()   : '',
        school_name: colSchoolName !== -1 ? String(row[colSchoolName]).trim() : '',
        role:        colRole       !== -1 ? String(row[colRole]).trim()        : ''
      };
    }
  }
  return { success: false, message: '帳號或密碼錯誤' };
}

// =============================================================
//  各校送出 KPI（日期限制：每月 24 日起開放，至月底截止）
// =============================================================
function handleSubmitKPI(params) {
  var schoolId = params.school_id;
  var month    = params.month;   // YYYY-MM
  var kpiData  = params.kpi;     // { '1-1': n, '1-2': n, ... }

  if (!schoolId || !month || !kpiData) {
    return { success: false, message: '缺少必要參數' };
  }

  // 日期限制：僅每月 24 日至月底可送出（月底上限由當月實際天數自然限制）
  if (getTaipeiDay_() < OPEN_DAY) {
    return { success: false, message: '目前非填報期間，開放時間為每月 ' + OPEN_DAY + ' 日至月底' };
  }

  // 月份合法性
  if (VALID_MONTHS.indexOf(month) === -1) {
    return { success: false, message: '填報月份不在有效範圍內（2026-06 ～ 2028-03）' };
  }

  return writeKPI(schoolId, month, kpiData);
}

// =============================================================
//  管理者代填 / 修正（不限日期）
// =============================================================
function handleAdminSubmitKPI(params) {
  var schoolId = params.school_id;
  var month    = params.month;
  var kpiData  = params.kpi;

  if (!schoolId || !month || !kpiData) {
    return { success: false, message: '缺少必要參數' };
  }
  if (VALID_MONTHS.indexOf(month) === -1) {
    return { success: false, message: '填報月份不在有效範圍內（2026-06 ～ 2028-03）' };
  }

  return writeKPI(schoolId, month, kpiData);
}

// =============================================================
//  寫入 KPI（共用）
// =============================================================
function writeKPI(schoolId, month, kpiData) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // --- 寫入各校分頁 ---
  var sheet = ss.getSheetByName(schoolId);
  if (!sheet) return { success: false, message: '找不到學校工作表：' + schoolId };

  var colIndex = getOrCreateMonthColumn(sheet, month);

  // 一次寫入 16 個 KPI 值 + timestamp
  var ts = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss');
  var writeData = KPI_ROWS.map(function(k) {
    var val = kpiData[k];
    return [val !== undefined ? Number(val) : 0];
  });
  writeData.push([ts]);
  sheet.getRange(2, colIndex, writeData.length, 1).setValues(writeData);

  // --- 同步更新 summary ---
  updateSummary(ss, schoolId, month, kpiData);

  return { success: true, message: '資料已成功送出' };
}

// 取得月份欄號，不存在則新增
// 欄 1 = 欄位編號，欄 2 = 說明，欄 3 起 = 月份資料
// 將欄位值（可能是 Date 或 String）統一轉成 "YYYY-MM" 格式
function cellToMonthStr(val) {
  if (val instanceof Date && !isNaN(val)) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
  }
  return String(val).trim();
}

function getOrCreateMonthColumn(sheet, month) {
  var lastCol   = Math.max(sheet.getLastColumn(), 2);
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var c = 0; c < headerRow.length; c++) {
    if (cellToMonthStr(headerRow[c]) === month) return c + 1;
  }
  // 依照 VALID_MONTHS 順序插入，最早從第 3 欄開始
  var targetIdx = VALID_MONTHS.indexOf(month);
  var insertCol = 3;
  for (var c = 2; c < headerRow.length; c++) {
    var existIdx = VALID_MONTHS.indexOf(cellToMonthStr(headerRow[c]));
    if (existIdx !== -1 && existIdx < targetIdx) insertCol = c + 2;
  }
  sheet.insertColumnBefore(insertCol);
  // 強制設為純文字，避免 Sheets 自動轉成 Date
  var cell = sheet.getRange(1, insertCol);
  cell.setNumberFormat('@STRING@');
  cell.setValue(month);
  return insertCol;
}

// =============================================================
//  讀取指定學校 + 月份的 KPI
// =============================================================
function handleGetKPI(params) {
  var schoolId = params.school_id;
  var month    = params.month;

  if (!schoolId || !month) return { success: false, message: '缺少必要參數' };

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(schoolId);
  if (!sheet) return { success: false, message: '找不到學校工作表' };

  var headerRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 2)).getValues()[0];
  var colIndex  = -1;
  for (var c = 2; c < headerRow.length; c++) { // 從第 3 欄（index 2）起找月份
    if (String(headerRow[c]).trim() === month) { colIndex = c + 1; break; }
  }

  if (colIndex === -1) return { success: true, data: null }; // 尚未填寫

  var colData = sheet.getRange(2, colIndex, KPI_ROWS.length + 1, 1).getValues();
  var result  = {};
  for (var i = 0; i < KPI_ROWS.length; i++) {
    result[KPI_ROWS[i]] = colData[i][0];
  }
  result['submitted_at'] = colData[KPI_ROWS.length][0];

  return { success: true, data: result };
}

// =============================================================
//  管理者讀取任意學校 + 月份
// =============================================================
function handleAdminGetKPI(params) {
  return handleGetKPI(params); // 同邏輯，無日期限制
}

// =============================================================
//  讀取 summary（所有月份 × 所有 KPI）
// =============================================================
function handleGetSummary(params) {
  var filterMonth = params.month || null; // 可選，傳入則只回傳該月

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('summary');
  if (!sheet) return { success: false, message: '找不到 summary 工作表' };

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var allData = sheet.getRange(1, 1, lastRow, lastCol).getValues();

  // 第 1 列：表頭（欄1=欄位編號, 欄2=說明, 欄3起=月份）；第 1 欄：KPI 編號
  var headers = allData[0].slice(2); // 從第 3 欄（index 2）起取月份
  var result  = {};

  for (var c = 0; c < headers.length; c++) {
    var m = String(headers[c]).trim();
    if (!m) continue;
    if (filterMonth && m !== filterMonth) continue;

    result[m] = {};
    for (var r = 1; r < allData.length; r++) {
      var kpiKey = String(allData[r][0]).trim();
      if (kpiKey) result[m][kpiKey] = allData[r][c + 2]; // offset +2（跳過欄位編號、說明）
    }
  }

  return { success: true, data: result };
}

// =============================================================
//  更新 summary 工作表
// =============================================================
function updateSummary(ss, schoolId, month, kpiData) {
  var sheet = ss.getSheetByName('summary');
  if (!sheet) return;

  var colIndex = getOrCreateMonthColumn(sheet, month);

  // 初始化加總陣列
  var totals = KPI_ROWS.map(function() { return 0; });

  // 每間學校一次讀整欄，避免逐格呼叫 API
  SCHOOLS.forEach(function(sid) {
    var sSheet = ss.getSheetByName(sid);
    if (!sSheet) return;

    var lastCol  = Math.max(sSheet.getLastColumn(), 2);
    var sHeader  = sSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var sCol     = -1;
    for (var c = 0; c < sHeader.length; c++) {
      if (cellToMonthStr(sHeader[c]) === month) { sCol = c + 1; break; }
    }
    if (sCol === -1) return;

    // 一次讀取該學校該月所有 KPI 列
    var colData = sSheet.getRange(2, sCol, KPI_ROWS.length, 1).getValues();
    for (var i = 0; i < KPI_ROWS.length; i++) {
      totals[i] += Number(colData[i][0]) || 0;
    }
  });

  // 一次寫入 summary 欄
  var writeData = totals.map(function(v) { return [v]; });
  sheet.getRange(2, colIndex, KPI_ROWS.length, 1).setValues(writeData);
}

// =============================================================
//  更改密碼
// =============================================================
function handleChangePassword(params) {
  var username        = params.username;
  var oldPasswordHash = params.oldPasswordHash;
  var newPasswordHash = params.newPasswordHash;

  if (!username || !oldPasswordHash || !newPasswordHash) {
    return { success: false, message: '缺少必要參數' };
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('users');
  if (!sheet) return { success: false, message: '找不到 users 工作表' };

  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var colUsername = getColIndex(headers, 'username');
  var colPassword = getColIndex(headers, 'password_hash');

  if (colUsername === -1 || colPassword === -1) {
    return { success: false, message: 'users 工作表缺少必要欄位（username / password_hash）' };
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colUsername]).trim() === username &&
        String(data[i][colPassword]).trim() === oldPasswordHash) {
      sheet.getRange(i + 1, colPassword + 1).setValue(newPasswordHash);
      return { success: true, message: '密碼已成功更新' };
    }
  }
  return { success: false, message: '目前密碼錯誤，請重新輸入' };
}

// =============================================================
//  初始化工作表結構（執行一次）
// =============================================================
function setupSheets() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 建立 users 工作表
  var usersSheet = ss.getSheetByName('users');
  if (!usersSheet) {
    usersSheet = ss.insertSheet('users');
    usersSheet.getRange(1, 1, 1, 5).setValues([['school_id', 'school_name', 'username', 'password_hash', 'role']]);
    var rows = SCHOOLS.map(function(id) {
      return [id, SCHOOL_NAMES[id], id, '', 'school'];
    });
    rows.push(['admin1', '管理者1', 'admin1', '', 'admin']);
    rows.push(['admin2', '管理者2', 'admin2', '', 'admin']);
    usersSheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }

  // 建立各校工作表
  SCHOOLS.forEach(function(id) {
    var sheet = ss.getSheetByName(id);
    if (!sheet) {
      sheet = ss.insertSheet(id);
      // 欄 1 = 欄位編號，欄 2 = 說明，欄 3 起 = 月份資料
      var labels = KPI_ROWS.map(function(k) { return [k, KPI_LABELS[k]]; });
      labels.push(['填寫時間', '']);
      sheet.getRange(2, 1, labels.length, 2).setValues(labels);
      sheet.getRange(1, 1).setValue('欄位編號');
      sheet.getRange(1, 2).setValue('說明');
      // 欄寬設定
      sheet.setColumnWidth(1, 80);
      sheet.setColumnWidth(2, 220);
    }
  });

  // 建立 summary 工作表
  var summarySheet = ss.getSheetByName('summary');
  if (!summarySheet) {
    summarySheet = ss.insertSheet('summary');
    var labels = KPI_ROWS.map(function(k) { return [k, KPI_LABELS[k]]; });
    summarySheet.getRange(2, 1, labels.length, 2).setValues(labels);
    summarySheet.getRange(1, 1).setValue('欄位編號');
    summarySheet.getRange(1, 2).setValue('說明');
    summarySheet.setColumnWidth(1, 80);
    summarySheet.setColumnWidth(2, 220);
  }

  Logger.log('初始化完成！共建立 ' + (SCHOOLS.length + 2) + ' 個工作表。');
}
