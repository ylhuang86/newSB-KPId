// =============================================================
//  KPI 填報系統 — .xlsx 匯出（SheetJS）
// =============================================================

const Export = {

  // 各校：當月 KPI → .xlsx
  schoolKPI(schoolName, month, data) {
    const rows = [
      ['學校', schoolName],
      ['填報月份', month],
      ['最後送出時間', data.submitted_at || ''],
      [],
      ['欄位代號', '說明', '數值']
    ];

    CONFIG.KPI_ROWS.forEach(key => {
      rows.push([key, CONFIG.KPI_LABELS[key], Number(data[key] || 0)]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    // 欄寬
    ws['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, month);
    XLSX.writeFile(wb, `KPI_${schoolName}_${month}.xlsx`);
  },

  // 管理者：指定月份，所有學校 → .xlsx
  adminMonthly(month, summaryData, perSchoolData) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: summary（加總）
    const summaryRows = [
      [`${month} 各校 KPI 加總`],
      [],
      ['欄位代號', '說明', '加總值']
    ];
    CONFIG.KPI_ROWS.forEach(key => {
      const val = summaryData && summaryData[month] ? summaryData[month][key] : 0;
      summaryRows.push([key, CONFIG.KPI_LABELS[key], Number(val || 0)]);
    });
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, '加總');

    // Sheet 2+: 各校原始資料
    if (perSchoolData) {
      CONFIG.SCHOOLS.forEach(sid => {
        const sData = perSchoolData[sid];
        if (!sData) return;
        const rows = [
          ['學校', CONFIG.SCHOOL_NAMES[sid]],
          ['填報月份', month],
          ['最後送出時間', sData.submitted_at || '未填寫'],
          [],
          ['欄位代號', '說明', '數值']
        ];
        CONFIG.KPI_ROWS.forEach(key => {
          rows.push([key, CONFIG.KPI_LABELS[key], Number(sData[key] || 0)]);
        });
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 12 }];
        // sheet 名稱最長 31 字元
        XLSX.utils.book_append_sheet(wb, ws, sid.toUpperCase());
      });
    }

    XLSX.writeFile(wb, `KPI_統計報表_${month}.xlsx`);
  },

  // 管理者：所有月份 summary → .xlsx（同 summary 工作表結構）
  adminAllMonths(summaryData) {
    // 列 = KPI 欄位，欄 = 欄位編號 + 說明 + 月份（同 Google Sheets 結構）
    const months = CONFIG.VALID_MONTHS.filter(m => summaryData[m]);

    const headerRow = ['欄位編號', '說明', ...months];
    const rows = [headerRow];

    CONFIG.KPI_ROWS.forEach(key => {
      const row = [key, CONFIG.KPI_LABELS[key]];
      months.forEach(m => {
        row.push(Number((summaryData[m] && summaryData[m][key]) || 0));
      });
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 28 }, ...months.map(() => ({ wch: 12 }))];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    XLSX.writeFile(wb, `KPI_所有月份加總.xlsx`);
  }
};
