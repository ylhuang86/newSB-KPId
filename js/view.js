// =============================================================
//  KPI 填報系統 — 各校查閱頁面
// =============================================================

(async function() {
  const user = Auth.requireLogin();
  if (!user) return;

  const month = Auth.getCurrentMonth();

  document.getElementById('navSchoolName').textContent = user.school_name;
  document.getElementById('pageTitle').textContent     = `本月資料查閱 — ${user.school_name}`;
  document.getElementById('pageSubtitle').textContent  = `填報月份：${month}`;

  const result = await API.getKPI(user.school_id, month);
  document.getElementById('loadingMsg').classList.add('hidden');

  if (!result.success) {
    document.getElementById('noDataMsg').textContent = result.message || '資料載入失敗';
    document.getElementById('noDataMsg').classList.remove('hidden');
    return;
  }

  if (!result.data) {
    document.getElementById('noDataMsg').textContent = '本月尚未填寫資料。';
    document.getElementById('noDataMsg').classList.remove('hidden');
    return;
  }

  // 渲染資料表
  const data    = result.data;
  const tbody   = document.getElementById('kpiTableBody');
  const sections = [
    { title: '第一類：課程開設', keys: ['1-1','1-2','1-3','1-4'] },
    { title: '第二類：註冊',     keys: ['2-1','2-2','2-3'] },
    { title: '第三類：使用',     keys: ['3-1','3-2','3-3'] },
    { title: '第四類：通過與證書', keys: ['4-1','4-2','4-3','4-4','4-5','4-6'] }
  ];

  sections.forEach(sec => {
    // 分類標題列
    const titleRow = document.createElement('tr');
    titleRow.className = 'section-row';
    titleRow.innerHTML = `<td colspan="3">${sec.title}</td>`;
    tbody.appendChild(titleRow);

    sec.keys.forEach(key => {
      const tr = document.createElement('tr');
      const isTotalRow = ['2-1','3-1','4-1'].includes(key);
      if (isTotalRow) tr.className = 'total-row';
      tr.innerHTML = `
        <td><span class="kpi-code">${key}</span></td>
        <td>${CONFIG.KPI_LABELS[key]}</td>
        <td class="text-right">${Number(data[key] || 0).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  });

  document.getElementById('dataTitle').textContent =
    `${user.school_name} — ${month} KPI 資料`;
  if (data.submitted_at) {
    document.getElementById('submittedAt').textContent =
      `最後送出時間：${data.submitted_at}`;
  }
  document.getElementById('dataCard').classList.remove('hidden');

  // 下載按鈕
  document.getElementById('downloadBtn').addEventListener('click', () => {
    Export.schoolKPI(user.school_name, month, data);
  });

})();
