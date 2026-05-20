// ===========================================================
// ocr.js — 图片压缩 + Tesseract.js 纯前端 OCR + 可选 AI 评分
// 不需要任何后端服务，完全在浏览器运行
// ===========================================================
const OCR = {
  async recognize(file, onProgress) {
    App.updateStep(0);
    if (onProgress) onProgress(0.05);

    // 1. 压缩图片
    const base64 = await this.compressImage(file, 800 * 1024);
    if (onProgress) onProgress(0.15);
    App.updateStep(1);

    // 2. Tesseract.js 纯前端 OCR
    const ocrText = await this.runTesseract(base64, onProgress);
    if (onProgress) onProgress(0.6);
    App.updateStep(2);

    if (!ocrText || ocrText.length < 5) {
      throw new Error('未能识别出有效文字。请确保：\n1. 图片清晰无遮挡\n2. 文字正对镜头\n3. 光线充足');
    }

    // 3. DeepSeek 评分（可选）
    let gradeResult = null;
    if (CONFIG.DEEPSEEK_API_KEY) {
      try {
        gradeResult = await this.callDeepSeekForGrade(ocrText, onProgress);
      } catch (e) {
        console.warn('DeepSeek 评分失败，使用本地兜底:', e.message);
      }
    }

    if (onProgress) onProgress(1);
    App.updateStep(3);

    return { text: ocrText, gradeResult };
  },

  compressImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let quality = 0.85;
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let { width, height } = img;
          const maxDim = 1600;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          const tryCompress = () => {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const size = Math.round((dataUrl.length * 3) / 4);
            if (size <= maxSize || quality <= 0.08) {
              resolve(dataUrl);
            } else {
              quality -= 0.1;
              tryCompress();
            }
          };
          tryCompress();
        };
        img.onerror = () => reject(new Error('图片解析失败'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  },

  runTesseract(base64DataUrl, onProgress) {
    return new Promise((resolve, reject) => {
      if (typeof Tesseract === 'undefined') {
        reject(new Error('Tesseract OCR 引擎加载失败，请检查网络连接'));
        return;
      }

      const timeout = setTimeout(() => reject(new Error('OCR 识别超时，请重试')), 120000);

      Tesseract.recognize(base64DataUrl, 'chi_sim', {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(0.15 + m.progress * 0.45);
          }
        }
      }).then(({ data }) => {
        clearTimeout(timeout);
        resolve((data.text || '').trim());
      }).catch(err => {
        clearTimeout(timeout);
        reject(new Error('识别失败: ' + (err.message || '')));
      });
    });
  },

  async callDeepSeekForGrade(ocrText, onProgress) {
    if (onProgress) onProgress(0.7);

    const gradeMap = { p3:'小学三年级', p4:'小学四年级', p5:'小学五年级', p6:'小学六年级', m1:'初中一年级', m2:'初中二年级', m3:'初中三年级' };
    const actualGradeMap = { p3:'四年级', p4:'五年级', p5:'六年级', p6:'初一', m1:'初二', m2:'初三', m3:'初三' };
    const levelName = gradeMap[App.state.gradeLevel] || '初中一年级';
    const actualLevel = actualGradeMap[App.state.gradeLevel] || '初二';

    const prompt = '你是一位青岛初中语文老师。请对以下作文进行批改，只输出 JSON：\n\n作文：\n`\n' + ocrText + '\n`\n\n年级：' + levelName + '（青岛' + actualLevel + '标准评分）\n\nJSON：\n{\n  "score": 0-100,\n  "grade": "优秀|良好|中等|及格|仍需努力",\n  "details": [{"item":"评分项","score":"+/-数字"}],\n  "tags": ["标签1","标签2"],\n  "comment": "评语",\n  "errors": [{"wrong":"错别字","correct":"正确字","detail":"说明"}],\n  "rewrites": [{"original":"原句","rewrite":"改后","issue":"原因"}]\n}';

    const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.DEEPSEEK_API_KEY
      },
      body: JSON.stringify({
        model: CONFIG.DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: '你是一位严格的青岛初中语文老师，只输出 JSON。' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.1
      })
    });

    if (!response.ok) throw new Error('评分 API 错误: HTTP ' + response.status);
    if (onProgress) onProgress(0.85);

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch (e) {
      return null;
    }
  }
};
