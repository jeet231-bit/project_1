import time
from llama_cpp import Llama
import os

MODEL_PATH = "models/LFM2.5-1.2B-Instruct-Q4_K_M.gguf"

if not os.path.exists(MODEL_PATH):
    print(f"ERROR: Model not found at {MODEL_PATH}")
    exit(1)

print("Starting model load...")
start = time.time()
try:
    llm = Llama(model_path=MODEL_PATH, n_ctx=512, verbose=True)
    print(f"Model loaded in {time.time() - start:.2f} seconds")

    print("Starting inference test...")
    start_inf = time.time()
    output = llm("Hello, how are you?", max_tokens=10)
    print(f"Inference took {time.time() - start_inf:.2f} seconds")
    print(f"Output: {output['choices'][0]['text']}")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"Error: {e}")
