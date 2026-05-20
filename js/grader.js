// ===========================================================
// grader.js — 作文评分引擎（本地兜底）
// 返回完整字段，包括 redpenMarkup
// ===========================================================
const Grader = {
  async grade(text, gradeLevel, onStep) {
    // 如果有 gradeResult（来自 API），优先用
    if (App.state.gradingResult) {
      const r = App.state.gradingResult;
      // 补全缺失字段
      if (!r.redpenMarkup) r.redpenMarkup = this.buildRedpenMarkup(text, r.errors || [], r.rewrites || []);
      if (!r.gradeLevel) r.gradeLevel = this.getLevelLabel(gradeLevel);
      if (!r.originalText) r.originalText = text;
      return r;
    }

    // 否则本地分析
    return this.analyze(text, gradeLevel);
  },

  getGradeInfo(gradeLevel) {
    const rules = {
      p3: { baseScore: 35, minChars: 250, idealChars: 400, expectPara: 3, label: '小学三年级' },
      p4: { baseScore: 35, minChars: 300, idealChars: 450, expectPara: 3, label: '小学四年级' },
      p5: { baseScore: 35, minChars: 350, idealChars: 500, expectPara: 4, label: '小学五年级' },
      p6: { baseScore: 35, minChars: 400, idealChars: 550, expectPara: 4, label: '小学六年级' },
      m1: { baseScore: 30, minChars: 500, idealChars: 700, expectPara: 4, label: '初中一年级' },
      m2: { baseScore: 30, minChars: 600, idealChars: 800, expectPara: 5, label: '初中二年级' },
      m3: { baseScore: 30, minChars: 600, idealChars: 800, expectPara: 5, label: '初中三年级' },
    };
    return rules[gradeLevel] || rules.m1;
  },

  getLevelLabel(gradeLevel) {
    return this.getGradeInfo(gradeLevel).label;
  },

  analyze(text, gradeLevel) {
    const info = this.getGradeInfo(gradeLevel);
    const displayLabel = info.label;
    const chars = text.replace(/[\s\n\r]/g, '');
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    const errors = this.detectErrors(text);
    const details = [];

    details.push({ item: '基础分（' + displayLabel + '）', score: '+' + info.baseScore });

    let wordScore = 0;
    if (chars.length >= info.idealChars) wordScore = 10;
    else if (chars.length >= info.minChars + 80) wordScore = 7;
    else if (chars.length >= info.minChars) wordScore = 4;
    else wordScore = 0;
    details.push({ item: '字数（' + chars.length + '字 / 青岛要求' + info.minChars + '字）', score: wordScore > 0 ? '+' + wordScore : '0' });

    const expectedPara = info.expectPara;
    let paraScore = 0;
    if (paragraphs.length >= expectedPara + 2) paraScore = 5;
    else if (paragraphs.length >= expectedPara + 1) paraScore = 4;
    else if (paragraphs.length >= expectedPara) paraScore = 2;
    else paraScore = 0;
    details.push({ item: '段落（' + paragraphs.length + '段 / 要求' + expectedPara + '段）', score: paraScore > 0 ? '+' + paraScore : '0' });

    let sentenceScore = 0;
    if (sentences.length > 10) sentenceScore = 4;
    else if (sentences.length > 7) sentenceScore = 3;
    else if (sentences.length > 4) sentenceScore = 1;
    details.push({ item: '句式丰富度', score: sentenceScore > 0 ? '+' + sentenceScore : '0' });

    let advScore = 0;
    if (text.includes('"') || text.includes('\u201c')) advScore += 2;
    if (text.includes('！') || text.includes('？')) advScore += 1;
    if (text.includes('……') || text.includes('——')) advScore += 2;
    if (text.includes('仿佛') || text.includes('好像') || text.includes('犹如')) advScore += 2;
    details.push({ item: '修辞与表达技巧', score: advScore > 0 ? '+' + advScore : '0' });

    const errorDeduction = errors.length * 4;
    if (errorDeduction > 0) details.push({ item: '错别字扣分（' + errors.length + '处×4分）', score: '-' + errorDeduction });
    else details.push({ item: '错别字', score: '0' });

    let score = Math.max(30, Math.min(98, info.baseScore + wordScore + paraScore + sentenceScore + advScore - errorDeduction));

    let grade = score >= 88 ? '优秀' : score >= 74 ? '良好' : score >= 60 ? '中等' : score >= 45 ? '及格' : '仍需努力';
    const tags = score >= 80 ? ['结构清晰','语言生动','立意深刻'] : score >= 65 ? ['结构清晰','用词准确'] : ['情感真挚','观点鲜明'];

    const comment = '总分 ' + score + '（' + displayLabel + '，青岛标准）。' +
      (chars.length < info.minChars ? '字数不足，需加强。' : '字数达标。') +
      (errors.length > 0 ? '发现' + errors.length + '处用字问题。' : '用字准确。') +
      '继续加油。';

    // 构建红色批注 HTML
    const redpenMarkup = this.buildRedpenMarkup(text, errors, []);

    return {
      score,
      grade,
      gradeLevel: displayLabel,
      originalText: text,
      tags,
      details,
      comment,
      errors,
      rewrites: [],
      redpenMarkup
    };
  },

  buildRedpenMarkup(text, errors, rewrites) {
    let markup = text;
    // 错别字标记：红色删除线 + 正确字旁注
    for (const e of errors) {
      markup = markup.replaceAll(e.wrong, '<span class="redpen-error"><span class="wrong-char">' + e.wrong + '</span><span class="correct-char">' + e.correct + '</span></span>');
    }
    // 不通顺句子标记
    for (const r of rewrites) {
      markup = markup.replaceAll(r.original, '<span class="redpen-rewrite">' + r.original + '<span class="rewrite-note">' + (r.issue || '不通顺') + '</span></span>');
    }
    // 换行转为 <br>
    markup = markup.replace(/\n/g, '<br>');
    return markup;
  },

  detectErrors(text) {
    const map = [
      { wrong: '鼓厉', correct: '鼓励', detail: '应为"鼓励"' },
      { wrong: '既使', correct: '即使', detail: '应为"即使"' },
      { wrong: '因该', correct: '应该', detail: '应为"应该"' },
      { wrong: '知到', correct: '知道', detail: '应为"知道"' },
      { wrong: '以经', correct: '已经', detail: '应为"已经"' },
      { wrong: '非长', correct: '非常', detail: '应为"非常"' },
      { wrong: '辛福', correct: '幸福', detail: '应为"幸福"' },
      { wrong: '年令', correct: '年龄', detail: '应为"年龄"' },
      { wrong: '迫不急待', correct: '迫不及待', detail: '应为"迫不及待"' },
      { wrong: '不加思索', correct: '不假思索', detail: '应为"不假思索"' },
      { wrong: '在次', correct: '再次', detail: '应为"再次"' },
      { wrong: '兰天', correct: '蓝天', detail: '应为"蓝天"' },
      { wrong: '另人', correct: '令人', detail: '应为"令人"' },
    ];
    return map.filter(e => text.includes(e.wrong));
  }
};
