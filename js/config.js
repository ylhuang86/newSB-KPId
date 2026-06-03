// =============================================================
//  KPI 填報系統 — 設定檔
// =============================================================

const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxDtSTLSFedPHLagiXvXqocOH_Rq7jz8nZM1NG-gTnEvt7NjR575eLAOGWakwJJpY7F/exec',

  SPREADSHEET_ID: '1pELlWCkWPgaRBUUe52cX_UawI1M9R5UMxOjU-Ft1goI',

  // 填報月份範圍：2026-06 ~ 2028-03
  VALID_MONTHS: (() => {
    const months = [];
    const start = new Date(2026, 5, 1);
    const end   = new Date(2028, 2, 1);
    const cur   = new Date(start);
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      months.push(`${y}-${m}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  })(),

  // 各校填寫開放日（每月 20 日起，27 日 23:59 截止）
  OPEN_DAY:  1,
  CLOSE_DAY: 31,

  SCHOOLS: ['nycu','tku','nthu','tmu','ntou','niu','kmu','tcu','cycu','cmu','clut'],

  SCHOOL_NAMES: {
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
  },

  KPI_ROWS: ['1-1','1-2','1-3','1-4','2-1','2-2','2-3','3-1','3-2','3-3','4-1','4-2','4-3','4-4','4-5','4-6'],

  KPI_LABELS: {
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
  },

  // 需要驗證加總的群組
  VALIDATION_GROUPS: [
    { total: '2-1', parts: ['2-2', '2-3'], label: '註冊人次' },
    { total: '3-1', parts: ['3-2', '3-3'], label: '使用人次' },
    { total: '4-1', parts: ['4-2', '4-3'], label: '通過人次' }
  ]
};
