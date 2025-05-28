import os
import re
import time
from typing import Dict, List, Optional
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from supabase import Client, create_client
import pandas as pd
from modal import Image, App, method

# Initialize Modal app
app = App("youtube-analysis")

# Create Modal image with required dependencies
image = Image.debian_slim().pip_install(
    "google-api-python-client",
    "supabase",
    "pandas",
    "numpy",
)

class YouTubeDataIngestion:
    def __init__(self, youtube_api_key: str, supabase_url: str, supabase_key: str):
        """Initialize YouTube Data Ingestion."""
        self.youtube = build("youtube", "v3", developerKey=youtube_api_key)
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.progress_callback = None

    def set_progress_callback(self, callback):
        """Set callback for progress updates."""
        self.progress_callback = callback

    def update_progress(self, status: str, progress: float, message: str):
        """Update progress through callback if set."""
        if self.progress_callback:
            self.progress_callback(status, progress, message)

    def get_channel_id_from_url(self, channel_url: str) -> str:
        """Extract channel ID from YouTube URL."""
        if channel_url.startswith("UC") and len(channel_url) == 24:
            return channel_url

        if "/@" in channel_url:
            username = channel_url.split("/@")[1].split("/")[0]
            try:
                request = self.youtube.search().list(
                    part="snippet", q=username, type="channel", maxResults=1
                )
                response = request.execute()

                if response["items"]:
                    return response["items"][0]["snippet"]["channelId"]
                else:
                    raise ValueError(f"Channel not found for: {username}")

            except HttpError as e:
                raise ValueError(f"Error finding channel: {e}")

        if "/channel/" in channel_url:
            return channel_url.split("/channel/")[1].split("/")[0]

        raise ValueError(f"Unsupported URL format: {channel_url}")

    def get_channel_info(self, channel_id: str) -> Dict:
        """Get channel information."""
        try:
            request = self.youtube.channels().list(
                part="snippet,contentDetails", id=channel_id
            )
            response = request.execute()

            if not response["items"]:
                raise ValueError(f"Channel not found: {channel_id}")

            channel = response["items"][0]
            return {
                "id": channel_id,
                "name": channel["snippet"]["title"],
                "uploads_playlist": channel["contentDetails"]["relatedPlaylists"]["uploads"],
            }
        except HttpError as e:
            raise ValueError(f"Error fetching channel info: {e}")

    def is_short_or_livestream(self, video: Dict) -> bool:
        """Check if video is a Short or livestream."""
        if video.get("liveStreamingDetails") is not None:
            return True

        duration = video.get("contentDetails", {}).get("duration", "")
        if duration:
            duration_pattern = r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"
            match = re.match(duration_pattern, duration)
            if match:
                hours = int(match.group(1) or 0)
                minutes = int(match.group(2) or 0)
                seconds = int(match.group(3) or 0)
                total_seconds = hours * 3600 + minutes * 60 + seconds
                if total_seconds <= 180:
                    return True

        return False

    def get_channel_videos(
        self, channel_info: Dict, max_videos: int = 30
    ) -> List[Dict]:
        """Get recent videos from channel uploads playlist."""
        videos = []
        next_page_token = None
        processed_count = 0
        consecutive_empty_batches = 0
        max_empty_batches = 5
        max_search_limit = 1000

        uploads_playlist_id = channel_info["uploads_playlist"]
        channel_id = channel_info["id"]

        try:
            while len(videos) < max_videos and processed_count < max_search_limit:
                results_per_page = 50

                request = self.youtube.playlistItems().list(
                    part="snippet",
                    playlistId=uploads_playlist_id,
                    maxResults=results_per_page,
                    pageToken=next_page_token,
                )
                response = request.execute()

                if not response["items"]:
                    self.update_progress(
                        "warning",
                        len(videos) / max_videos,
                        f"No more videos found after processing {processed_count} videos"
                    )
                    break

                video_ids = [
                    item["snippet"]["resourceId"]["videoId"]
                    for item in response["items"]
                ]

                details_request = self.youtube.videos().list(
                    part="snippet,statistics,contentDetails,liveStreamingDetails",
                    id=",".join(video_ids),
                )
                details_response = details_request.execute()

                eligible_in_batch = 0
                for video in details_response["items"]:
                    processed_count += 1

                    if self.is_short_or_livestream(video):
                        continue

                    comment_count = int(video["statistics"].get("commentCount", 0))
                    if comment_count == 0:
                        continue

                    videos.append({
                        "id": video["id"],
                        "title": video["snippet"]["title"],
                        "channel_id": channel_id,
                        "topic": None,
                        "likes": int(video["statistics"].get("likeCount", 0)),
                        "view_count": int(video["statistics"].get("viewCount", 0)),
                        "comment_count": comment_count,
                        "timestamp": video["snippet"]["publishedAt"],
                    })
                    eligible_in_batch += 1

                    if len(videos) >= max_videos:
                        break

                if eligible_in_batch == 0:
                    consecutive_empty_batches += 1
                    if consecutive_empty_batches >= max_empty_batches:
                        self.update_progress(
                            "warning",
                            len(videos) / max_videos,
                            f"Stopping search: {max_empty_batches} consecutive batches with no eligible videos"
                        )
                        break
                else:
                    consecutive_empty_batches = 0
                    self.update_progress(
                        "in_progress",
                        len(videos) / max_videos,
                        f"Found {eligible_in_batch} eligible videos in this batch (total: {len(videos)}/{max_videos})"
                    )

                next_page_token = response.get("nextPageToken")
                if not next_page_token:
                    self.update_progress(
                        "info",
                        len(videos) / max_videos,
                        f"Reached end of uploads playlist after processing {processed_count} total videos"
                    )
                    break

                time.sleep(0.1)

            self.update_progress(
                "success",
                1.0,
                f"Search complete: Found {len(videos)} eligible videos after processing {processed_count} total videos"
            )
            return videos

        except HttpError as e:
            raise ValueError(f"Error fetching videos: {e}")

    def get_video_comments(
        self, video_id: str, max_comments: int = 500, order: str = "relevance"
    ) -> List[Dict]:
        """Get comments for a video."""
        comments = []
        next_page_token = None

        try:
            while len(comments) < max_comments:
                remaining = max_comments - len(comments)
                results_per_page = min(100, remaining)

                request = self.youtube.commentThreads().list(
                    part="snippet",
                    videoId=video_id,
                    order=order,
                    maxResults=results_per_page,
                    pageToken=next_page_token,
                )
                response = request.execute()

                for item in response["items"]:
                    comment = item["snippet"]["topLevelComment"]["snippet"]
                    comments.append({
                        "video_id": video_id,
                        "user_id": (
                            comment["authorChannelId"]["value"]
                            if "authorChannelId" in comment
                            else None
                        ),
                        "text": comment["textDisplay"],
                        "timestamp": comment["publishedAt"],
                        "like_count": float(comment["likeCount"]),
                        "author_name": comment["authorDisplayName"],
                    })

                next_page_token = response.get("nextPageToken")
                if not next_page_token:
                    break

            return comments[:max_comments]

        except HttpError as e:
            if e.resp.status == 403 and "commentsDisabled" in str(e):
                return []
            else:
                return []

    def store_data(
        self, channel_info: Dict, videos: List[Dict], all_comments: List[Dict]
    ) -> bool:
        """Store all data in Supabase efficiently."""
        try:
            # Store channel
            self.supabase.table("channels").upsert({
                "id": channel_info["id"],
                "name": channel_info["name"]
            }).execute()

            # Store videos in batch
            if videos:
                self.supabase.table("videos").upsert(videos).execute()

            # Store unique users first
            unique_users = {}
            for comment in all_comments:
                if comment["user_id"] and comment["user_id"] not in unique_users:
                    unique_users[comment["user_id"]] = comment["author_name"]

            if unique_users:
                user_data = [
                    {"id": uid, "username": uname, "channel_id": None}
                    for uid, uname in unique_users.items()
                ]
                self.supabase.table("users").upsert(user_data).execute()

            # Store comments in batches
            if all_comments:
                batch_size = 1000
                for i in range(0, len(all_comments), batch_size):
                    batch = all_comments[i : i + batch_size]
                    self.supabase.table("comments").insert(batch).execute()
                    time.sleep(0.1)

            return True

        except Exception as e:
            self.update_progress("error", 0.0, f"Error storing data: {e}")
            return False

    def ingest_channel_data(
        self,
        channel_url: str,
        max_videos: int = 30,
        max_comments: int = 500,
        comment_order: str = "relevance",
    ) -> Dict:
        """Main function to ingest YouTube channel data."""
        try:
            print(f"\n🚀 Starting data ingestion for channel: {channel_url}")
            self.update_progress("in_progress", 0.0, f"Processing channel: {channel_url}")

            # Get channel ID and info
            print("📝 Extracting channel ID...")
            channel_id = self.get_channel_id_from_url(channel_url)
            channel_info = self.get_channel_info(channel_id)
            print(f"✅ Found channel: {channel_info['name']} ({channel_id})")
            self.update_progress(
                "in_progress",
                0.1,
                f"Found: {channel_info['name']} ({channel_id})"
            )

            # Get videos
            print(f"\n🎥 Fetching up to {max_videos} videos (excluding Shorts & livestreams)...")
            self.update_progress(
                "in_progress",
                0.2,
                f"Fetching {max_videos} videos from uploads playlist (excluding Shorts <=3min & livestreams)..."
            )
            videos = self.get_channel_videos(channel_info, max_videos)
            print(f"✅ Found {len(videos)} eligible videos")
            self.update_progress(
                "in_progress",
                0.4,
                f"Found {len(videos)} eligible videos"
            )

            if not videos:
                print("❌ No eligible videos found")
                self.update_progress(
                    "error",
                    0.0,
                    "No eligible videos found (with comments)"
                )
                return {"success": False, "message": "No eligible videos found"}

            # Get comments for all videos
            print(f"\n💬 Fetching comments ({max_comments} per video)...")
            self.update_progress(
                "in_progress",
                0.5,
                f"Fetching comments ({max_comments} per video)..."
            )
            all_comments = []

            for i, video in enumerate(videos, 1):
                title_preview = (
                    video["title"][:50] + "..."
                    if len(video["title"]) > 50
                    else video["title"]
                )
                print(f"📝 Processing video {i}/{len(videos)}: {title_preview}")
                self.update_progress(
                    "in_progress",
                    0.5 + (0.3 * i / len(videos)),
                    f"Processing video {i}/{len(videos)}: {title_preview}"
                )

                comments = self.get_video_comments(
                    video["id"], max_comments, comment_order
                )
                print(f"✅ Found {len(comments)} comments for video {i}")
                all_comments.extend(comments)

                time.sleep(0.2)

            # Store data
            print("\n💾 Storing data in Supabase...")
            self.update_progress("in_progress", 0.8, "Storing data...")
            success = self.store_data(channel_info, videos, all_comments)

            if success:
                print(f"✅ Successfully ingested: Channel: {channel_info['name']}, Videos: {len(videos)}, Comments: {len(all_comments)}")
                self.update_progress(
                    "success",
                    1.0,
                    f"Successfully ingested: Channel: {channel_info['name']}, Videos: {len(videos)}, Comments: {len(all_comments)}"
                )
                return {
                    "success": True,
                    "channel": channel_info,
                    "videos": len(videos),
                    "comments": len(all_comments)
                }
            else:
                print("❌ Failed to store data")
                self.update_progress("error", 0.0, "Failed to store data")
                return {"success": False, "message": "Failed to store data"}

        except Exception as e:
            print(f"❌ Ingestion failed: {str(e)}")
            self.update_progress("error", 0.0, f"Ingestion failed: {e}")
            return {"success": False, "message": str(e)} 