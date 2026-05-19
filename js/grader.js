const Grader = {
  async grade(text, onStep) {
    await sleep(400);
    if (onStep) onStep(0);
    await sleep(500);
    if (onStep) onStep(1);
    await sleep(600);
    if (onStep) onStep(2);
    await sleep(500);
    if (onStep) onStep(3);
    await sleep(300);
    return this.analyze(text);
  },

  analyze(text) {
    const chars = text.replace(/[\s\n\r]/g, '');
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);

    let score = 65;
    if (chars.length > 100) score += 5;
    if (chars.length > 300) score += 8;
    if (chars.length > 500) score += 10;
    if (paragraphs.length >= 3) score += 5;
    if (sentences.length > 5) score += 4;
    if (sentences.length > 10) score += 3;
    if (text.includes('"') || text.includes('\u201c')) score += 3;
    if (text.includes('！') || text.includes('？')) score += 2;

    const errors = this.detectErrors(text);
    score -= errors.length * 3;
    score = Math.max(40, Math.min(98, score));

    let grade = '';
    if (score >= 90) grade = '优秀';
    else if (score >= 80) grade = '良好';
    else if (score >= 70) grade = '中等';
    else if (score >= 60) grade = '及格';
    else grade = '仍需努力';

    const tagPool = ['结构清晰', '语言生动', '立意深刻', '用词准确', '情感真挚', '想象丰富', '观点鲜明', '过渡自然', '中心突出', '详略得当', '首尾呼应'];
    const tags = [];
    if (paragraphs.length >= 3) tags.push(tagPool[0]);
    if (score >= 75) tags.push(tagPool[1]);
    if (score >= 80) tags.push(tagPool[2]);
    if (errors.length === 0) tags.push(tagPool[3]);
    if (tags.length === 0) tags.push(tagPool[6]);
    if (tags.length < 2) tags.push(tagPool[4]);

    return {
      score,
      grade,
      tags: tags.slice(0, 3),
      comment: this.generateComment(text, score, errors, paragraphs),
      errors,
      redpenMarkup: this.generateRedpenMarkup(text, errors),
    };
  },

  detectErrors(text) {
    const map = [
      { wrong: '鼓厉', correct: '鼓励', detail: '应为 "鼓励"' },
      { wrong: '既使', correct: '即使', detail: '应为 "即使"' },
      { wrong: '因该', correct: '应该', detail: '应为 "应该"' },
      { wrong: '知到', correct: '知道', detail: '应为 "知道"' },
      { wrong: '以经', correct: '已经', detail: '应为 "已经"' },
      { wrong: '非长', correct: '非常', detail: '应为 "非常"' },
      { wrong: '辛福', correct: '幸福', detail: '应为 "幸福"' },
      { wrong: '年令', correct: '年龄', detail: '应为 "年龄"' },
      { wrong: '迫不急待', correct: '迫不及待', detail: '应为 "迫不及待"' },
      { wrong: '不加思索', correct: '不假思索', detail: '应为 "不假思索"' },
    ];
    return map.filter(e => text.includes(e.wrong));
  },

  generateComment(text, score, errors, paragraphs) {
    let c = '';
    if (text.length < 100) {
      c = '本篇习作篇幅较短，建议鼓励学生进一步展开论述。';
    } else {
      c = '本篇习作结构清晰，段落层次分明。';
    }
    if (score >= 80) {
      c += ' 语言表达流畅自然，能够运用多种表达方式。';
    } else if (score >= 60) {
      c += ' 语言基本通顺，建议鼓励学生尝试更多样的词汇和句式。';
    } else {
      c += ' 建议在语言表达方面加强练习，注意语句的通顺和连贯。';
    }
    if (errors.length > 0) {
      c += ' 发现 ' + errors.length + ' 处用字问题，已标注。';
    } else {
      c += ' 用字准确，没有发现错别字，值得表扬。';
    }
    c += ' 期待看到更多优秀的作品。';
    return c;
  },

  generateRedpenMarkup(text, errors) {
    const p = text.split(/\n+/).filter(s => s.trim().length > 0);
    let m = '<p>';
    if (p.length > 0) {
      m += '本篇习作<span class="rp-accent">开头点题</span>，切题准确。';
      if (p.length >= 2) {
        m += '中间段落建议补充<span class="rp-underline">更具体的事例</span>来支撑观点。';
      }
      if (p.length >= 3) {
        m += '结尾部分<span class="rp-accent">有升华意识</span>，值得肯定。';
      }
    }
    if (errors.length > 0) {
      m += ' 注意<span class="rp-underline">"' + errors[0].wrong + '"</span>的正确写法，建议引导学生纠正。';
    }
    m += ' 整体来看，这是一篇不错的习作。</p>';
    return m;
  }
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
