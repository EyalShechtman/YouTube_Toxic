import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import Client, create_client
from toxicity_processor import process_channel_comments
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
    supabase_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
)

# Store for tracking Modal jobs
modal_jobs = {}


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
        channel_response = (
            supabase.table("channels").select("*").eq("id", channel_id).execute()
        )

        if not channel_response.data:
            print("📥 Channel not found, starting ingestion pipeline...")

            # Store initial job status
            modal_jobs[request.analysis_id] = {
                "status": "ingesting",
                "progress": 0.1,
                "message": "Ingesting channel data...",
                "channel_id": channel_id,
                "modal_call_id": None,
            }

            # Ingest channel data
            try:
                ingestion_result = youtube_ingestion.ingest_channel_data(
                    request.channel_url
                )

                if not ingestion_result.get("success", False):
                    error_msg = (
                        f"Failed to ingest channel data: "
                        f"{ingestion_result.get('message', 'Unknown error')}"
                    )
                    print(f"❌ {error_msg}")
                    modal_jobs[request.analysis_id] = {
                        "status": "error",
                        "progress": 0.0,
                        "message": error_msg,
                        "channel_id": channel_id,
                        "modal_call_id": None,
                    }
                    raise HTTPException(status_code=500, detail=error_msg)

                print("✅ Channel data ingested successfully")

                # Update status
                modal_jobs[request.analysis_id]["status"] = "starting_analysis"
                modal_jobs[request.analysis_id]["progress"] = 0.3
                modal_jobs[request.analysis_id][
                    "message"
                ] = "Starting toxicity analysis..."

                # Start Modal analysis asynchronously
                try:
                    # Use spawn instead of remote to run asynchronously
                    call = process_channel_comments.spawn(channel_id)
                    modal_call_id = call.object_id

                    # Store the Modal call ID for progress tracking
                    modal_jobs[request.analysis_id]["modal_call_id"] = modal_call_id
                    modal_jobs[request.analysis_id]["status"] = "analyzing"
                    modal_jobs[request.analysis_id]["progress"] = 0.5
                    modal_jobs[request.analysis_id][
                        "message"
                    ] = "Processing comments for toxicity analysis..."

                    print(f"✅ Analysis started with Modal call ID: {modal_call_id}")

                except Exception as modal_error:
                    error_msg = f"Failed to start Modal analysis: {str(modal_error)}"
                    print(f"❌ {error_msg}")
                    modal_jobs[request.analysis_id] = {
                        "status": "error",
                        "progress": 0.0,
                        "message": error_msg,
                        "channel_id": channel_id,
                        "modal_call_id": None,
                    }
                    raise HTTPException(status_code=500, detail=error_msg)

            except Exception as ingestion_error:
                error_msg = f"Ingestion error: {str(ingestion_error)}"
                print(f"❌ {error_msg}")
                modal_jobs[request.analysis_id] = {
                    "status": "error",
                    "progress": 0.0,
                    "message": error_msg,
                    "channel_id": channel_id,
                    "modal_call_id": None,
                }
                raise HTTPException(status_code=500, detail=error_msg)

        else:
            print("✅ Channel found in database")
            # Channel exists, check if all comments have been processed

            # Check if there are unprocessed comments
            comments_response = (
                supabase.table("comments")
                .select("id, videos!inner(channel_id)")
                .eq("videos.channel_id", channel_id)
                .limit(1)
                .execute()
            )

            if comments_response.data:
                # Check if any comments lack toxicity scores
                unprocessed_response = (
                    supabase.table("comments")
                    .select("id, videos!inner(channel_id), comments_data!left(id)")
                    .eq("videos.channel_id", channel_id)
                    .is_("comments_data.id", "null")
                    .limit(1)
                    .execute()
                )

                if unprocessed_response.data:
                    print("📝 Found unprocessed comments, starting analysis...")

                    # Store job status for existing channel with unprocessed comments
                    modal_jobs[request.analysis_id] = {
                        "status": "analyzing",
                        "progress": 0.5,
                        "message": "Processing remaining comments for toxicity analysis...",
                        "channel_id": channel_id,
                        "modal_call_id": None,
                    }

                    try:
                        # Start Modal analysis asynchronously
                        call = process_channel_comments.spawn(channel_id)
                        modal_call_id = call.object_id

                        modal_jobs[request.analysis_id]["modal_call_id"] = modal_call_id
                        print(
                            f"✅ Analysis started with Modal call ID: {modal_call_id}"
                        )

                    except Exception as modal_error:
                        error_msg = (
                            f"Failed to start Modal analysis: {str(modal_error)}"
                        )
                        print(f"❌ {error_msg}")
                        modal_jobs[request.analysis_id] = {
                            "status": "error",
                            "progress": 0.0,
                            "message": error_msg,
                            "channel_id": channel_id,
                            "modal_call_id": None,
                        }
                        raise HTTPException(status_code=500, detail=error_msg)
                else:
                    print("✅ All comments already processed")
                    modal_jobs[request.analysis_id] = {
                        "status": "completed",
                        "progress": 1.0,
                        "message": "Analysis complete - all comments already processed",
                        "channel_id": channel_id,
                        "modal_call_id": None,
                    }
            else:
                print("📝 No comments found for channel")
                modal_jobs[request.analysis_id] = {
                    "status": "completed",
                    "progress": 1.0,
                    "message": "Analysis complete - no comments found for this channel",
                    "channel_id": channel_id,
                    "modal_call_id": None,
                }

        # Return immediately with success
        return {
            "success": True,
            "status": "started",
            "message": "Analysis started successfully",
            "analysis_id": request.analysis_id,
            "channel_id": channel_id,
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Unexpected error in analyze_channel: {error_msg}")
        if request.analysis_id in modal_jobs:
            modal_jobs[request.analysis_id]["status"] = "error"
            modal_jobs[request.analysis_id]["message"] = error_msg
        raise HTTPException(status_code=500, detail=error_msg)


@api.get("/api/analysis-progress/{analysis_id}")
async def get_analysis_progress(analysis_id: str):
    """Get the progress of an analysis."""
    try:
        if analysis_id not in modal_jobs:
            # Check if this might be a completed analysis by looking in Supabase
            return {
                "status": "not_found",
                "progress": 0.0,
                "message": "Analysis not found. Please start a new analysis.",
            }

        job_info = modal_jobs[analysis_id]

        # If we have a Modal call ID, check its status
        if job_info.get("modal_call_id"):
            try:
                from modal.functions import FunctionCall

                function_call = FunctionCall.from_id(job_info["modal_call_id"])

                try:
                    # Check if the call is finished (non-blocking)
                    result = function_call.get(timeout=0)

                    # If we get here, the call completed successfully
                    print(f"✅ Modal analysis completed for {analysis_id}")
                    modal_jobs[analysis_id] = {
                        **job_info,
                        "status": "completed",
                        "progress": 1.0,
                        "message": "Toxicity analysis completed successfully!",
                    }

                except Exception as timeout_error:
                    if (
                        "TimeoutError" in str(type(timeout_error))
                        or "timeout" in str(timeout_error).lower()
                    ):
                        # Still running - estimate progress
                        current_progress = job_info.get("progress", 0.5)
                        # Slowly increment progress while job is running
                        if current_progress < 0.9:
                            new_progress = min(0.9, current_progress + 0.05)
                            modal_jobs[analysis_id]["progress"] = new_progress

                        return {
                            "status": "analyzing",
                            "progress": modal_jobs[analysis_id]["progress"],
                            "message": "Processing comments for toxicity analysis...",
                        }
                    else:
                        # Some other error occurred
                        print(f"❌ Modal job error: {timeout_error}")
                        modal_jobs[analysis_id] = {
                            **job_info,
                            "status": "error",
                            "progress": 0.0,
                            "message": f"Analysis failed: {str(timeout_error)}",
                        }

            except Exception as modal_error:
                print(f"❌ Error checking Modal job status: {modal_error}")
                # Fall back to stored status
                pass

        # Return the current stored status
        return {
            "status": job_info["status"],
            "progress": job_info.get("progress", 0.0),
            "message": job_info.get("message", "Processing..."),
        }

    except Exception as e:
        print(f"❌ Error in get_analysis_progress: {e}")
        return {
            "status": "error",
            "progress": 0.0,
            "message": f"Error checking progress: {str(e)}",
        }


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
