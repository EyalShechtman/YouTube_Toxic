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
def compute_toxicity_scores_batch(comments_batch: List[Dict]) -> List[Dict]:
    """Compute toxicity scores for a batch of comments with model loaded once."""
    if not comments_batch:
        return []

    # Load model once for the entire batch processing
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"🔬 Loading model on device: {device}")

    try:
        model = load_cached_detoxify_model(device)
        print(f"✅ Model loaded successfully on {device}")

        # Process all comments in this batch
        results = []
        texts = []
        valid_comments = []

        # Prepare texts and filter valid comments
        for comment in comments_batch:
            text = comment.get("text", "")
            if not isinstance(text, str):
                text = str(text) if text else ""

            if text.strip() and "id" in comment:
                texts.append(text.strip())
                valid_comments.append(comment)

        if not texts:
            return []

        # Compute toxicity scores for all texts at once
        with torch.no_grad():
            toxicity_results = model.predict(texts)

        toxicity_scores = toxicity_results["toxicity"]

        # Convert to list if needed
        if hasattr(toxicity_scores, "tolist"):
            scores = toxicity_scores.tolist()
        elif isinstance(toxicity_scores, list):
            scores = toxicity_scores
        else:
            scores = [float(score) for score in toxicity_scores]

        # Combine results
        for comment, score in zip(valid_comments, scores):
            results.append({"id": comment["id"], "toxicity_score": float(score)})

        print(f"✅ Processed {len(results)} comments successfully")
        return results

    except Exception as e:
        print(f"❌ Error in toxicity computation: {e}")
        # Return neutral scores on error
        return [
            {"id": comment["id"], "toxicity_score": 0.5}
            for comment in comments_batch
            if "id" in comment
        ]


@app.function(
    image=image,
    volumes={MODEL_CACHE_PATH: model_volume},
    secrets=[Secret.from_name("modal-secrets")],
)
def process_comments_batch(comments: List[Dict]) -> List[Dict]:
    """Process a batch of comments and compute toxicity scores."""
    # This function is now deprecated in favor of compute_toxicity_scores_batch
    return compute_toxicity_scores_batch.remote(comments)


@app.function(
    image=image,
    volumes={MODEL_CACHE_PATH: model_volume},
    secrets=[Secret.from_name("modal-secrets")],
)
def store_toxicity_scores(scores: List[Dict], batch_size: int = 100):
    """Store toxicity scores in Supabase with proper batching."""
    if not scores:
        return

    # Initialize Supabase client inside the function
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in Modal secrets")

    supabase = create_client(supabase_url, supabase_key)

    print(f"💾 Storing {len(scores)} scores in batches of {batch_size}")

    for i in range(0, len(scores), batch_size):
        batch = scores[i : i + batch_size]
        try:
            supabase.table("comments_data").upsert(batch).execute()
            batch_num = i // batch_size + 1
            total_batches = (len(scores) + batch_size - 1) // batch_size
            print(f"✅ Stored batch {batch_num}/{total_batches}")
        except Exception as e:
            print(f"❌ Error storing batch {i//batch_size + 1}: {e}")
            raise


@app.function(
    image=image,
    volumes={MODEL_CACHE_PATH: model_volume},
    secrets=[Secret.from_name("modal-secrets")],
)
def process_channel_comments(channel_id: str, processing_batch_size: int = 1000):
    """Process all comments for a channel with proper pagination."""
    print(f"\n🔍 Starting toxicity analysis for channel: {channel_id}")

    # Initialize Supabase client
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in Modal secrets")

    supabase = create_client(supabase_url, supabase_key)

    # Check if channel exists
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

    print("✅ Channel found, processing comments in pagination...")

    # Get existing toxicity scores to avoid reprocessing
    print("🔍 Getting existing toxicity scores...")
    existing_scores_response = supabase.table("comments_data").select("id").execute()
    existing_ids = (
        {item["id"] for item in existing_scores_response.data}
        if existing_scores_response.data
        else set()
    )
    print(f"📝 Found {len(existing_ids)} existing toxicity scores")

    # Process comments in chunks to handle large datasets
    offset = 0
    total_processed = 0

    while True:
        print(f"\n📦 Fetching comments batch (offset: {offset})...")

        # Get comments for this channel in batches
        comments_response = (
            supabase.table("comments")
            .select("id, text, video_id, videos!inner(channel_id)")
            .eq("videos.channel_id", channel_id)
            .range(offset, offset + processing_batch_size - 1)
            .execute()
        )

        if not comments_response.data:
            print("✅ No more comments to process")
            break

        # Filter out already processed comments
        unprocessed_comments = [
            comment
            for comment in comments_response.data
            if comment["id"] not in existing_ids
        ]

        print(
            f"📝 Found {len(comments_response.data)} comments, {len(unprocessed_comments)} unprocessed"
        )

        if unprocessed_comments:
            # Process comments using the efficient batch function
            print(f"🧪 Processing {len(unprocessed_comments)} unprocessed comments...")

            # Process in one efficient batch with model loaded once
            scores = compute_toxicity_scores_batch.remote(unprocessed_comments)

            if scores:
                # Store results
                print(f"💾 Storing {len(scores)} toxicity scores...")
                store_toxicity_scores.remote(scores)
                total_processed += len(scores)

                # Add processed IDs to existing set to avoid reprocessing
                existing_ids.update(score["id"] for score in scores)

        offset += processing_batch_size

        # Break if we got fewer results than requested (last page)
        if len(comments_response.data) < processing_batch_size:
            break

    print(
        f"🎉 Completed processing {total_processed} new comments for channel {channel_id}"
    )
    return {"status": "success", "message": f"Processed {total_processed} new comments"}
