"""
PaddleOCR Server for Tunisian License Plate Recognition
100% free, open source, best Arabic OCR available

Usage:
  cd ocr-server
  pip install paddleocr paddlepaddle flask flask-cors
  python server.py

Server runs on http://localhost:5000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Initialize PaddleOCR — Arabic + English, no GPU needed
# use_angle_cls=True helps with rotated plates
ocr = PaddleOCR(
    use_angle_cls=True,
    lang='ar',           # Arabic as primary language
    use_gpu=False,       # CPU only (works everywhere)
    show_log=False,
    det_db_thresh=0.3,   # Lower threshold = more detections
    det_db_unclip_ratio=1.8,
)


@app.route('/ocr', methods=['POST'])
def ocr_endpoint():
    """Accept image file, return OCR text"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Empty filename'}), 400

    # Save to temp file
    suffix = os.path.splitext(file.filename)[1] or '.jpg'
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        # Run OCR
        results = ocr.ocr(tmp_path, cls=True)

        texts = []
        if results and results[0]:
            for line in results[0]:
                text = line[1][0]  # Detected text
                confidence = line[1][1]  # Confidence
                texts.append({'text': text, 'confidence': confidence})

        # Combine all detected text
        full_text = '\n'.join(t['text'] for t in texts)

        return jsonify({
            'text': full_text,
            'detections': texts,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        os.unlink(tmp_path)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'engine': 'PaddleOCR'})


if __name__ == '__main__':
    print("Starting PaddleOCR server on http://localhost:5000")
    print("First run will download Arabic model (~10MB)...")
    app.run(host='0.0.0.0', port=5000, debug=False)
