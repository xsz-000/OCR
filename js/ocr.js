// ===========================================================
// ocr.js — 图片压缩 + DeepSeek 识图 + AI 批改
// ===========================================================
const OCR = {
  async recognize(file, onProgress) {
    App.updateStep(0);
    if (onProgress) onProgress(0.05);

    if (!CONFIG.DEEPSEEK_API_KEY) {
      throw new Error('请先在 js/config.js 中填写 DeepSeek API Key');
    }

    // 1. 压缩图片到 500KB
    const base64 = await this.compressImage(file, 500 * 1024);
    if (onProgress) onProgress(0.2);
    App.updateStep(1);

    // 2. 调用 DeepSeek Vision 识图 + 评分（一次调用完成）
    const result = await this.callDeepSeek(base64, onProgress);
    if (onProgress) onProgress(1);
    App.updateStep(3);

    return result;
  },

  compressImage(file, maxSize) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let quality = 0.92;
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          let { width, height } = img;
          const maxDim = 2048;
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
              resolve(dataUrl.split(',')[1]);
            } else {
              quality -= 0.08;
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

  async callDeepSeek(base64Image, onProgress) {
    if (onProgress) onProgress(0.3);

    const gradeMap = { p3:'小学三年级', p4:'小学四年级', p5:'小学五年级', p6:'小学六年级', m1:'初中一年级', m2:'初中二年级', m3:'初中三年级' };
    const levelName = gradeMap[App.state.gradeLevel] || '初中一年级';

    // 映射到实际评分年级
    const actualGradeMap = { p3:'四年级', p4:'五年级', p5:'六年级', p6:'初一', m1:'初二', m2:'初三', m3:'初三' };
    const actualLevel = actualGradeMap[App.state.gradeLevel] || '初二';

    const systemPrompt = '你是一位青岛初中语文老师，正在批改学生作文。请按以下步骤处理：\n\n第一步：识别图片中的全部手写文字，输出完整的作文原文。务必逐字逐句准确识别，保持段落格式。\n\n第二步：以青岛' + actualLevel + '评分标准进行批改，输出严格的 JSON 格式（不要额外文字，只输出 JSON）。\n\nJSON 格式：\n{\n  \"ocrText\": \"识别的完整作文原文\",\n  \"score\": 总分(0-100),\n  \"grade\": \"优秀|良好|中等|及格|仍需努力\",\n  \"details\": [{\"item\":\"评分项\",\"score\":\"+/-数字\"}],\n  \"tags\": [\"标签1\",\"标签2\",\"标签3\",\"标签4\"],\n  \"comment\": \"详细评语（含具体建议，指出优点和不足）\",\n  \"errors\": [{\"wrong\":\"错别字\",\"correct\":\"正确字\",\"detail\":\"说明\"}],\n  \"rewrites\": [{\"original\":\"原句\",\"rewrite\":\"改写后的句子\",\"issue\":\"问题说明\"}]\n}\n\n要求：\n1. 评分项包括：基础分、字数、段落、句式、修辞、错别字扣分、内容质量\n2. 遇到不通顺的句子直接改写（红色手写批注）\n3. 遇到拼音直接替换为汉字\n4. 错别字标注纠正\n5. 青岛标准：基础分较低、错别字每处扣4分、字数要求高、92分以上才优秀\n6. 标签从：结构清晰、语言生动、修辞丰富、用词准确、句式多变、内容充实、立意深刻、情感真挚、观点鲜明 中选择';

    const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + CONFIG.DEEPSEEK_API_KEY
      },
      body: JSON.stringify({
        model: CONFIG.DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: '请识别这张作文图片并批改' },
            { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + base64Image } }
          ]}
        ],
        max_tokens: 8192,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error('API 调用失败: HTTP ' + response.status + (errText ? ' - ' + errText.slice(0,200) : ''));
    }

    if (onProgress) onProgress(0.7);

    const data = await response.json();
    const content = (data.choices?.[0]?.message?.content || '').trim();

    // 解析 JSON
    let result = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = JSON.parse(content);
      }
    } catch (e) {
      // JSON 解析失败，从文字中提取关键信息
      return {
        text: content,
        gradeResult: null
      };
    }

    return {
      text: result.ocrText || result.text || '',
      gradeResult: result
    };
  }
};
