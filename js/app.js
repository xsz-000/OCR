const App = {
  state: {
    currentPage: 'home',
    uploadedFile: null,
    ocrText: '',
    gradingResult: null,
    gradeLevel: 'm1',
  },

  init() {
    Router.init();
    this.bindEvents();
  },

  bindEvents() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    const uploadCard = document.getElementById('uploadCard');

    uploadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    uploadCard.addEventListener('click', (e) => {
      if (e.target.closest('.btn-primary') || e.target.closest('.grade-option')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFileUpload(file);
    });

    uploadCard.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadCard.classList.add('dragover');
    });

    uploadCard.addEventListener('dragleave', () => {
      uploadCard.classList.remove('dragover');
    });

    uploadCard.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadCard.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleFileUpload(file);
      } else {
        this.showToast('请上传图片文件');
      }
    });

    document.querySelectorAll('.grade-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.grade-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.state.gradeLevel = btn.dataset.grade;
      });
    });

    document.getElementById('backBtn').addEventListener('click', () => Router.go('home'));

    document.getElementById('newEssayBtn').addEventListener('click', () => {
      this.state.uploadedFile = null;
      this.state.ocrText = '';
      this.state.gradingResult = null;
      document.getElementById('fileInput').value = '';
      Router.go('home');
    });

    document.getElementById('exportPdfBtn').addEventListener('click', () => ExportPDF.generate());

    document.getElementById('shareBtn').addEventListener('click', () => this.handleShare());
  },

  async handleFileUpload(file) {
    this.state.uploadedFile = file;
    Router.go('loading');

    try {
      const ocrText = await OCR.recognize(file, (p) => this.updateProgress(p));
      this.state.ocrText = ocrText;

      const result = await Grader.grade(ocrText, this.state.gradeLevel, (step) => this.updateStep(step));
      this.state.gradingResult = result;

      this.renderResult(result);

      setTimeout(() => Router.go('result'), 500);
    } catch (error) {
      console.error(error);
      this.showToast(error.message || '批改失败，请重试');
      setTimeout(() => Router.go('home'), 1200);
    }
  },

  updateProgress(progress) {
    const fill = document.getElementById('loadingProgressFill');
    const text = document.getElementById('loadingProgressText');
    const pct = Math.min(Math.round(progress * 100), 100);
    if (fill) fill.style.width = pct + '%';
    if (text) text.textContent = pct + '%';
  },

  updateStep(step) {
    const steps = document.querySelectorAll('.loading-step');
    steps.forEach((el, i) => {
      el.classList.remove('active', 'done');
      if (i < step) el.classList.add('done');
      else if (i === step) el.classList.add('active');
    });
  },

  renderResult(result) {
    document.getElementById('scoreValue').textContent = result.score;
    document.getElementById('scoreGrade').textContent = result.grade + '（' + result.gradeLevel + '）';

    const ring = document.getElementById('scoreRing');
    const circ = 2 * Math.PI * 48;
    const offset = circ - (result.score / 100) * circ;
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ;
    requestAnimationFrame(() => {
      ring.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(0.32, 0.72, 0, 1)';
      ring.style.strokeDashoffset = offset;
    });

    const tagsEl = document.getElementById('scoreTags');
    tagsEl.innerHTML = result.tags.map(t => '<span class="tag">' + t + '</span>').join('');

    document.getElementById('commentText').textContent = result.comment;

    const detailsEl = document.getElementById('scoreDetails');
    if (result.details && result.details.length > 0) {
      detailsEl.innerHTML = result.details.map(d => {
        const isMinus = d.score.startsWith('-');
        const isZero = d.score === '0';
        return '<div class="detail-row">' +
          '<span class="detail-label">' + d.item + '</span>' +
          '<span class="detail-score ' + (isMinus ? 'detail-minus' : isZero ? 'detail-zero' : 'detail-plus') + '">' + d.score + '</span>' +
        '</div>';
      }).join('');
    }

    const errorsEl = document.getElementById('errorsList');
    if (result.errors && result.errors.length > 0) {
      errorsEl.innerHTML = result.errors.map(e =>
        '<div class="error-item">' +
          '<div class="error-char">' +
            '<span class="wrong">' + e.wrong + '</span>' +
            '<span class="arrow">\u2192</span>' +
            '<span class="correct">' + e.correct + '</span>' +
          '</div>' +
          '<div class="error-detail">' + e.detail + '</div>' +
        '</div>'
      ).join('');
    } else {
      errorsEl.innerHTML = '<p style="color:var(--green);font-size:14px;">没有发现用字问题</p>';
    }

    document.getElementById('redpenMarkup').innerHTML = result.redpenMarkup;

    // === 手写改写批注 ===
    const rewriteList = document.getElementById('rewriteList');
    if (result.rewrites && result.rewrites.length > 0) {
      document.getElementById('rewriteCard').style.display = '';
      rewriteList.innerHTML = result.rewrites.map(r =>
        '<div class="rewrite-item">' +
          '<div class="rewrite-original"><span class="rewrite-label">原文</span><span>' + App.escapeHtml(r.original) + '</span></div>' +
          '<div class="rewrite-handwrite"><span class="rewrite-label">\u270d\ufe0f 改写</span><span class="handwrite-text">' + App.escapeHtml(r.rewrite) + '</span></div>' +
          (r.issue ? '<div class="rewrite-issue">' + r.issue + '</div>' : '') +
        '</div>'
      ).join('');
    } else {
      document.getElementById('rewriteCard').style.display = 'none';
    }
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  handleShare() {
    this.triggerHaptic();
    if (navigator.share) {
      navigator.share({
        title: 'AI 作文批改 - 教师助手',
        text: '学生作文得分：' + (this.state.gradingResult?.score || '?') + '分',
      }).catch(() => {});
    } else {
      this.showToast('链接已复制');
    }
  },

  showToast(msg) {
    const old = document.querySelector('.toast');
    if (old) {
      old.classList.add('out');
      setTimeout(() => old.remove(), 350);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 350);
    }, 2500);
  },

  triggerHaptic() {
    try {
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(8);
      }
    } catch (e) {}
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
