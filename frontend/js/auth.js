(function () {
  'use strict';

  const TOKEN_KEY = 'ia_token';
  const USER_KEY  = 'ia_user';

  const Auth = {
    setSession(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    clearSession() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },

    getUser() {
      try { return JSON.parse(localStorage.getItem(USER_KEY)); }
      catch { return null; }
    },

    isLoggedIn() {
      return !!this.getToken();
    },

    authHeaders() {
      const t = this.getToken();
      return t ? { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    },

    guard(redirectTo) {
      if (!this.isLoggedIn()) {
        window.location.href = redirectTo || '/login.html';
        return false;
      }
      return true;
    },

    logout() {
      this.clearSession();
      window.location.href = '/login.html';
    },
  };

  window.Auth = Auth;
})();
