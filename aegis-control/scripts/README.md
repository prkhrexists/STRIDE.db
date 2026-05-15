# Crack Detection Model Training

## Setup

1. Install dependencies:
   ```bash
   pip install ultralytics onnx onnxruntime
   ```

2. Dataset formatting:
   - Prepare images in `/data/training/images/`
   - Use `LabelImg` (or similar) to draw bounding boxes and export in YOLO format (.txt files).
   - Place labels in `/data/training/labels/`.
   - Classes should be: `['crack', 'spalling', 'corrosion', 'delamination']`.

3. Run training:
   ```bash
   python scripts/train_crack_model.py
   ```

4. The script will output the trained model to `/models/crack_detector.onnx`.