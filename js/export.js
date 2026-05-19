const ExportPDF = {
  async generate() {
    const btn = document.getElementById('exportPdfBtn');
    const orig = btn.innerHTML;
    btn.innerHTML = '生成中...';
    btn.disabled = true;

    try {
      if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
        throw new Error('PDF 库加载失败');
      }

      const score = document.getElementById('scoreValue').textContent;
      const grade = document.getElementById('scoreGrade').textContent;
      const comment = document.getElementById('commentText').textContent;
      const tags = Array.from(document.querySelectorAll('.tag')).map(t => t.textContent);
      const gradeLevel = App.state.gradingResult?.gradeLevel || '';

      // 评分明细
      let detailsHtml = '';
      document.querySelectorAll('.detail-row').forEach(el => {
        const label = el.querySelector('.detail-label')?.textContent || '';
        const scoreEl = el.querySelector('.detail-score');
        if (label && scoreEl) {
          detailsHtml += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #E8E8ED;font-size:13px;">' +
            '<span style="color:#6E6E73;">' + label + '</span>' +
            '<span style="font-weight:600;color:' + (scoreEl.classList.contains('detail-minus') ? '#FF4D4D' : scoreEl.classList.contains('detail-zero') ? '#A1A1A6' : '#34C759') + ';">' + scoreEl.textContent + '</span>' +
          '</div>';
        }
      });

      // 错别字
      let errHtml = '';
      document.querySelectorAll('.error-item').forEach(el => {
        errHtml += '<div style="display:flex;justify-content:space-between;padding:10px 14px;background:#FFF0F0;border-radius:8px;margin-bottom:8px;font-size:13px;">' + el.innerHTML + '</div>';
      });

      // === 手写改写批注（PDF 红色手写体） ===
      let rewriteHtml = '';
      document.querySelectorAll('.rewrite-item').forEach(el => {
        const original = el.querySelector('.rewrite-original span:last-child')?.textContent || '';
        const handwrite = el.querySelector('.handwrite-text')?.textContent || '';
        const issue = el.querySelector('.rewrite-issue')?.textContent || '';
        if (handwrite) {
          rewriteHtml +=
            '<div style="margin-bottom:12px;padding:10px 14px;background:#FFF5F5;border:1px solid #FFD6D6;border-radius:8px;">' +
              '<div style="font-size:12px;color:#A1A1A6;margin-bottom:4px;">原文：' + original + '</div>' +
              '<div style="font-family:Ma Shan Zheng,QingSongShouXieTi,KaiTi,STKaiti,serif;font-size:15px;color:#CC0000;line-height:1.8;border-left:3px solid #CC0000;padding-left:10px;">' + handwrite + '</div>' +
              (issue ? '<div style="font-size:11px;color:#FF6B6B;margin-top:4px;">' + issue + '</div>' : '') +
            '</div>';
        }
      });

      const c = document.createElement('div');
      c.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:375px;background:white;padding:28px;font-family:-apple-system,PingFang SC,sans-serif;';

      c.innerHTML =
        '<div style="text-align:center;margin-bottom:24px;">' +
          '<h1 style="font-size:20px;font-weight:700;color:#1D1D1F;">批改报告</h1>' +
          '<p style="font-size:12px;color:#A1A1A6;">AI 助教 \u00B7 教师参考</p>' +
        '</div>' +
        '<div style="text-align:center;margin-bottom:16px;font-size:13px;color:#6E6E73;">' +
          '\u5e74\u7ea7\uff1a' + (gradeLevel || '\u672a\u9009\u62e9') +
        '</div>' +
        '<div style="text-align:center;margin-bottom:24px;">' +
          '<div style="font-size:48px;font-weight:700;color:#6C63FF;">' + score + '</div>' +
          '<div style="font-size:13px;color:#A1A1A6;">/ 100</div>' +
          '<div style="font-size:16px;font-weight:600;color:#6C63FF;margin-top:6px;">' + grade + '</div>' +
          '<div style="display:flex;gap:6px;justify-content:center;margin-top:8px;">' +
            tags.map(t => '<span style="background:#F0EEFF;color:#6C63FF;padding:4px 12px;border-radius:60px;font-size:12px;">' + t + '</span>').join('') +
          '</div>' +
        '</div>' +
        (detailsHtml ? '<div style="margin-bottom:20px;"><h3 style="font-size:14px;font-weight:600;color:#1D1D1F;margin-bottom:8px;">\u8bc4\u5206\u660e\u7ec6\uff08\u9752\u5c9b\u6807\u51c6\uff09</h3>' + detailsHtml + '</div>' : '') +
        '<div style="margin-bottom:20px;">' +
          '<h3 style="font-size:14px;font-weight:600;color:#1D1D1F;margin-bottom:8px;">\u8bc4\u8bed</h3>' +
          '<p style="font-size:14px;line-height:1.8;color:#6E6E73;">' + comment + '</p>' +
        '</div>' +
        (errHtml ? '<div style="margin-bottom:20px;"><h3 style="font-size:14px;font-weight:600;color:#1D1D1F;margin-bottom:8px;">\u7528\u5b57\u5206\u6790</h3>' + errHtml + '</div>' : '') +
        (rewriteHtml ? '<div style="margin-bottom:20px;"><h3 style="font-size:14px;font-weight:600;color:#1D1D1F;margin-bottom:8px;color:#CC0000;">\u270d\ufe0f \u624b\u5199\u6539\u5199\u6279\u6ce8</h3>' + rewriteHtml + '</div>' : '') +
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
      pdf.save('\u6279\u6539\u62a5\u544a.pdf');

      App.showToast('PDF \u5df2\u5bfc\u51fa');
    } catch (err) {
      console.error(err);
      App.showToast('\u5bfc\u51fa\u5931\u8d25');
    } finally {
      btn.innerHTML = orig;
      btn.disabled = false;
    }
  }
};

