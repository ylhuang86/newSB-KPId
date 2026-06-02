// =============================================================
//  KPI 填報系統 — API 呼叫層
// =============================================================

const API = {
  TIMEOUT_MS: 30000,

  // 核心呼叫
  async call(action, params = {}) {
    if (CONFIG.APPS_SCRIPT_URL === 'YOUR_SCRIPT_URL_HERE') {
      console.warn('Apps Script URL 尚未設定，請更新 js/config.js');
      return { success: false, message: 'API 網址尚未設定，請聯絡系統管理者' };
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' }, // Apps Script CORS 要求
        body:    JSON.stringify({ action, ...params }),
        signal:  controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, message: `伺服器回應異常（HTTP ${response.status}）` };
      }

      const data = await response.json();
      return data;

    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { success: false, message: '請求逾時（30 秒），請檢查網路後重試' };
      }
      return { success: false, message: '網路錯誤：' + err.message };
    }
  },

  // --- 各校端點 ---

  login(username, passwordHash) {
    return this.call('login', { username, passwordHash });
  },

  submitKPI(schoolId, month, kpi) {
    return this.call('submitKPI', { school_id: schoolId, month, kpi });
  },

  getKPI(schoolId, month) {
    return this.call('getKPI', { school_id: schoolId, month });
  },

  changePassword(username, oldPasswordHash, newPasswordHash) {
    return this.call('changePassword', { username, oldPasswordHash, newPasswordHash });
  },

  // --- 管理者端點 ---

  adminGetKPI(schoolId, month) {
    return this.call('adminGetKPI', { school_id: schoolId, month });
  },

  adminSubmitKPI(schoolId, month, kpi) {
    return this.call('adminSubmitKPI', { school_id: schoolId, month, kpi });
  },

  getSummary(month = null) {
    return this.call('getSummary', month ? { month } : {});
  }
};
