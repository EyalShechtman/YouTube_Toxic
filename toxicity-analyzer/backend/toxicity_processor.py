import os
from typing import List, Dict
import torch
from modal import Image, App, method, Secret
from detoxify import Detoxify
from supabase import create_client, Client
from dotenv import load_dotenv

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
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = Detoxify('original', device=device)
    
    with torch.no_grad():
        results = model.predict(texts)
    
    return results['toxicity'].tolist()

@app.function(image=image, secrets=[Secret.from_name("modal-secrets")])
def process_comments_batch(comments: List[Dict], batch_size: int = 32) -> List[Dict]:
    """Process a batch of comments and compute toxicity scores."""
    # Extract texts for toxicity computation
    texts = [comment['text'] for comment in comments]
    
    # Compute toxicity scores in batches
    toxicity_scores = []
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        batch_scores = compute_toxicity_scores.remote(batch_texts)
        toxicity_scores.extend(batch_scores)
    
    # Combine results
    results = []
    for comment, score in zip(comments, toxicity_scores):
        results.append({
            'id': comment['id'],
            'toxicity_score': float(score)
        })
    
    return results

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
        batch = scores[i:i + batch_size]
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
        supabase.table("channels")
        .select("id")
        .eq("id", channel_id)
        .execute()
    )
    
    if not channel_response.data:
        print(f"❌ Channel {channel_id} not found in database")
        return {
            "status": "error",
            "message": f"Channel {channel_id} not found in database"
        }
    
    print("✅ Channel found, checking for unprocessed comments...")
    
    # Get all comments for the channel
    comments_response = (
        supabase.table("comments")
        .select("id, text")
        .eq("channel_id", channel_id)
        .execute()
    )
    
    if not comments_response.data:
        print("❌ No comments found for this channel")
        return {
            "status": "error",
            "message": "No comments found for this channel"
        }
    
    # Get existing toxicity scores
    existing_scores_response = (
        supabase.table("comments_data")
        .select("id")
        .execute()
    )
    
    existing_ids = {item['id'] for item in existing_scores_response.data} if existing_scores_response.data else set()
    
    # Filter out comments that already have toxicity scores
    unprocessed_comments = [
        comment for comment in comments_response.data 
        if comment['id'] not in existing_ids
    ]
    
    if not unprocessed_comments:
        print("✅ All comments for this channel have already been processed")
        return {
            "status": "success",
            "message": "All comments for this channel have already been processed"
        }
    
    print(f"📝 Found {len(unprocessed_comments)} unprocessed comments")
    # Process only the unprocessed comments
    comments = unprocessed_comments
    all_scores = []
    
    # Process comments in batches
    print(f"\n🧪 Processing comments in batches of {batch_size}...")
    for i in range(0, len(comments), batch_size):
        batch = comments[i:i + batch_size]
        print(f"📦 Processing batch {i//batch_size + 1}/{(len(comments) + batch_size - 1)//batch_size}")
        scores = process_comments_batch.remote(batch)
        all_scores.extend(scores)
    
    # Store scores
    if all_scores:
        print(f"\n💾 Storing {len(all_scores)} toxicity scores in Supabase...")
        store_toxicity_scores.remote(all_scores)
        print("✅ Successfully stored toxicity scores")
    
    print(f"🎉 Completed processing {len(all_scores)} comments")
    return {
        "status": "success",
        "message": f"Processed {len(all_scores)} new comments"
    } 