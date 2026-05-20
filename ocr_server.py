# -*- coding: utf-8 -*-
# ===========================================================
# ocr_server.py — PaddleOCR 后端服务
# 接收前端上传的图片 → PaddleOCR 识别 → 返回文字
# ===========================================================
import os, sys, base64, tempfile, traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化 PaddleOCR（只加载一次）
ocr_engine = None

def get_ocr():
    global ocr_engine
    if ocr_engine is None:
        print('[OCR] 初始化 PaddleOCR...')
        ocr_engine = PaddleOCR(
            use_angle_cls=True,
            lang='ch',
            show_log=False
        )
        print('[OCR] 初始化完成')
    return ocr_engine

@app.route('/api/ocr', methods=['POST'])
def do_ocr():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'error': '缺少 image 字段'}), 400

        # 解析 base64 图片
        img_data = base64.b64decode(data['image'])
        
        # 写入临时文件（PaddleOCR 支持文件路径和 numpy 数组）
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
            f.write(img_data)
            tmp_path = f.name

        try:
            ocr = get_ocr()
            result = ocr.ocr(tmp_path, cls=False)
            
            # 提取文字
            lines = []
            if result and result[0]:
                for line in result[0]:
                    text = line[1][0]  # (text, confidence)
                    lines.append(text)
            
            ocr_text = '\n'.join(lines)
            
            return jsonify({
                'text': ocr_text,
                'chars': len(ocr_text.replace('\n', '').replace(' ', '')),
                'lines': len(lines)
            })
        finally:
            # 清理临时文件
            try:
                os.unlink(tmp_path)
            except:
                pass

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    port = 5000
    print(f'[OCR Server] 启动在 http://localhost:{port}')
    print(f'[OCR Server] API 端点: POST http://localhost:{port}/api/ocr')
    app.run(host='0.0.0.0', port=port, debug=False)
