// =============================================================
//  KPI 填報系統 — 表單邏輯
// =============================================================

(async function() {
  const user = Auth.requireLogin();
  if (!user) return;

  const month = Auth.getCurrentMonth();

  // 更新導覽列
  document.getElementById('navSchoolName').textContent = user.school_name;
  document.getElementById('pageTitle').textContent = `KPI 填寫表單 — ${user.school_name}`;
  document.getElementById('pageSubtitle').textContent = `填報月份：${month}`;

  // 開放期間判斷
  const windowAlert = document.getElementById('windowAlert');
  const submitBtn   = document.getElementById('submitBtn');
  const isOpen      = Auth.isWithinSubmitWindow();
  const today       = new Date().getDate();

  if (today < CONFIG.OPEN_DAY) {
    windowAlert.textContent = `本月填寫尚未開放，開放時間為每月 ${CONFIG.OPEN_DAY} 日起。`;
    windowAlert.className = 'alert alert-warning';
    windowAlert.classList.remove('hidden');
    submitBtn.disabled = true;
  } else if (today > CONFIG.CLOSE_DAY) {
    windowAlert.textContent = `本月填寫已截止（截止時間：每月 ${CONFIG.CLOSE_DAY} 日 23:59）。`;
    windowAlert.className = 'alert alert-error';
    windowAlert.classList.remove('hidden');
    submitBtn.disabled = true;
  } else {
    windowAlert.textContent = `填寫開放中`; //，截止時間：本月 ${CONFIG.CLOSE_DAY} 日 23:59。`;
    windowAlert.className = 'alert alert-info';
    windowAlert.classList.remove('hidden');
  }

  // 數字輸入框：點擊時清除 0，離開時補回整數
  document.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('focus', function() {
      if (this.value === '0') this.value = '';
    });
    input.addEventListener('blur', function() {
      const val = parseInt(this.value, 10);
      this.value = isNaN(val) || val < 0 ? 0 : val;
    });
  });

  // 載入已有資料（若有）
  const existing = await API.getKPI(user.school_id, month);
  if (existing.success && existing.data) {
    const data = existing.data;
    CONFIG.KPI_ROWS.forEach(key => {
      const id  = 'kpi_' + key.replace('-', '_');
      const el  = document.getElementById(id);
      if (el && data[key] !== undefined) el.value = data[key];
    });
    if (data.submitted_at) {
      document.getElementById('lastSubmitted').textContent =
        `上次送出時間：${data.submitted_at}`;
    }
  }

  // 表單送出
  document.getElementById('kpiForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!isOpen) return;

    const errorEl   = document.getElementById('submitError');
    const successEl = document.getElementById('submitSuccess');
    errorEl.classList.add('hidden');
    successEl.classList.add('hidden');

    // 收集數值
    const kpi = {};
    CONFIG.KPI_ROWS.forEach(key => {
      const id = 'kpi_' + key.replace('-', '_');
      kpi[key] = parseInt(document.getElementById(id).value, 10) || 0;
    });

    // 加總驗證
    let hasError = false;
    CONFIG.VALIDATION_GROUPS.forEach(group => {
      const totalVal = kpi[group.total];
      const partsSum = group.parts.reduce((s, k) => s + kpi[k], 0);
      const errEl    = document.getElementById('error_' + group.total.split('-')[0]);
      if (totalVal !== partsSum) {
        errEl.textContent =
          `${group.label}（${group.total}）= ${totalVal}，但 ${group.parts.join(' + ')} = ${partsSum}，數值不一致，請修正後再送出。`;
        errEl.classList.remove('hidden');
        hasError = true;
      } else {
        errEl.classList.add('hidden');
      }
    });

    if (hasError) {
      errorEl.textContent = '請修正上方紅字錯誤後再送出。';
      errorEl.classList.remove('hidden');
      return;
    }

    // 送出
    submitBtn.disabled    = true;
    submitBtn.textContent = '送出中，請稍候…';

    const result = await API.submitKPI(user.school_id, month, kpi);

    submitBtn.disabled    = false;
    submitBtn.textContent = '送出資料';

    if (result.success) {
      successEl.textContent = `✓ ${result.message}`;
      successEl.classList.remove('hidden');
      const now = new Date();
      document.getElementById('lastSubmitted').textContent =
        `上次送出時間：${now.toLocaleString('zh-TW')}`;
    } else {
      errorEl.textContent = result.message || '送出失敗，請稍後再試';
      errorEl.classList.remove('hidden');
    }
  });

})();
