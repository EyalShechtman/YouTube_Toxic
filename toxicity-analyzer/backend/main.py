from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import Optional, List, Dict
from supabase import create_client, Client
from toxicity_processor import process_channel_comments, app as modal_app
from dotenv import load_dotenv
import asyncio
import modal
from youtube_ingestion import YouTubeDataIngestion

# Load environment variables
load_dotenv()

# Initialize FastAPI app
api = FastAPI(title="YouTube Channel Analysis API")

# Add CORS middleware
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env file")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize YouTube ingestion
youtube_ingestion = YouTubeDataIngestion(
    youtube_api_key=os.getenv("YOUTUBE_API_KEY"),
    supabase_url=os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    supabase_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Pydantic models for request/response
class ChannelRequest(BaseModel):
    channel_url: str
    analysis_id: str

class AnalysisProgress(BaseModel):
    status: str
    progress: Optional[float] = None
    message: Optional[str] = None

class ToxicityScore(BaseModel):
    id: str
    toxicity_score: float

# API Routes
@api.post("/api/analyze-channel")
async def analyze_channel(request: ChannelRequest):
    """Start channel analysis process."""
    try:
        print(f"\n🔍 Starting analysis for channel URL: {request.channel_url}")
        
        # Extract channel ID from URL using YouTubeDataIngestion
        try:
            channel_id = youtube_ingestion.get_channel_id_from_url(request.channel_url)
            print(f"📝 Extracted channel ID: {channel_id}")
        except ValueError as e:
            error_msg = f"Invalid channel URL: {str(e)}"
            print(f"❌ {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Check if channel exists in Supabase
        print("🔍 Checking if channel exists in Supabase...")
        channel_response = supabase.table("channels").select("*").eq("id", channel_id).execute()
        
        if not channel_response.data:
            print("📥 Channel not found, starting ingestion pipeline...")
            
            # Ingest channel data
            ingestion_result = youtube_ingestion.ingest_channel_data(request.channel_url)
            
            if not ingestion_result.get("success", False):
                error_msg = f"Failed to ingest channel data: {ingestion_result.get('message', 'Unknown error')}"
                print(f"❌ {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=error_msg
                )
            print("✅ Channel data ingested successfully")
            
            # After ingestion, start Modal analysis
            try:
                with modal.enable_output():
                    with modal_app.run():
                        result = process_channel_comments.remote(channel_id)
                
                print("✅ Analysis started successfully")
                return {
                    "success": True,
                    "status": "success",
                    "message": "Channel data ingested and analysis started",
                    "analysis_id": request.analysis_id,
                    "channel_id": channel_id
                }
            except Exception as modal_error:
                error_msg = f"Modal execution error: {str(modal_error)}"
                print(f"❌ {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=error_msg
                )
        else:
            print("✅ Channel found in database, returning success")
            # Channel exists, just return success
            return {
                "success": True,
                "status": "success",
                "message": "Channel found in database",
                "analysis_id": request.analysis_id,
                "channel_id": channel_id
            }
            
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error in analyze_channel: {error_msg}")
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )

@api.get("/api/analysis-progress/{analysis_id}")
async def get_analysis_progress(analysis_id: str):
    """Get the progress of an analysis."""
    try:
        # In a real implementation, you would track progress in Supabase
        # For now, we'll return a mock response
        return {
            "status": "success",
            "progress": 0.5,
            "message": "Analysis in progress"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api.get("/api/channel/{channel_id}/toxicity")
async def get_channel_toxicity(channel_id: str):
    try:
        result = process_channel_comments(channel_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(api, host="0.0.0.0", port=8000) 