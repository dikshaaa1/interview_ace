const State = {
  set(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  get(key) {
    try {
      return JSON.parse(sessionStorage.getItem(key));
    } catch {
      return null;
    }
  },
  clear() {
    sessionStorage.clear();
  },
};
