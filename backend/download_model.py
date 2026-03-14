from huggingface_hub import hf_hub_download
import os

repo_id = "LiquidAI/LFM2.5-1.2B-Instruct-GGUF"
filename = "LFM2.5-1.2B-Instruct-Q4_K_M.gguf"
local_dir = "models"

print(f"Downloading {filename} from {repo_id}...")
try:
    path = hf_hub_download(repo_id=repo_id, filename=filename, local_dir=local_dir)
    print(f"Successfully downloaded to: {path}")
except Exception as e:
    print(f"Error downloading: {e}")
