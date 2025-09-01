from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict
import os

app = FastAPI(title="Hello World API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MessageResponse(BaseModel):
    message: str
    timestamp: str


@app.get("/api/hello")
def get_hello() -> Dict[str, str]:
    """API endpoint for hello message."""
    return {
        "message": "Hello World from Google Cloud Run!",
        "backend": "FastAPI",
        "frontend": "React + TypeScript + Vite",
    }


@app.get("/api/health")
def health_check() -> Dict[str, str]:
    """Health check endpoint for Cloud Run."""
    return {"status": "healthy"}


# Serve static files if they exist (production mode)
# IMPORTANT: This must be at the end, after all API routes are defined
if os.path.exists("static"):
    # Serve the React app for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Catch-all route to serve the React app."""
        file_path = os.path.join("static", full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Always return index.html for client-side routing
        return FileResponse("static/index.html")
