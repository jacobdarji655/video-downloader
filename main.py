from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import yt_dlp
import os
import uuid
from pathlib import Path

app = FastAPI()

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_FOLDER = "downloads"
os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Video Downloader API is running"}

@app.post("/info")
async def get_video_info(request: Request):
    try:
        data = await request.json()
        url = data.get("url")
        
        if not url:
            raise HTTPException(status_code=400, detail="URL is required")
        
        # Options for yt-dlp to extract info without downloading
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Extract available formats
            formats = []
            for f in info.get('formats', []):
                format_note = f.get('format_note', '')
                if not format_note:
                    format_note = f.get('resolution', 'unknown')
                
                formats.append({
                    'format_id': f.get('format_id'),
                    'ext': f.get('ext'),
                    'format_note': format_note,
                    'filesize': f.get('filesize'),
                    'url': f.get('url')
                })
            
            return {
                'title': info.get('title'),
                'thumbnail': info.get('thumbnail'),
                'duration': info.get('duration'),
                'uploader': info.get('uploader'),
                'formats': formats
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download")
async def download_video(url: str, format_id: str):
    try:
        # Create unique filename to avoid conflicts
        unique_id = str(uuid.uuid4())[:8]
        
        ydl_opts = {
            'format': format_id,
            'outtmpl': f'{DOWNLOAD_FOLDER}/%(title)s_{unique_id}.%(ext)s',
            'quiet': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Handle different extensions
            if not os.path.exists(filename):
                # Try with different extension
                for ext in ['mp4', 'webm', 'mkv']:
                    test_filename = filename.replace(info.get('ext', ''), ext)
                    if os.path.exists(test_filename):
                        filename = test_filename
                        break
            
            if not os.path.exists(filename):
                raise HTTPException(status_code=500, detail="Downloaded file not found")
            
            return FileResponse(
                path=filename, 
                filename=os.path.basename(filename),
                media_type='application/octet-stream'
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download-mp3")
async def download_mp3(url: str):
    try:
        unique_id = str(uuid.uuid4())[:8]
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }],
            'outtmpl': f'{DOWNLOAD_FOLDER}/%(title)s_{unique_id}.%(ext)s',
            'quiet': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            filename = filename.replace(info.get('ext', ''), 'mp3')
            
            if not os.path.exists(filename):
                raise HTTPException(status_code=500, detail="MP3 file not found")
            
            return FileResponse(
                path=filename, 
                filename=os.path.basename(filename),
                media_type='audio/mpeg'
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Clean up old files occasionally (optional)
@app.on_event("startup")
async def startup_event():
    # You could add cleanup logic here
    pass