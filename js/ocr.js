// ====== OCR 识别引擎 ======
// 优先使用 Tesseract.js（CDN），失败后使用 canvas 方案
// 绝不再用"模拟范文"欺骗用户
const OCR = {
  async recognize(file, onProgress) {
    App.updateStep(0);

    // 方案一：尝试 Tesseract.js
    try {
      await this.waitForTesseract(15000);
      return await this.recognizeWithTesseract(file, onProgress);
    } catch (tesseractErr) {
      console.warn('Tesseract 不可用:', tesseractErr.message);
    }

    // 方案二：Tesseract 失败，报错告知用户
    throw new Error('OCR 识别引擎加载失败，请检查网络连接（需要访问 jsdelivr CDN）后重试');
  },

  // 等待 Tesseract 加载
  waitForTesseract(timeout) {
    return new Promise((resolve, reject) => {
      if (typeof Tesseract !== 'undefined') { resolve(); return; }
      const start = Date.now();
      const check = () => {
        if (typeof Tesseract !== 'undefined') { resolve(); return; }
        if (Date.now() - start > timeout) {
          reject(new Error('加载超时'));
          return;
        }
        setTimeout(check, 300);
      };
      check();
    });
  },

  // 使用 Tesseract 识别
  async recognizeWithTesseract(file, onProgress) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('识别超时（90秒），请检查网络'));
      }, 90000);

      Tesseract.recognize(
        file,
        'chi_sim+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              if (onProgress) onProgress(m.progress);
              const p = m.progress;
              if (p < 0.25) App.updateStep(0);
              else if (p < 0.5) App.updateStep(1);
              else if (p < 0.75) App.updateStep(2);
              else App.updateStep(3);
            }
          }
        }
      ).then(result => {
        clearTimeout(timeout);
        const text = (result.data.text || '').trim();
        if (!text || text.length < 5) {
          reject(new Error('未能从图片中识别出有效文字。请确保：\n1. 图片清晰无遮挡\n2. 文字正对镜头\n3. 光线充足'));
          return;
        }
        resolve(text);
      }).catch(err => {
        clearTimeout(timeout);
        reject(new Error('识别失败：' + (err.message || '未知错误')));
      });
    });
  }
};
