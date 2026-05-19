const Router = {
  pages: null,
  currentPage: null,

  init() {
    this.pages = {
      home: document.getElementById('page-home'),
      loading: document.getElementById('page-loading'),
      result: document.getElementById('page-result'),
    };
    // 初始状态：home 已 active
    this.currentPage = this.pages.home;
  },

  go(pageName) {
    if (!this.pages) this.init();
    const target = this.pages[pageName];
    if (!target || target === this.currentPage) return;

    const prev = this.currentPage;

    if (prev) {
      prev.classList.remove('active', 'page-enter');
    }

    target.classList.remove('page-enter', 'page-leave');
    // 强制回流确保动画重新触发
    void target.offsetWidth;
    target.classList.add('active', 'page-enter');
    this.currentPage = target;

    if (App && App.state) App.state.currentPage = pageName;
    if (pageName === 'home') target.scrollTop = 0;
  }
};
