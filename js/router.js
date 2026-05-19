const Router = {
  pages: {
    home: document.getElementById('page-home'),
    loading: document.getElementById('page-loading'),
    result: document.getElementById('page-result'),
  },

  stack: [],
  currentPage: null,

  go(pageName) {
    const target = this.pages[pageName];
    if (!target) return;

    const prev = this.currentPage;

    if (prev) {
      // 后退动画（home←result）
      const isBack = pageName === 'home' && this.stack.length > 0;
      prev.classList.remove('active', 'page-enter');
      if (isBack) {
        prev.classList.add('page-leave');
      }
    }

    target.classList.remove('page-enter', 'page-leave');
    void target.offsetWidth;
    target.classList.add('active', 'page-enter');
    this.currentPage = target;

    App.state.currentPage = pageName;
    if (pageName === 'home') target.scrollTop = 0;
  }
};
