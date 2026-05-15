import os
from ultralytics import YOLO

def train():
    print("Initializing YOLOv8 training for structural defects...")
    
    # Define paths
    dataset_yaml = "dataset.yaml"
    
    # dataset.yaml content:
    # train: /data/training/images/train
    # val: /data/training/images/val
    # nc: 4
    # names: ['crack', 'spalling', 'corrosion', 'delamination']
    
    # Load model
    model = YOLO("yolov8n.pt") # nano version
    
    # Train the model
    results = model.train(
        data=dataset_yaml,
        epochs=100,
        imgsz=640,
        batch=16,
        project="/models",
        name="crack_detector"
    )
    
    # Export to ONNX
    success = model.export(format="onnx")
    print(f"Exported model to ONNX: {success}")

if __name__ == "__main__":
    train()