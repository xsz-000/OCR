// ===========================================================
// pdfEngine.js — 批注坐标映射 + PDF 渲染引擎
// 核心：将 OCR 文字 + 批改数据渲染到 PDF 上
// 输出：带红色手写体批注的作文原文 PDF
// ===========================================================
const PDFEngine = {
  // A4 参数
  PAGE_W: 210,
  PAGE_H: 297,
  MARGIN: 22,
  TOP: 32,
  LINE_H: 10.5,
  CHARS_PER_LINE: 27,  // 每行约27个中文字
  CHAR_W: 0,           // 动态计算

  // 生成完整 PDF
  async render(pdf, data) {
    const { ocrText, gradeResult, gradeLevel } = data;
    this.CHAR_W = (this.PAGE_W - this.MARGIN * 2) / this.CHARS_PER_LINE;

    let pageNum = 1;

    // ====== 第1部分：作文原文 + 红色批注 ======
    this.renderEssayPages(pdf, ocrText, gradeResult, gradeLevel, () => {
      if (pageNum > 1) pdf.addPage();
      pageNum++;
    });

    // ====== 第2部分：评分报告 ======
    pdf.addPage();
    this.renderScoreReport(pdf, gradeResult, gradeLevel);

    return pdf;
  },

  // ====== 渲染作文原文页（带红色批注） ======
  renderEssayPages(pdf, ocrText, gradeResult, gradeLevel, addPage) {
    const margin = this.MARGIN;
    const lineH = this.LINE_H;
    const top = this.TOP;
    const maxW = this.PAGE_W - margin * 2;
    const charW = this.CHAR_W;

    // 标题栏
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(29, 29, 31);
    pdf.text('作文原文', this.PAGE_W / 2, 18, { align: 'center' });

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(161, 161, 166);
    pdf.text(gradeLevel || '', margin, 26);
    pdf.text(new Date().toLocaleDateString('zh-CN'), this.PAGE_W - margin, 26, { align: 'right' });

    // 分页行
    const paragraphs = ocrText.split(/\n+/).filter(p => p.trim().length > 0);
    const allLines = this.breakLines(paragraphs);

    let curY = top;
    const rewrites = gradeResult?.rewrites || [];
    const errors = gradeResult?.errors || [];

    for (let li = 0; li < allLines.length; li++) {
      const lineText = allLines[li];
      if (!lineText) { curY += lineH * 0.5; continue; }
      if (curY + lineH > this.PAGE_H - 18) { addPage(); curY = top; }

      // 作文格横线
      pdf.setDrawColor(225, 225, 230);
      pdf.setLineWidth(0.3);
      pdf.line(margin, curY + lineH - 2, this.PAGE_W - margin, curY + lineH - 2);

      // 原文（浅灰）
      pdf.setFontSize(10.5);
      pdf.setFont('courier', 'normal');
      pdf.setTextColor(80, 80, 85);
      pdf.text(lineText, margin, curY + 7);

      // === 红色批注渲染 ===
      this.renderRewrites(pdf, lineText, rewrites, margin, charW, curY, lineH);
      this.renderErrors(pdf, lineText, errors, margin, charW, curY, lineH);

      curY += lineH;
    }
  },

  // 分行
  breakLines(paragraphs) {
    const lines = [];
    for (const para of paragraphs) {
      const chars = [...para];
      let line = '';
      for (const ch of chars) {
        if (line.length >= this.CHARS_PER_LINE) {
          lines.push(line); line = ch;
        } else { line += ch; }
      }
      if (line.trim()) lines.push(line);
      lines.push('');
    }
    return lines;
  },

  // 渲染改写批注（红色手写体覆盖）
  renderRewrites(pdf, lineText, rewrites, margin, charW, curY, lineH) {
    for (const rw of rewrites) {
      if (!rw.rewrite || rw.rewrite === rw.original) continue;

      // 找改写原文在这一行的匹配位置
      // 支持部分匹配：如果原句跨行，只处理本行内部分
      const origIdx = lineText.indexOf(rw.original);
      const overlapText = rw.rewrite;
      const overlapLen = overlapText.length;

      // 如果完全匹配本行
      if (origIdx === 0 && rw.original.length <= this.CHARS_PER_LINE) {
        const x = margin;
        const w = Math.min(overlapLen, this.CHARS_PER_LINE - origIdx) * charW;

        // 红色背景覆盖原文
        pdf.setFillColor(255, 238, 238);
        pdf.rect(x - 0.5, curY, w + 1, lineH - 2, 'F');

        // 红色手写体改写
        pdf.setFontSize(11);
        pdf.setFont('courier', 'bold');
        pdf.setTextColor(204, 0, 0);
        pdf.text(overlapText.slice(0, this.CHARS_PER_LINE), x, curY + 7);

        // 红色波浪线
        pdf.setDrawColor(204, 0, 0);
        pdf.setLineWidth(0.4);
        const waveY = curY + lineH - 1.5;
        for (let w = 0; w < w; w += 2) {
          if (w + 2 <= w) {
            pdf.line(x + w, waveY, x + w + 1, waveY - 1);
            pdf.line(x + w + 1, waveY - 1, x + w + 2, waveY);
          }
        }

        // 批注原因
        if (rw.issue && w + 2 < this.PAGE_W - this.MARGIN - margin) {
          pdf.setFontSize(6);
          pdf.setTextColor(204, 0, 0);
          pdf.text(rw.issue, x + w + 2, curY + 4);
        }
        continue;
      }

      // 部分匹配（原文横跨两行）
      if (origIdx >= 0 && origIdx < this.CHARS_PER_LINE) {
        const x = margin + origIdx * charW;
        const remain = this.CHARS_PER_LINE - origIdx;
        const w = Math.min(overlapLen, remain) * charW;

        pdf.setFillColor(255, 238, 238);
        pdf.rect(x - 0.5, curY, w + 1, lineH - 2, 'F');

        pdf.setFontSize(11);
        pdf.setFont('courier', 'bold');
        pdf.setTextColor(204, 0, 0);
        pdf.text(overlapText.slice(0, remain), x, curY + 7);

        pdf.setDrawColor(204, 0, 0);
        pdf.setLineWidth(0.4);
        const waveY2 = curY + lineH - 1.5;
        for (let w2 = 0; w2 < w; w2 += 2) {
          if (w2 + 2 <= w) {
            pdf.line(x + w2, waveY2, x + w2 + 1, waveY2 - 1);
            pdf.line(x + w2 + 1, waveY2 - 1, x + w2 + 2, waveY2);
          }
        }
      }
    }
  },

  // 渲染错别字标注（红色删除线 + 正确字）
  renderErrors(pdf, lineText, errors, margin, charW, curY, lineH) {
    for (const err of errors) {
      const idx = lineText.indexOf(err.wrong);
      if (idx === -1) continue;

      const x = margin + idx * charW;
      const w = err.wrong.length * charW;
      const midY = curY + 6;

      // 红色删除线
      pdf.setDrawColor(204, 0, 0);
      pdf.setLineWidth(1.2);
      pdf.line(x, midY, x + w, midY);

      // 红色圆，圈出错误字
      pdf.setDrawColor(204, 0, 0);
      pdf.setLineWidth(0.6);
      pdf.circle(x + w / 2, midY - 1, charW * 0.6, 'S');

      // 正确字写在旁边
      if (x + w + 3 < this.PAGE_W - this.MARGIN) {
        pdf.setFontSize(9);
        pdf.setFont('courier', 'bold');
        pdf.setTextColor(204, 0, 0);
        pdf.text(err.correct, x + w + 2, curY + 4);
      }
    }
  },

  // ====== 评分报告页 ======
  renderScoreReport(pdf, gradeResult, gradeLevel) {
    const margin = this.MARGIN;
    const top = 25;
    const maxW = this.PAGE_W - margin * 2;
    if (!gradeResult) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('评分数据不可用', this.PAGE_W / 2, this.PAGE_H / 2, { align: 'center' });
      return;
    }

    const score = gradeResult.score || 0;
    const grade = gradeResult.grade || '';
    const tags = gradeResult.tags || [];
    const details = gradeResult.details || [];
    const comment = gradeResult.comment || '';

    // 标题
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(29, 29, 31);
    pdf.text('批改报告', this.PAGE_W / 2, 16, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(108, 99, 255);
    pdf.text('年级：' + (gradeLevel || ''), margin, 24);

    // 分数大圆
    const cx = this.PAGE_W / 2;
    const cy = 52;
    pdf.setDrawColor(108, 99, 255);
    pdf.setLineWidth(3);
    pdf.circle(cx, cy, 20, 'S');

    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(108, 99, 255);
    pdf.text(String(score), cx, cy + 5, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(108, 99, 255);
    pdf.text(grade, cx, 82, { align: 'center' });

    // 标签
    let tagX = margin;
    pdf.setFontSize(8);
    for (const tag of tags) {
      const tw = pdf.getTextWidth(' ' + tag + ' ') + 4;
      if (tagX + tw > this.PAGE_W - margin) break;
      pdf.setFillColor(240, 238, 255);
      pdf.roundedRect(tagX, 90, tw, 7, 3, 3, 'F');
      pdf.setTextColor(108, 99, 255);
      pdf.text(' ' + tag + ' ', tagX + 2, 96);
      tagX += tw + 3;
    }

    // 评分明细
    let dy = 105;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(29, 29, 31);
    pdf.text('评分明细', margin, dy);
    dy += 10;

    for (const d of details) {
      if (dy > this.PAGE_H - 25) { pdf.addPage(); dy = 25; }

      const isMinus = d.score.startsWith('-');
      const isTotal = d.item === '总分';

      if (isTotal) {
        dy += 3;
        pdf.setDrawColor(200, 200, 210);
        pdf.setLineWidth(0.3);
        pdf.line(margin, dy, this.PAGE_W - margin, dy);
        dy += 5;
      }

      pdf.setFontSize(isTotal ? 12 : 8.5);
      pdf.setFont('helvetica', isTotal ? 'bold' : 'normal');
      pdf.setTextColor(isTotal ? 29 : 100, isTotal ? 29 : 100, isTotal ? 31 : 105);
      pdf.text(d.item, margin, dy);
      pdf.setTextColor(isMinus ? 204 : 52, isMinus ? 0 : 199, isMinus ? 0 : 89);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(isTotal ? 14 : 9);
      pdf.text(d.score, this.PAGE_W - margin, dy, { align: 'right' });

      dy += isTotal ? 14 : 9;
    }

    // 评语
    if (comment) {
      dy += 6;
      if (dy > this.PAGE_H - 40) { pdf.addPage(); dy = 25; }

      pdf.setDrawColor(200, 200, 210);
      pdf.setLineWidth(0.3);
      pdf.line(margin, dy, this.PAGE_W - margin, dy);
      dy += 8;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(29, 29, 31);
      pdf.text('评语', margin, dy);
      dy += 9;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 105);
      const lines = pdf.splitTextToSize(comment, maxW);
      for (const line of lines) {
        if (dy > this.PAGE_H - 20) { pdf.addPage(); dy = 25; }
        pdf.text(line, margin, dy);
        dy += 5.5;
      }
    }

    // 页脚
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(200, 200, 205);
    pdf.text('EssayMind AI 助教 \u00B7 ' + new Date().toLocaleDateString('zh-CN'), this.PAGE_W / 2, this.PAGE_H - 8, { align: 'center' });
  }
};
