from sentence_transformers import SentenceTransformer

# This line will download and cache the model.
SentenceTransformer("all-MiniLM-L6-v2")

print("✅ Model downloaded and cached successfully.")