# backend.py
from flask import Flask, request, jsonify
import subprocess, tempfile, os, re
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def run_tesseract(path):
    cmd = ["tesseract", path, "stdout", "-l", "eng", "--oem", "1", "--psm", "6"]
    out = subprocess.check_output(cmd, stderr=subprocess.STDOUT)
    return out.decode("utf-8")

def extract_fields(text):
    result = {"cardNumber": None, "expiry": None, "cvv": None}

    # Card number (13–19 digits, grouped)
    match = re.search(r"\b(?:\d[ -]*?){13,19}\b", text.replace("\n", ""))
    if match:
        num = re.sub(r"[^\d]", "", match.group())
        result["cardNumber"] = num

    # Expiry (MM/YY or MM/YYYY)
    match = re.search(r"(0[1-9]|1[0-2])[\/\- ]?([0-9]{2,4})", text)
    if match:
        result["expiry"] = match.group()

    # CVV (3–4 digits, usually on back)
    match = re.search(r"\b\d{3,4}\b", text)
    if match:
        result["cvv"] = match.group()

    return result

@app.route("/ocr", methods=["POST"])
def ocr():
    files = request.files.getlist("files")
    output = {}
    for i, f in enumerate(files):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
            f.save(tmp.name)
            text = run_tesseract(tmp.name)
            fields = extract_fields(text)
            output[f"image_{i}"] = fields
            os.remove(tmp.name)
    return jsonify(output)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=4040)
