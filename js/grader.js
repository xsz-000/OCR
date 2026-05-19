const Grader = {
  gradeStandards: {
    p3: { label: '小学三年级', baseScore: 74, minChars: 120, idealChars: 300, expectPara: 2 },
    p4: { label: '小学四年级', baseScore: 72, minChars: 160, idealChars: 400, expectPara: 2 },
    p5: { label: '小学五年级', baseScore: 70, minChars: 220, idealChars: 500, expectPara: 3 },
    p6: { label: '小学六年级', baseScore: 68, minChars: 280, idealChars: 600, expectPara: 3 },
    m1: { label: '初中一年级', baseScore: 66, minChars: 350, idealChars: 700, expectPara: 3 },
    m2: { label: '初中二年级', baseScore: 64, minChars: 400, idealChars: 800, expectPara: 4 },
    m3: { label: '初中三年级', baseScore: 62, minChars: 500, idealChars: 1000, expectPara: 4 },
  },
  gradeMapping: { p3: 'p4', p4: 'p5', p5: 'p6', p6: 'm1', m1: 'm2', m2: 'm3', m3: 'm3' },

  async grade(text, gradeLevel, onStep) {
    const actualKey = this.gradeMapping[gradeLevel] || gradeLevel;
    const info = this.gradeStandards[actualKey] || this.gradeStandards.m1;
    const displayLabel = this.gradeStandards[gradeLevel]?.label || info.label;
    await sleep(300); if (onStep) onStep(0);
    await sleep(400); if (onStep) onStep(1);
    await sleep(500); if (onStep) onStep(2);
    await sleep(400); if (onStep) onStep(3);
    await sleep(200);
    return this.analyze(text, info, displayLabel);
  },

  analyze(text, info, displayLabel) {
    const chars = text.replace(/[\s\n\r]/g, '');
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    const details = [];

    details.push({ item: '基础分（' + displayLabel + '）', score: '+' + info.baseScore });
    let wordScore = 0;
    if (chars.length >= info.idealChars) wordScore = 10;
    else if (chars.length >= info.minChars + 80) wordScore = 7;
    else if (chars.length >= info.minChars) wordScore = 4;
    else if (chars.length >= info.minChars - 50) wordScore = 2;
    details.push({ item: '字数（' + chars.length + '字 / 青岛要求' + info.minChars + '字以上）', score: wordScore > 0 ? '+' + wordScore : '0' });
    const expectedPara = info.expectPara;
    let paraScore = 0;
    if (paragraphs.length >= expectedPara + 2) paraScore = 5;
    else if (paragraphs.length >= expectedPara + 1) paraScore = 4;
    else if (paragraphs.length >= expectedPara) paraScore = 2;
    details.push({ item: '段落结构（' + paragraphs.length + '段 / 青岛要求' + expectedPara + '段以上）', score: paraScore > 0 ? '+' + paraScore : '0' });
    let sentenceScore = 0;
    if (sentences.length > 10) sentenceScore = 4;
    else if (sentences.length > 7) sentenceScore = 3;
    else if (sentences.length > 4) sentenceScore = 1;
    details.push({ item: '句式丰富度', score: sentenceScore > 0 ? '+' + sentenceScore : '0' });
    let advancedScore = 0;
    if (text.includes('"') || text.includes('\u201c')) advancedScore += 2;
    if (text.includes('！') || text.includes('？')) advancedScore += 1;
    if (text.includes('……') || text.includes('——')) advancedScore += 2;
    if (text.includes('仿佛') || text.includes('好像') || text.includes('犹如')) advancedScore += 2;
    details.push({ item: '修辞与表达技巧', score: advancedScore > 0 ? '+' + advancedScore : '0' });
    const errors = this.detectErrors(text);
    const errorDeduction = errors.length * 4;
    if (errorDeduction > 0) details.push({ item: '错别字扣分（' + errors.length + '处×4分）', score: '-' + errorDeduction });
    else details.push({ item: '错别字', score: '0' });
    let score = info.baseScore + wordScore + paraScore + sentenceScore + advancedScore - errorDeduction;
    score = Math.max(30, Math.min(98, score));
    let grade = '';
    if (score >= 92) grade = '优秀';
    else if (score >= 82) grade = '良好';
    else if (score >= 70) grade = '中等';
    else if (score >= 58) grade = '及格';
    else grade = '仍需努力';
    const tagPool = ['结构清晰', '语言生动', '立意深刻', '用词准确', '情感真挚', '想象丰富', '观点鲜明', '过渡自然', '中心突出', '详略得当', '首尾呼应', '卷面整洁'];
    const tags = [];
    if (paragraphs.length >= 2) tags.push(tagPool[0]);
    if (score >= 75) tags.push(tagPool[1]);
    if (score >= 80) tags.push(tagPool[2]);
    if (errors.length === 0) tags.push(tagPool[3]);
    if (tags.length === 0) tags.push(tagPool[6]);
    if (tags.length < 2) tags.push(tagPool[4]);

    const rewrites = this.detectAndRewrite(text, info, displayLabel);

    return {
      score, grade, gradeLevel: displayLabel, tags: tags.slice(0, 3),
      details, comment: this.generateComment(text, score, errors, paragraphs, info, displayLabel),
      errors, redpenMarkup: this.generateRedpenMarkup(text, errors, info, displayLabel),
      rewrites,
    };
  },

  // ====== 拼音 → 汉字映射表 ======
  pinyinMap: {
    hua: '花', xue: '学', xiao: '校', lao: '老', shi: '师',
    tong: '同', zhuo: '桌', peng: '朋', you: '友', jia: '家',
    ren: '人', wo: '我', ni: '你', ta: '他', ta1: '她',
    men: '们', hao: '好', da: '大', xiao: '小', duo: '多',
    shao: '少', chang: '长', duan: '短', gao: '高', di: '低',
    yuan: '远', jin: '近', kuai: '快', man: '慢', xin: '心',
    ai: '爱', le: '乐', ku: '哭', xiao3: '笑', pao: '跑',
    tiao: '跳', zou: '走', kan: '看', shuo: '说', ting: '听',
    chi: '吃', he: '喝', wan: '玩', xie: '写', du: '读',
    shu: '书', bi: '笔', ben: '本', tian: '天', di4: '地',
    feng: '风', yu: '雨', xue3: '雪', yue: '月', ri: '日',
    guang: '光', ming: '明', nian: '年', sui: '岁', shi2: '时',
    fen: '分', miao: '秒', qian: '前', hou: '后', zuo: '左',
    you4: '右', dong: '东', xi: '西', nan: '南', bei: '北',
    chun: '春', xia: '夏', qiu: '秋', dong1: '冬', shan: '山',
    shui: '水', huo: '火', tu: '土', mu: '木', jin: '金',
    niao: '鸟', yu2: '鱼', chong: '虫', ma: '马', gou: '狗',
    mao: '猫', niu: '牛', yang: '羊', ji: '鸡', ya: '鸭',
    hua1: '画', ge: '歌', wu: '舞', shi3: '诗', ci: '词',
    wen: '文', zi: '字', ju: '句', duan4: '段', pian: '篇',
    zhen: '真', shan4: '善', mei: '美', de: '的', di3: '地',
    le5: '了', zhe: '着', guo: '过', ba: '吧', ma1: '吗',
    ne: '呢', a: '啊', ya4: '呀', wa: '哇', yo: '哟',
    quan: '全', bu: '部', dou: '都', ye: '也', hai: '还',
    zai: '在', shi4: '是', you3: '有', bu: '不', mei2: '没',
    zhe4: '这', na: '那', shen: '什', me: '么', zen: '怎',
    yang: '样', wei: '为', neng: '能', rang: '让', gei: '给',
    ba3: '把', bei: '被', xiang: '想', yao: '要', hui: '会',
    ke: '可', yi: '以', jiu: '就', cai: '才', zhi: '只',
    dan: '但', er: '而', suo: '所', yi3: '已', jing: '经',
    zheng: '正', zai4: '再', jian: '见', dao: '到', qi: '起',
    lai: '来', qu: '去', shang: '上', xia4: '下', li: '里',
    wai: '外', kai: '开', guan: '关', chu: '出', ru: '入',
  },

  // ====== 检测拼音 ======
  detectPinyin(s) {
    const pinyinRegex = /[a-zA-Z\u0100-\u024F]+[1-4]?/g;
    const matches = s.match(pinyinRegex);
    if (!matches) return null;

    const pinyinWords = matches.filter(m => this.pinyinMap[m.toLowerCase()] || this.pinyinMap[m.toLowerCase().replace(/[1-4]$/, '')]);
    if (pinyinWords.length === 0) return null;

    const pinyinChars = pinyinWords.join('').length;
    const totalChars = s.replace(/\s/g, '').length;
    if (pinyinChars < 2 || (pinyinChars / Math.max(totalChars, 1)) < 0.15) return null;

    let rewrite = s;
    for (const pw of pinyinWords) {
      const key = pw.toLowerCase();
      const han = this.pinyinMap[key] || this.pinyinMap[key.replace(/[1-4]$/, '')];
      if (han) {
        rewrite = rewrite.replace(pw, han);
      }
    }
    return {
      issue: '\u51fa\u73b0\u62fc\u97f3\uff0c\u5e94\u66ff\u6362\u4e3a\u6b63\u786e\u6c49\u5b57',
      rewrite: rewrite
    };
  },

  // ====== 不通顺检测 + 改写引擎 ======
  detectAndRewrite(text, info, displayLabel) {
    const sentences = text.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const results = [];
    const minLen = info.minChars > 250 ? 8 : 5;

    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i].trim();
      if (s.length < minLen) continue;

      // ★ 优先检测拼音
      const pinyinResult = this.detectPinyin(s);
      if (pinyinResult) {
        results.push({ original: s, issue: pinyinResult.issue, rewrite: pinyinResult.rewrite });
        continue;
      }

      let issue = null;
      let rewrite = null;

      const repeatWords = ['\u6211', '\u7136\u540e', '\u89c9\u5f97', '\u975e\u5e38', '\u5f88', '\u771f\u7684', '\u7279\u522b'];
      for (const w of repeatWords) {
        const count = (s.match(new RegExp(w, 'g')) || []).length;
        if (count >= 3) {
          issue = '\u300c' + w + '\u300d\u51fa\u73b0 ' + count + ' \u6b21\uff0c\u7565\u663e\u91cd\u590d';
          rewrite = this.doRewrite(s, w);
          break;
        }
      }
      if (issue) { results.push({ original: s, issue, rewrite }); continue; }

      if (s.length > 60 && !s.includes('\uff0c') && !s.includes(',')) {
        issue = '\u53e5\u5b50\u8fc7\u957f\uff0c\u5efa\u8bae\u6dfb\u52a0\u9017\u53f7\u65ad\u53e5';
        rewrite = this.insertComma(s);
        if (rewrite !== s) { results.push({ original: s, issue, rewrite }); continue; }
      }

      const oralPatterns = [
        { pat: /\u7136\u540e\u5462/g, fix: '\u7136\u540e' },
        { pat: /\u5c31\u662f\u8bf4/g, fix: '\u4e5f\u5c31\u662f\u8bf4' },
        { pat: /\u90a3\u4e2a/g, fix: '' },
        { pat: /\u55ef/g, fix: '' },
        { pat: /\u5176\u5b9e\u5427/g, fix: '\u5176\u5b9e' },
      ];
      for (const op of oralPatterns) {
        if (op.pat.test(s)) {
          issue = '\u53e3\u8bed\u5316\u8868\u8fbe\uff0c\u5efa\u8bae\u4fee\u6539\u4e3a\u4e66\u9762\u8bed';
          rewrite = s.replace(op.pat, op.fix);
          if (rewrite !== s) { results.push({ original: s, issue, rewrite }); break; }
        }
      }
      if (issue) continue;

      if (s.includes('\u56e0\u4e3a') && !s.includes('\u6240\u4ee5') && s.includes('\uff0c')) {
        issue = '\u300c\u56e0\u4e3a\u300d\u7f3a\u5c11\u300c\u6240\u4ee5\u300d\u547c\u5e94\uff0c\u903b\u8f91\u4e0d\u5b8c\u6574';
        rewrite = s.replace('\u56e0\u4e3a', '\u56e0\u4e3a').replace(/\uff0c([^\uff0c]*)$/, '\uff0c\u6240\u4ee5$1');
        if (rewrite !== s) { results.push({ original: s, issue, rewrite }); continue; }
      }

      if (s.length < 10 && !s.includes('\u662f') && !s.includes('\u6709') && !s.includes('\u5728')) {
        issue = '\u53e5\u5b50\u8fc7\u4e8e\u7b80\u77ed\uff0c\u5efa\u8bae\u8865\u5145\u7ec6\u8282';
        rewrite = s + '\uff0c\u8fd9\u4ef6\u4e8b\u7ed9\u4eba\u7559\u4e0b\u4e86\u6df1\u523b\u7684\u5370\u8c61\u3002';
        results.push({ original: s, issue, rewrite });
        continue;
      }
    }
    return results;
  },

  doRewrite(s, word) {
    if (word === '\u6211') return s.replace(/(\u6211)(.*?)(\u6211)/, '$1$2');
    if (word === '\u7136\u540e') return s.replace(/\u7136\u540e/g, '\uff0c').replace(/\uff0c+/g, '\uff0c');
    if (word === '\u975e\u5e38' || word === '\u5f88') return s.replace(/\u975e\u5e38/g, '\u6781\u4e3a').replace(/\u5f88/g, '\u5341\u5206');
    if (word === '\u771f\u7684') return s.replace(/\u771f\u7684/g, '\u786e\u5b9e');
    if (word === '\u7279\u522b') return s.replace(/\u7279\u522b/g, '\u683c\u5916');
    if (word === '\u89c9\u5f97') return s.replace(/\u89c9\u5f97/g, '\u8ba4\u4e3a').replace(/\u8ba4\u4e3a\u8ba4\u4e3a/g, '\u8ba4\u4e3a');
    return s;
  },

  insertComma(s) {
    const insertAfter = ['\u7684', '\u4e86', '\u548c', '\u4e0e', '\u800c', '\u6216'];
    for (const ch of insertAfter) {
      const idx = s.indexOf(ch);
      if (idx > -1 && idx < s.length - 3 && s[idx + 1] !== '\uff0c') {
        return s.slice(0, idx + 1) + '\uff0c' + s.slice(idx + 1);
      }
    }
    return s;
  },

  detectErrors(text) {
    const map = [
      { wrong: '\u9f13\u5389', correct: '\u9f13\u52b1', detail: '\u5e94\u4e3a "\u9f13\u52b1"' },
      { wrong: '\u65e2\u4f7f', correct: '\u5373\u4f7f', detail: '\u5e94\u4e3a "\u5373\u4f7f"' },
      { wrong: '\u56e0\u8be5', correct: '\u5e94\u8be5', detail: '\u5e94\u4e3a "\u5e94\u8be5"' },
      { wrong: '\u77e5\u5230', correct: '\u77e5\u9053', detail: '\u5e94\u4e3a "\u77e5\u9053"' },
      { wrong: '\u4ee5\u7ecf', correct: '\u5df2\u7ecf', detail: '\u5e94\u4e3a "\u5df2\u7ecf"' },
      { wrong: '\u975e\u957f', correct: '\u975e\u5e38', detail: '\u5e94\u4e3a "\u975e\u5e38"' },
      { wrong: '\u8f9b\u798f', correct: '\u5e78\u798f', detail: '\u5e94\u4e3a "\u5e78\u798f"' },
      { wrong: '\u5e74\u4ee4', correct: '\u5e74\u9f84', detail: '\u5e94\u4e3a "\u5e74\u9f84"' },
      { wrong: '\u8feb\u4e0d\u6025\u5f85', correct: '\u8feb\u4e0d\u53ca\u5f85', detail: '\u5e94\u4e3a "\u8feb\u4e0d\u53ca\u5f85"' },
      { wrong: '\u4e0d\u52a0\u601d\u7d22', correct: '\u4e0d\u5047\u601d\u7d22', detail: '\u5e94\u4e3a "\u4e0d\u5047\u601d\u7d22"' },
      { wrong: '\u5728\u6b21', correct: '\u518d\u6b21', detail: '\u5e94\u4e3a "\u518d\u6b21"' },
      { wrong: '\u5170\u5929', correct: '\u84dd\u5929', detail: '\u5e94\u4e3a "\u84dd\u5929"' },
      { wrong: '\u53e6\u4eba', correct: '\u4ee4\u4eba', detail: '\u5e94\u4e3a "\u4ee4\u4eba"' },
    ];
    return map.filter(e => text.includes(e.wrong));
  },

  generateComment(text, score, errors, paragraphs, info, displayLabel) {
    const chars = text.replace(/[\s\n\r]/g, '');
    let c = '\u603b\u5206 ' + score + ' \u5206\uff08' + displayLabel + '\uff0c\u6309\u9752\u5c9b\u8bc4\u5206\u6807\u51c6\uff09\u3002';
    if (chars.length < info.minChars) c += ' \u9752\u5c9b\u8981\u6c42' + info.minChars + '\u5b57\u4ee5\u4e0a\uff0c\u672c\u7bc7\u4ec5' + chars.length + '\u5b57\uff0c\u7bc7\u5e45\u660e\u663e\u4e0d\u8db3\uff0c\u5efa\u8bae\u9f13\u52b1\u5b66\u751f\u5145\u5b9e\u5185\u5bb9\u3002';
    else if (chars.length >= info.idealChars) c += ' \u9752\u5c9b\u8981\u6c42' + info.minChars + '\u5b57\u4ee5\u4e0a\uff0c\u672c\u7bc7' + chars.length + '\u5b57\uff0c\u7bc7\u5e45\u5145\u5b9e\uff0c\u5185\u5bb9\u4e30\u6ee1\u3002';
    else c += ' \u9752\u5c9b\u8981\u6c42' + info.minChars + '\u5b57\u4ee5\u4e0a\uff0c\u672c\u7bc7' + chars.length + '\u5b57\uff0c\u7bc7\u5e45\u8fbe\u6807\u3002';
    if (score >= 82) c += ' \u8bed\u8a00\u8868\u8fbe\u6d41\u7545\u81ea\u7136\uff0c\u80fd\u7075\u6d3b\u8fd0\u7528\u591a\u79cd\u8868\u8fbe\u65b9\u5f0f\uff0c\u4f53\u73b0\u4e86\u8f83\u597d\u7684\u8bed\u6587\u7d20\u517b\u3002';
    else if (score >= 70) c += ' \u8bed\u8a00\u57fa\u672c\u901a\u987a\uff0c\u80fd\u6e05\u695a\u8868\u8fbe\u610f\u601d\uff0c\u5efa\u8bae\u5728\u8bcd\u6c47\u79ef\u7d2f\u548c\u53e5\u5f0f\u53d8\u5316\u4e0a\u591a\u4e0b\u529f\u592b\u3002';
    else if (score >= 58) c += ' \u8bed\u8a00\u8868\u8fbe\u57fa\u672c\u8fbe\u610f\uff0c\u4f46\u9700\u6ce8\u610f\u8bed\u53e5\u901a\u987a\u548c\u8fde\u8d2f\u6027\uff0c\u52a0\u5f3a\u65e5\u5e38\u7ec3\u7b14\u3002';
    else c += ' \u8bed\u8a00\u8868\u8fbe\u9700\u8981\u52a0\u5f3a\uff0c\u5efa\u8bae\u591a\u8bfb\u4f18\u79c0\u8303\u6587\uff0c\u6ce8\u610f\u8bed\u53e5\u7684\u5b8c\u6574\u548c\u901a\u987a\u3002';
    if (errors.length > 0) c += ' \u53d1\u73b0 ' + errors.length + ' \u5904\u7528\u5b57\u95ee\u9898\uff08\u9752\u5c9b\u6807\u51c6\u6bcf\u5904\u62634\u5206\uff0c\u5171\u6263' + (errors.length * 4) + '\u5206\uff09\uff0c\u5df2\u6807\u6ce8\uff0c\u5efa\u8bae\u91cd\u70b9\u7ea0\u6b63\u3002';
    else c += ' \u7528\u5b57\u51c6\u786e\uff0c\u6ca1\u6709\u51fa\u73b0\u9519\u522b\u5b57\uff0c\u503c\u5f97\u8868\u626c\u3002';
    c += ' \u671f\u5f85\u5b66\u751f\u5199\u51fa\u66f4\u4f18\u79c0\u7684\u4f5c\u54c1\u3002';
    return c;
  },

  generateRedpenMarkup(text, errors, info, displayLabel) {
    const p = text.split(/\n+/).filter(s => s.trim().length > 0);
    let m = '<p>';
    if (p.length > 0) {
      m += '\u672c\u7bc7\u4e60\u4f5c<span class="rp-accent">\u5f00\u5934\u70b9\u9898</span>\uff0c\u5207\u9898\u51c6\u786e\u3002';
      if (p.length >= info.expectPara) m += '\u6bb5\u843d\u5212\u5206\u5408\u7406\uff0c\u7b26\u5408\u9752\u5c9b\u4f5c\u6587\u8bc4\u5206\u5bf9\u6bb5\u843d\u7ed3\u6784\u7684\u8981\u6c42\u3002';
      else m += '\u5efa\u8bae\u589e\u52a0\u6bb5\u843d\u5c42\u6b21\uff08\u9752\u5c9b\u8981\u6c42' + info.expectPara + '\u6bb5\u4ee5\u4e0a\uff09\uff0c\u4f7f\u7ed3\u6784\u66f4\u6e05\u6670\u3002';
      if (p.length >= 2) m += '\u4e2d\u95f4\u8bba\u8ff0\u5efa\u8bae\u8865\u5145<span class="rp-underline">\u66f4\u5177\u4f53\u7684\u751f\u6d3b\u4e8b\u4f8b</span>\u6765\u589e\u5f3a\u8bf4\u670d\u529b\u3002';
      if (p.length >= 3) m += '\u7ed3\u5c3e\u90e8\u5206<span class="rp-accent">\u6709\u603b\u7ed3\u5347\u534e\u7684\u610f\u8bc6</span>\uff0c\u7b26\u5408\u9752\u5c9b\u4e2d\u8003\u4f5c\u6587\u7684\u8bc4\u5206\u5bfc\u5411\u3002';
    }
    if (errors.length > 0) m += ' \u6ce8\u610f<span class="rp-underline">"' + errors[0].wrong + '"</span>\u7684\u6b63\u786e\u5199\u6cd5\uff08\u9752\u5c9b\u4e2d\u8003\u9519\u522b\u5b57\u6bcf\u5b57\u62434\u5206\uff09\uff0c\u52a1\u5fc5\u8ba9\u5b66\u751f\u7ea0\u6b63\u3002';
    m += ' \u6574\u4f53\u6765\u770b\uff0c\u8fd9\u662f\u7528\u5fc3\u5b8c\u6210\u7684\u4e00\u7bc7\u4e60\u4f5c\u3002</p>';
    return m;
  }
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
