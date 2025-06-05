import os
from typing import Dict, List

import torch
from detoxify import Detoxify
from dotenv import load_dotenv
from modal import App, Image, Secret, Volume
from supabase import create_client

# Load environment variables
load_dotenv()

# Initialize Modal app
app = App("youtube-analysis")

# Model caching with Modal Volume
model_volume = Volume.from_name("detoxify-model-cache", create_if_missing=True)
MODEL_CACHE_PATH = "/models"

# Create Modal image with required dependencies
image = Image.debian_slim().pip_install(
    "torch",
    "detoxify",
    "supabase",
    "pandas",
    "numpy",
    "python-dotenv",
    "transformers",
)


@app.function(
    image=image,
    volumes={MODEL_CACHE_PATH: model_volume},
    secrets=[Secret.from_name("modal-secrets")],
    timeout=1800,  # 30 minutes for initial download
)
def download_detoxify_model_to_volume():
    """Download the detoxify model to Modal Volume for caching."""
    from pathlib import Path

    print("🚀 Downloading detoxify model to volume cache...")
    print(f"📁 Cache directory: {MODEL_CACHE_PATH}")

    # Check if model is already cached
    model_path = Path(MODEL_CACHE_PATH) / "detoxify_original"

    if model_path.exists() and any(model_path.iterdir()):
        print("✅ Detoxify model already cached in volume!")
        return {"status": "already_cached", "model_path": str(model_path)}

    try:
        # Create cache directory
        model_path.mkdir(parents=True, exist_ok=True)

        # Initialize detoxify model (this will download it)
        print("📦 Downloading detoxify 'original' model...")
        model = Detoxify("original")

        # Save the model to our cache directory
        # Detoxify uses transformers under the hood, so we save the model components
        model.model.save_pretrained(str(model_path / "model"))
        model.tokenizer.save_pretrained(str(model_path / "tokenizer"))

        # Also save the model configuration
        import json

        config = {
            "model_type": "original",
            "device": "cpu",  # Will be set dynamically later
        }
        with open(model_path / "config.json", "w") as f:
            json.dump(config, f)

        # Commit changes to volume
        model_volume.commit()

        print(f"✅ Detoxify model downloaded successfully to {model_path}")
        print("📊 Volume committed - model ready for fast loading!")

        return {
            "status": "downloaded",
            "model_path": str(model_path),
            "cached_size": sum(
                f.stat().st_size for f in model_path.rglob("*") if f.is_file()
            ),
        }

    except Exception as e:
        print(f"❌ Error downloading detoxify model: {e}")
        raise


@app.function(
    image=image,
    volumes={MODEL_CACHE_PATH: model_volume},
    timeout=300,
)
def check_detoxify_model_cache():
    """Check if detoxify model is cached."""
    from pathlib import Path

    model_path = Path(MODEL_CACHE_PATH) / "detoxify_original"
    cached = model_path.exists() and any(model_path.iterdir())

    result = {
        "cached": cached,
        "path": str(model_path),
    }

    if cached:
        file_count = len(list(model_path.rglob("*")))
        total_size = sum(f.stat().st_size for f in model_path.rglob("*") if f.is_file())
        result.update(
            {
                "file_count": file_count,
                "total_size_mb": total_size / (1024 * 1024),
            }
        )

    return result


def load_cached_detoxify_model(device="cpu"):
    """Load detoxify model from cache."""
    from pathlib import Path

    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    model_path = Path(MODEL_CACHE_PATH) / "detoxify_original"

    if not model_path.exists():
        print("❌ Cached model not found, falling back to direct download")
        return Detoxify("original", device=device)

    try:
        print(f"✅ Loading detoxify model from cache: {model_path}")

        # Load tokenizer and model from cache
        tokenizer = AutoTokenizer.from_pretrained(str(model_path / "tokenizer"))
        model = AutoModelForSequenceClassification.from_pretrained(
            str(model_path / "model")
        )

        # Move model to specified device
        model = model.to(device)

        # Create a detoxify-compatible object
        class CachedDetoxify:
            def __init__(self, model, tokenizer, device):
                self.model = model
                self.tokenizer = tokenizer
                self.device = device

            def predict(self, texts):
                """Predict toxicity scores for given texts."""
                if isinstance(texts, str):
                    texts = [texts]

                # Tokenize inputs
                inputs = self.tokenizer(
                    texts,
                    return_tensors="pt",
                    truncation=True,
                    padding=True,
                    max_length=512,
                )

                # Move inputs to device
                inputs = {k: v.to(self.device) for k, v in inputs.items()}

                # Get predictions
                with torch.no_grad():
                    outputs = self.model(**inputs)
                    predictions = torch.sigmoid(outputs.logits).cpu().numpy()

                # Return in detoxify format
                return {
                    "toxicity": (
                        predictions[:, 0] if len(predictions.shape) > 1 else predictions
                    )
                }

        cached_model = CachedDetoxify(model, tokenizer, device)
        print(f"🎮 Cached model loaded on device: {device}")
        return cached_model

    except Exception as e:
        print(f"❌ Error loading cached model: {e}")
        print("🔄 Falling back to direct download...")
        return Detoxify("original", device=device)


@app.function(
    image=image,
    gpu="T4",
    volumes={MODEL_CACHE_PATH: model_volume},
    secrets=[Secret.from_name("modal-secrets")],
)
def compute_toxicity_scores(texts: List[str]) -> List[float]:
    """Compute toxicity scores for a batch of texts using GPU acceleration."""
    if not texts:
        return []

    # Filter out empty texts and keep track of indices
    valid_texts = []
    valid_indices = []
    for i, text in enumerate(texts):
        if text and text.strip():
            valid_texts.append(text.strip())
            valid_indices.append(i)

    if not valid_texts:
        return [0.0] * len(texts)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🔬 Using device: {device} for toxicity analysis")

    try:
        # Load cached model
        model = load_cached_detoxify_model(device)

        with torch.no_grad():
            results = model.predict(valid_texts)

        # Handle different return types from detoxify
        toxicity_scores = results["toxicity"]

        # Convert to list if it's a tensor or numpy array
        if hasattr(toxicity_scores, "tolist"):
            valid_scores = toxicity_scores.tolist()
        elif isinstance(toxicity_scores, list):
            valid_scores = toxicity_scores
        else:
            # Convert to float list as fallback
            valid_scores = [float(score) for score in toxicity_scores]

        # Map scores back to original indices
        final_scores = [0.0] * len(texts)
        for i, score in zip(valid_indices, valid_scores):
            final_scores[i] = float(score)

        return final_scores

    except Exception as e:
        print(f"❌ Error in toxicity computation: {e}")
        # Return neutral scores on error
        return [0.5] * len(texts)


@app.function(
    image=image,
    volumes={MODEL_CACHE_PATH: model_volume},
    secrets=[Secret.from_name("modal-secrets")],
)
def process_comments_batch(comments: List[Dict]) -> List[Dict]:
    """Process a batch of comments and compute toxicity scores."""
    if not comments:
        return []

    # Extract texts for toxicity computation and validate
    texts = []
    for comment in comments:
        text = comment.get("text", "")
        if not isinstance(text, str):
            text = str(text) if text else ""
        texts.append(text)

    try:
        # Compute toxicity scores for the entire batch
        toxicity_scores = compute_toxicity_scores.remote(texts)

        # Combine results
        results = []
        for comment, score in zip(comments, toxicity_scores):
            if "id" not in comment:
                print(f"⚠️ Comment missing ID, skipping: {comment}")
                continue

            results.append({"id": comment["id"], "toxicity_score": float(score)})

        return results

    except Exception as e:
        print(f"❌ Error processing comment batch: {e}")
        # Return empty list on error - will be handled upstream
        return []


@app.function(
    image=image,
    volumes={MODEL_CACHE_PATH: model_volume},
    secrets=[Secret.from_name("modal-secrets")],
)
def store_toxicity_scores(scores: List[Dict], batch_size: int = 100):
    """Store toxicity scores in Supabase."""
    # Initialize Supabase client inside the function
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in Modal secrets")

    supabase = create_client(supabase_url, supabase_key)

    for i in range(0, len(scores), batch_size):
        batch = scores[i : i + batch_size]
        supabase.table("comments_data").upsert(batch).execute()


@app.function(
    image=image,
    volumes={MODEL_CACHE_PATH: model_volume},
    secrets=[Secret.from_name("modal-secrets")],
)
def process_channel_comments(channel_id: str, batch_size: int = 32):
    """Process all comments for a channel and compute toxicity scores."""
    print(f"\n🔍 Starting toxicity analysis for channel: {channel_id}")

    # Initialize Supabase client inside the function
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in Modal secrets")

    supabase = create_client(supabase_url, supabase_key)

    # First, check if the channel exists
    print("📝 Checking if channel exists in database...")
    channel_response = (
        supabase.table("channels").select("id").eq("id", channel_id).execute()
    )

    if not channel_response.data:
        print(f"❌ Channel {channel_id} not found in database")
        return {
            "status": "error",
            "message": f"Channel {channel_id} not found in database",
        }

    print("✅ Channel found, checking for unprocessed comments...")

    # Get all comments for the channel by joining with videos table
    # Since comments table doesn't have channel_id, we need to join through videos
    comments_response = (
        supabase.table("comments")
        .select("id, text, video_id, videos!inner(channel_id)")
        .eq("videos.channel_id", channel_id)
        .execute()
    )

    if not comments_response.data:
        print("❌ No comments found for this channel")
        return {"status": "error", "message": "No comments found for this channel"}

    # Get existing toxicity scores
    existing_scores_response = supabase.table("comments_data").select("id").execute()

    existing_ids = (
        {item["id"] for item in existing_scores_response.data}
        if existing_scores_response.data
        else set()
    )

    # Filter out comments that already have toxicity scores
    unprocessed_comments = [
        comment
        for comment in comments_response.data
        if comment["id"] not in existing_ids
    ]

    if not unprocessed_comments:
        print("✅ All comments for this channel have already been processed")
        return {
            "status": "success",
            "message": "All comments for this channel have already been processed",
        }

    print(f"📝 Found {len(unprocessed_comments)} unprocessed comments")
    # Process only the unprocessed comments
    comments = unprocessed_comments
    all_scores = []

    # Process comments in batches
    print(f"\n🧪 Processing comments in batches of {batch_size}...")
    for i in range(0, len(comments), batch_size):
        batch = comments[i : i + batch_size]
        print(
            f"📦 Processing batch {i//batch_size + 1}/{(len(comments) + batch_size - 1)//batch_size}"
        )
        scores = process_comments_batch.remote(batch)
        all_scores.extend(scores)

    # Store scores
    if all_scores:
        print(f"\n💾 Storing {len(all_scores)} toxicity scores in Supabase...")
        store_toxicity_scores.remote(all_scores)
        print("✅ Successfully stored toxicity scores")

    print(f"🎉 Completed processing {len(all_scores)} comments")
    return {"status": "success", "message": f"Processed {len(all_scores)} new comments"}
