import os
from typing import Dict, List

import torch
from detoxify import Detoxify
from dotenv import load_dotenv
from modal import App, Image, Secret, method
from supabase import Client, create_client

# Load environment variables
load_dotenv()

# Initialize Modal app
app = App("youtube-analysis")

# Create Modal image with required dependencies
image = Image.debian_slim().pip_install(
    "torch",
    "detoxify",
    "supabase",
    "pandas",
    "numpy",
    "python-dotenv",
)


@app.function(image=image, gpu="T4", secrets=[Secret.from_name("modal-secrets")])
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
        model = Detoxify("original", device=device)

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


@app.function(image=image, secrets=[Secret.from_name("modal-secrets")])
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


@app.function(image=image, secrets=[Secret.from_name("modal-secrets")])
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


@app.function(image=image, secrets=[Secret.from_name("modal-secrets")])
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
