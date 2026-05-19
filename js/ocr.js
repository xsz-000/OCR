const OCR = {
  async recognize(file, onProgress) {
    if (typeof Tesseract === 'undefined') {
      throw new Error('识别引擎加载失败，请检查网络');
    }

    App.updateStep(0);

    const result = await Tesseract.recognize(file, 'chi_sim+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          if (onProgress) onProgress(m.progress);
          if (m.progress < 0.3) App.updateStep(0);
          else if (m.progress < 0.55) App.updateStep(1);
          else if (m.progress < 0.8) App.updateStep(2);
          else App.updateStep(3);
        }
      }
    });

    const text = result.data.text.trim();
    if (!text) throw new Error('未能识别出文字，请使用更清晰的图片');

    return text;
  }
};
