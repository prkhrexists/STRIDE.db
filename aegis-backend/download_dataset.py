import kagglehub
import os

path = kagglehub.dataset_download("wednesday233/corrosion-detect-dataset")
print(f"Dataset downloaded to: {path}")

for root, dirs, files in os.walk(path):
    level = root.replace(path, '').count(os.sep)
    indent = ' ' * 4 * (level)
    print(f"{indent}{os.path.basename(root)}/")
    subindent = ' ' * 4 * (level + 1)
    for f in files[:5]:
        print(f"{subindent}{f}")
    if len(files) > 5:
        print(f"{subindent}... and {len(files) - 5} more files")
