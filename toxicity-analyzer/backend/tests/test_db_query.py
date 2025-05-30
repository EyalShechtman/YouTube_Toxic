#!/usr/bin/env python3
"""
Test script to validate the database query and check existing data.
Run this to make sure the fixed query works before running the full modal processing.
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

def test_database_query():
    """Test the fixed database query and show available data."""
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials in environment variables")
        return False
    
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        print("🔍 Checking available channels...")
        channels_response = supabase.table("channels").select("id, name").execute()
        
        if not channels_response.data:
            print("❌ No channels found in database")
            return False
        
        print("📺 Available channels:")
        for channel in channels_response.data:
            print(f"  - {channel['name']} ({channel['id']})")
        
        # Test with the first channel
        test_channel_id = channels_response.data[0]['id']
        print(f"\n🧪 Testing query with channel: {test_channel_id}")
        
        # Test the fixed query
        print("📝 Testing fixed join query...")
        comments_response = (
            supabase.table("comments")
            .select("id, text, video_id, videos!inner(channel_id)")
            .eq("videos.channel_id", test_channel_id)
            .limit(5)  # Just get 5 for testing
            .execute()
        )
        
        print(f"✅ Query successful! Found {len(comments_response.data)} comments")
        
        if comments_response.data:
            print("📝 Sample comments:")
            for i, comment in enumerate(comments_response.data[:3], 1):
                text_preview = comment['text'][:50] + "..." if len(comment['text']) > 50 else comment['text']
                print(f"  {i}. {text_preview}")
        
        # Check existing toxicity scores
        print("\n🧪 Checking existing toxicity scores...")
        existing_scores = supabase.table("comments_data").select("id").execute()
        print(f"📊 Existing toxicity scores: {len(existing_scores.data)} records")
        
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Database Query Test")
    print("=" * 30)
    
    success = test_database_query()
    
    if success:
        print("\n✅ Database query test passed! The logic should work correctly.")
        print("💡 You can now try running the full toxicity processing.")
    else:
        print("\n❌ Database query test failed. Please check your configuration.") 