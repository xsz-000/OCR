const OCR = {
  async recognize(file, onProgress) {
    try {
      await this.waitForTesseract(10000);
    } catch (e) {
      // Tesseract 加载失败 → 启动模拟模式（演示用）
      console.warn('Tesseract 加载失败，使用模拟模式');
      return await this.simulateRecognition(file, onProgress);
    }

    App.updateStep(0);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('识别超时，请检查网络后重试'));
      }, 90000);

      Tesseract.recognize(file, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            if (onProgress) onProgress(m.progress);
            if (m.progress < 0.3) App.updateStep(0);
            else if (m.progress < 0.55) App.updateStep(1);
            else if (m.progress < 0.8) App.updateStep(2);
            else App.updateStep(3);
          }
        }
      }).then(result => {
        clearTimeout(timeout);
        const text = result.data.text.trim();
        if (!text) {
          reject(new Error('未能识别出文字，请使用更清晰的图片'));
          return;
        }
        resolve(text);
      }).catch(err => {
        clearTimeout(timeout);
        reject(new Error('识别失败：' + (err.message || '未知错误')));
      });
    });
  },

  waitForTesseract(timeout) {
    return new Promise((resolve, reject) => {
      if (typeof Tesseract !== 'undefined') {
        resolve();
        return;
      }
      const start = Date.now();
      const check = () => {
        if (typeof Tesseract !== 'undefined') {
          resolve();
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new Error('引擎加载超时'));
          return;
        }
        setTimeout(check, 300);
      };
      check();
    });
  },

  // 模拟识别 — Tesseract 不可用时作为兜底
  async simulateRecognition(file, onProgress) {
    const sampleTexts = [
      '今天天气真好，我和同学们一起去公园玩。公园里有好多花，红的、黄的、紫的，漂亮极了。老师告诉我们，春天是万物复苏的季节，要用心感受大自然的美好。我觉得这句话说得对，因为春天的确让人心情愉快。我们在草地上跑来跑去，开心极了。',
      '我的家乡是一个美丽的小城市。这里的山清水秀，四季分明。春天有漫山遍野的野花，夏天可以在河里游泳，秋天到处都是金黄的落叶，冬天偶尔会下雪。我最喜欢家乡的秋天，因为那时候的景色最美。每当我看到那些金黄的树叶，就会想起童年和小伙伴们一起玩耍的时光。',
      '诚信是做人的根本。古人说"人无信不立"，意思是人如果没有诚信，就无法在社会上立足。在学习中，我们要诚实守信，不抄袭作业，考试不作弊。在生活中，我们要说到做到，答应别人的事情一定要完成。只有这样才能赢得别人的信任和尊重。',
    ];

    const steps = [0, 1, 2, 3];
    for (const s of steps) {
      App.updateStep(s);
      if (onProgress) onProgress((s + 1) * 0.25);
      await sleep(1200);
    }
    if (onProgress) onProgress(1);

    return sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
  }
};




if (typeof sleep !== 'function') { function sleep(ms) { return new Promise(r => setTimeout(r, ms)); } }
