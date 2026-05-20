// ===========================================================
// export.js — PDF 导出协调器
// ===========================================================
const ExportPDF = {
  async generate() {
    const btn = document.getElementById('exportPdfBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '生成中...';
    btn.disabled = true;

    try {
      if (typeof jspdf === 'undefined') throw new Error('jsPDF 库加载失败');

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');

      const data = {
        ocrText: App.state.ocrText || '',
        gradeResult: App.state.gradingResult,
        gradeLevel: App.state.gradingResult?.gradeLevel || ''
      };

      if (!data.ocrText) throw new Error('没有作文原文，请先上传图片');

      await PDFEngine.render(pdf, data);
      pdf.save('作文批改-带红笔批注.pdf');
      App.showToast('PDF 已导出');
    } catch (err) {
      console.error(err);
      App.showToast(err.message || '导出失败');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  }
};
