// =============================================================
//  KPI 填報系統 — 管理者儀表板
// =============================================================

const Admin = {
  currentTab:    'summary',
  summaryData:   null,   // { 'YYYY-MM': { '1-1': n, ... } }
  currentSchoolData: null,

  async init() {
    const user = Auth.requireAdmin();
    if (!user) return;

    document.getElementById('navAdminName').textContent = `${user.school_name}（管理者）`;

    // 填充月份選單
    this.populateMonthSelects();

    // 填充學校選單
    const schoolSel = document.getElementById('schoolSelect');
    CONFIG.SCHOOLS.forEach(sid => {
      const opt = document.createElement('option');
      opt.value       = sid;
      opt.textContent = `${CONFIG.SCHOOL_NAMES[sid]}（${sid}）`;
      schoolSel.appendChild(opt);
    });

    // 載入 summary
    await this.loadSummary();

    // 各校查詢按鈕
    document.getElementById('btnLoadSchool').addEventListener('click', () => this.loadSchoolData());

    // 匯出按鈕
    document.getElementById('btnExportAll').addEventListener('click', () => {
      if (!this.summaryData) return alert('請先載入資料');
      Export.adminAllMonths(this.summaryData);
    });

    document.getElementById('btnExportMonth').addEventListener('click', () => {
      const m = document.getElementById('summaryMonthFilter').value;
      if (!m) return alert('請選擇月份');
      if (!this.summaryData) return alert('請先載入資料');
      Export.adminMonthly(m, this.summaryData, null);
    });

    document.getElementById('btnEditSchool').addEventListener('click', () => this.openEdit());
    document.getElementById('btnExportSchool').addEventListener('click', () => {
      const sid   = document.getElementById('schoolSelect').value;
      const month = document.getElementById('schoolMonthSelect').value;
      if (this.currentSchoolData) {
        Export.schoolKPI(CONFIG.SCHOOL_NAMES[sid], month, this.currentSchoolData);
      }
    });

    document.getElementById('editForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitEdit();
    });

    // 月份篩選變更時重新渲染表格
    document.getElementById('summaryMonthFilter').addEventListener('change', () => {
      this.renderSummaryTable();
    });
  },

  populateMonthSelects() {
    const selectors = ['summaryMonthFilter', 'schoolMonthSelect'];
    selectors.forEach(id => {
      const sel = document.getElementById(id);
      // summaryMonthFilter 已有「全部月份」option
      CONFIG.VALID_MONTHS.forEach(m => {
        const opt = document.createElement('option');
        opt.value       = m;
        opt.textContent = m;
        sel.appendChild(opt);
      });
    });
    // 預設選當月
    const currentMonth = Auth.getCurrentMonth();
    const schoolSel = document.getElementById('schoolMonthSelect');
    if ([...schoolSel.options].some(o => o.value === currentMonth)) {
      schoolSel.value = currentMonth;
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.getElementById('panelSummary').classList.toggle('hidden', tab !== 'summary');
    document.getElementById('panelSchool').classList.toggle('hidden',  tab !== 'school');
    document.getElementById('tabSummary').classList.toggle('active', tab === 'summary');
    document.getElementById('tabSchool').classList.toggle('active',  tab === 'school');
  },

  // ── 彙整加總 ──────────────────────────────────────────

  async loadSummary() {
    document.getElementById('summaryLoading').classList.remove('hidden');
    document.getElementById('summaryContent').classList.add('hidden');

    const result = await API.getSummary();
    document.getElementById('summaryLoading').classList.add('hidden');

    if (!result.success) {
      document.getElementById('summaryLoading').textContent = result.message || '載入失敗';
      document.getElementById('summaryLoading').classList.remove('hidden');
      return;
    }

    this.summaryData = result.data || {};
    this.renderSummaryTable();
  },

  renderSummaryTable() {
    const filterMonth = document.getElementById('summaryMonthFilter').value;
    const months = filterMonth
      ? [filterMonth]
      : CONFIG.VALID_MONTHS.filter(m => this.summaryData[m]);

    // 表頭
    const thead = document.getElementById('summaryTableHead');
    thead.innerHTML = '';
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>欄位代號</th><th>說明</th>' +
      months.map(m => `<th>${m}</th>`).join('');
    thead.appendChild(headerRow);

    // 表身
    const tbody = document.getElementById('summaryTableBody');
    tbody.innerHTML = '';
    CONFIG.KPI_ROWS.forEach(key => {
      const tr = document.createElement('tr');
      const isTotalRow = ['2-1','3-1','4-1'].includes(key);
      if (isTotalRow) tr.className = 'total-row';
      const cells = months.map(m => {
        const val = (this.summaryData[m] && this.summaryData[m][key]) || 0;
        return `<td class="text-right">${Number(val).toLocaleString()}</td>`;
      }).join('');
      tr.innerHTML = `<td><span class="kpi-code">${key}</span></td><td>${CONFIG.KPI_LABELS[key]}</td>${cells}`;
      tbody.appendChild(tr);
    });

    document.getElementById('summaryContent').classList.remove('hidden');
  },

  // ── 各校資料 ──────────────────────────────────────────

  async loadSchoolData() {
    const sid   = document.getElementById('schoolSelect').value;
    const month = document.getElementById('schoolMonthSelect').value;

    document.getElementById('schoolDataCard').classList.add('hidden');
    document.getElementById('editCard').classList.add('hidden');
    document.getElementById('schoolNoData').classList.add('hidden');
    document.getElementById('schoolLoading').classList.remove('hidden');

    const result = await API.adminGetKPI(sid, month);
    document.getElementById('schoolLoading').classList.add('hidden');

    if (!result.success) {
      document.getElementById('schoolNoData').textContent = result.message || '載入失敗';
      document.getElementById('schoolNoData').classList.remove('hidden');
      return;
    }

    if (!result.data) {
      document.getElementById('schoolNoData').textContent = '該校本月尚未填寫資料。';
      document.getElementById('schoolNoData').classList.remove('hidden');
      return;
    }

    this.currentSchoolData = result.data;
    this.renderSchoolTable(sid, month, result.data);
  },

  renderSchoolTable(sid, month, data) {
    const tbody = document.getElementById('schoolTableBody');
    tbody.innerHTML = '';

    CONFIG.KPI_ROWS.forEach(key => {
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

    document.getElementById('schoolDataTitle').textContent =
      `${CONFIG.SCHOOL_NAMES[sid]}（${sid}）— ${month}`;
    document.getElementById('schoolSubmittedAt').textContent =
      data.submitted_at ? `最後送出時間：${data.submitted_at}` : '';
    document.getElementById('schoolDataCard').classList.remove('hidden');
  },

  // ── 修正資料 ──────────────────────────────────────────

  openEdit() {
    const sid   = document.getElementById('schoolSelect').value;
    const month = document.getElementById('schoolMonthSelect').value;
    const data  = this.currentSchoolData || {};

    document.getElementById('editTitle').textContent =
      `修正資料 — ${CONFIG.SCHOOL_NAMES[sid]}（${month}）`;

    const grid = document.getElementById('editGrid');
    grid.innerHTML = '';
    CONFIG.KPI_ROWS.forEach(key => {
      const div = document.createElement('div');
      div.className = 'kpi-item';
      div.innerHTML = `
        <label for="edit_${key.replace('-','_')}">
          <span class="kpi-code">${key}</span> ${CONFIG.KPI_LABELS[key]}
        </label>
        <input type="number" id="edit_${key.replace('-','_')}"
               name="${key}" min="0"
               value="${Number(data[key] || 0)}">
      `;
      grid.appendChild(div);
    });

    document.getElementById('editError').classList.add('hidden');
    document.getElementById('editSuccess').classList.add('hidden');
    document.getElementById('editCard').classList.remove('hidden');
    document.getElementById('editCard').scrollIntoView({ behavior: 'smooth' });
  },

  cancelEdit() {
    document.getElementById('editCard').classList.add('hidden');
  },

  async submitEdit() {
    const sid   = document.getElementById('schoolSelect').value;
    const month = document.getElementById('schoolMonthSelect').value;
    const errEl = document.getElementById('editError');
    const sucEl = document.getElementById('editSuccess');
    const btn   = document.getElementById('editSubmitBtn');

    errEl.classList.add('hidden');
    sucEl.classList.add('hidden');

    const kpi = {};
    CONFIG.KPI_ROWS.forEach(key => {
      const id = 'edit_' + key.replace('-', '_');
      kpi[key] = parseInt(document.getElementById(id).value, 10) || 0;
    });

    // 加總驗證
    let hasError = false;
    CONFIG.VALIDATION_GROUPS.forEach(group => {
      const totalVal = kpi[group.total];
      const partsSum = group.parts.reduce((s, k) => s + kpi[k], 0);
      if (totalVal !== partsSum) {
        errEl.textContent =
          `${group.label}（${group.total}）= ${totalVal}，但 ${group.parts.join(' + ')} = ${partsSum}，數值不一致。`;
        errEl.classList.remove('hidden');
        hasError = true;
      }
    });
    if (hasError) return;

    btn.disabled    = true;
    btn.textContent = '儲存中…';

    const result = await API.adminSubmitKPI(sid, month, kpi);

    btn.disabled    = false;
    btn.textContent = '儲存修正';

    if (result.success) {
      sucEl.textContent = `✓ ${result.message}`;
      sucEl.classList.remove('hidden');
      this.currentSchoolData = { ...kpi };
      this.renderSchoolTable(sid, month, this.currentSchoolData);
      // 重新載入 summary
      await this.loadSummary();
      document.getElementById('editCard').classList.add('hidden');
    } else {
      errEl.textContent = result.message || '儲存失敗';
      errEl.classList.remove('hidden');
    }
  }
};

Admin.init();
