const ExportPDF = {
  async generate() {
    const btn = document.getElementById('exportPdfBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '\u23F3 生成中...';
    btn.disabled = true;

    try {
      if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        throw new Error('PDF 库加载失败');
      }

      const score = document.getElementById('scoreValue').textContent;
      const grade = document.getElementById('scoreGrade').textContent;
      const comment = document.getElementById('commentText').textContent;
      const tags = Array.from(document.querySelectorAll('.tag')).map(t => t.textContent);

      const c = document.createElement('div');
      c.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:375px;background:white;padding:28px;font-family:-apple-system,PingFang SC,sans-serif;';

      let errHtml = '';
      document.querySelectorAll('.error-item').forEach(el => {
        errHtml += '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:#FFF0F0;border-radius:8px;margin-bottom:8px;font-size:13px;">' + el.innerHTML + '</div>';
      });

      c.innerHTML =
        '<div style="text-align:center;margin-bottom:24px;">' +
          '<h1 style="font-size:20px;font-weight:700;color:#1D1D1F;">批改报告</h1>' +
          '<p style="font-size:12px;color:#A1A1A6;">AI 助教 · 教师参考</p>' +
        '</div>' +
        '<div style="text-align:center;margin-bottom:24px;">' +
          '<div style="font-size:48px;font-weight:700;color:#6C63FF;">' + score + '</div>' +
          '<div style="font-size:13px;color:#A1A1A6;">/ 100</div>' +
          '<div style="font-size:16px;font-weight:600;color:#6C63FF;margin-top:6px;">' + grade + '</div>' +
          '<div style="display:flex;gap:6px;justify-content:center;margin-top:8px;">' +
            tags.map(t => '<span style="background:#F0EEFF;color:#6C63FF;padding:4px 12px;border-radius:60px;font-size:12px;">' + t + '</span>').join('') +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:20px;">' +
          '<h3 style="font-size:14px;font-weight:600;color:#1D1D1F;margin-bottom:8px;">评语</h3>' +
          '<p style="font-size:14px;line-height:1.8;color:#6E6E73;">' + comment + '</p>' +
        '</div>' +
        (errHtml ? '<div style="margin-bottom:20px;"><h3 style="font-size:14px;font-weight:600;color:#1D1D1F;margin-bottom:8px;">用字分析</h3>' + errHtml + '</div>' : '') +
        '<div style="border-top:1px solid #E8E8ED;padding-top:12px;text-align:center;">' +
          '<p style="font-size:10px;color:#A1A1A6;">EssayMind \u00B7 ' + new Date().toLocaleDateString('zh-CN') + '</p>' +
        '</div>';

      document.body.appendChild(c);

      const canvas = await html2canvas(c, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true, logging: false });
      document.body.removeChild(c);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const img = canvas.toDataURL('image/png');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save('批改报告.pdf');

      App.showToast('PDF 已导出');
    } catch (err) {
      console.error(err);
      App.showToast('导出失败');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  }
};





