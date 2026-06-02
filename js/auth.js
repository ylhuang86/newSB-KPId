// =============================================================
//  KPI 填報系統 — 登入 / Session 管理
// =============================================================

const Auth = {
  SESSION_KEY: 'kpi_user',

  // SHA-256 雜湊（使用 Web Crypto API）
  async sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 儲存 session
  setSession(user) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(user));
  },

  // 取得目前 session
  getSession() {
    const raw = sessionStorage.getItem(this.SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  // 清除 session（登出）
  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  // 驗證是否已登入，否則跳轉登入頁
  requireLogin() {
    const user = this.getSession();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  },

  // 驗證是否為管理者
  requireAdmin() {
    const user = this.requireLogin();
    if (user && user.role !== 'admin') {
      alert('此頁面僅限管理者使用');
      window.location.href = 'index.html';
      return null;
    }
    return user;
  },

  // 登入流程
  async login(username, password) {
    const passwordHash = await this.sha256(password);
    const result = await API.call('login', { username, passwordHash });
    if (result.success) {
      this.setSession({
        school_id:   result.school_id,
        school_name: result.school_name,
        role:        result.role,
        username:    username
      });
    }
    return result;
  },

  // 登出
  logout() {
    this.clearSession();
    window.location.href = 'index.html';
  },

  // 取得今天的填報月份（當月 YYYY-MM）
  getCurrentMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  },

  // 判斷今日是否在各校開放填寫期間
  isWithinSubmitWindow() {
    const day = new Date().getDate();
    return day >= CONFIG.OPEN_DAY && day <= CONFIG.CLOSE_DAY;
  }
};
