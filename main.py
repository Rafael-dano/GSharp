from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
import jwt
import os
import shutil
import uuid
import certifi  # Fix SSL issue
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import JSONResponse, FileResponse
from bson import ObjectId
from datetime import datetime, timedelta
from jwt import ExpiredSignatureError, InvalidTokenError

# Load environment variables
load_dotenv()

# FastAPI app instance
app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your frontend URL for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if not exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
db = client.music_hub
users_collection = db.users
music_collection = db.music  # New collection for music files

# Authentication settings
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")
SECRET_KEY = os.getenv("SECRET_KEY", "your_secret_key")
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Define Models
class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str

class SongMetadata(BaseModel):
    title: str
    artist: str
    genre: str

class Comment(BaseModel):
    username: str
    content: str

# JWT Token Creation
def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=30)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Verify the token
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# Register user
@app.post("/api/register")
async def register(user: UserRegister):
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_password = pwd_context.hash(user.password)
    new_user = {
        "username": user.username,
        "password": hashed_password,
        "role": "user"
    }
    await users_collection.insert_one(new_user)
    return {"message": "User registered successfully"}

# Login user
@app.post("/api/login")
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"username": user.username})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Upload song with metadata
@app.post("/api/upload")
async def upload_music(
    file: UploadFile = File(...), 
    title: str = "", 
    artist: str = "", 
    genre: str = "", 
    token: str = Depends(oauth2_scheme)
):
    verify_token(token)
    
    file_ext = file.filename.split(".")[-1]
    if file_ext not in ["mp3", "wav"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    file_id = str(uuid.uuid4())
    new_filename = f"{file_id}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    music_doc = {
        "id": file_id,
        "filename": new_filename,
        "original_filename": file.filename,
        "path": file_path,
        "title": title or "Untitled",
        "artist": artist or "Unknown Artist",
        "genre": genre or "Unknown Genre",
        "likes": 0,
        "comments": []
    }
    await music_collection.insert_one(music_doc)

    return {"message": "File uploaded successfully", "file_id": file_id, "filename": new_filename}

# Serve audio files
@app.get("/songs/{filename}")
async def serve_song(filename: str):
    file_path = os.path.join("uploads", filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="audio/mpeg")
    else:
        raise HTTPException(status_code=404, detail="File not found")

# Like a song
@app.post("/songs/{song_id}/like")
async def like_song(song_id: str, token: str = Depends(oauth2_scheme)):
    verify_token(token)
    
    result = await music_collection.update_one(
        {"id": song_id},
        {"$inc": {"likes": 1}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    return {"message": "Song liked successfully"}

# Add a comment to a song
@app.post("/songs/{song_id}/comments")
async def add_comment(song_id: str, comment: Comment, token: str = Depends(oauth2_scheme)):
    verify_token(token)

    result = await music_collection.update_one(
        {"id": song_id},
        {"$push": {"comments": comment.dict()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    return {"message": "Comment added successfully"}

# Get all songs
@app.get("/api/songs")
async def get_songs():
    songs_cursor = music_collection.find()
    song_list = []
    async for song in songs_cursor:
        song_list.append({
            "id": song["id"],
            "filename": song.get("filename", "Unknown Filename"),
            "title": song.get("title", "Untitled"),
            "artist": song.get("artist", "Unknown Artist"),
            "genre": song.get("genre", "Unknown Genre"),
            "likes": int(song.get("likes", 0)),
            "comments": list(song.get("comments", []))
        })
    return song_list

# Search songs
@app.get("/songs/search")
async def search_songs(title: str = None, artist: str = None, genre: str = None):
    query = {}
    if title:
        query["title"] = {"$regex": title, "$options": "i"}
    if artist:
        query["artist"] = {"$regex": artist, "$options": "i"}
    if genre:
        query["genre"] = {"$regex": genre, "$options": "i"}

    songs_cursor = music_collection.find(query)
    song_list = []
    async for song in songs_cursor:
        song_list.append({
            "id": song["id"],
            "filename": song["filename"],
            "title": song.get("title", "Untitled"),
            "artist": song.get("artist", "Unknown Artist"),
            "genre": song.get("genre", "Unknown Genre")
        })
    return song_list

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend!"}
