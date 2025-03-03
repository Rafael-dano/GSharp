from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm
import jwt
import os
import shutil
import uuid
import certifi  # Fix SSL issue
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import JSONResponse, FileResponse
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer


# Load environment variables
load_dotenv()

# FastAPI app instance
app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Use frontend URL here for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if not exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend!"}

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

# Comment model
class Comment(BaseModel):
    username: str
    content: str

# Register user with role
@app.post("/register")
async def register(user: UserRegister):
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_password = pwd_context.hash(user.password)
    new_user = {
        "username": user.username,
        "password": hashed_password,
        "role": "user"  # Default role is 'user'
    }
    await users_collection.insert_one(new_user)
    return {"message": "User registered successfully"}

# Authentication - Login
@app.post("/login")
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"username": user.username})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create the JWT token
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# JWT Token Creation
def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=30)):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dummy login endpoint for testing
@app.post("/api/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Replace with actual authentication logic
    if form_data.username == "test" and form_data.password == "test":
        return {"access_token": "dummy_token", "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid username or password")

@app.get("/protected")
async def get_protected_data(token: str = Depends(oauth2_scheme)):
    return {"message": "This is protected data!"}

# Upload song with metadata
@app.post("/upload")
async def upload_music(
    file: UploadFile = File(...), 
    title: str = "", 
    artist: str = "", 
    genre: str = "", 
    token: str = Depends(oauth2_scheme)
):
    # Verify token
    verify_token(token)
    
    file_ext = file.filename.split(".")[-1]
    if file_ext not in ["mp3", "wav"]:  # Allow only audio files
        raise HTTPException(status_code=400, detail="Invalid file type")

    file_id = str(uuid.uuid4())  # Generate unique file name
    new_filename = f"{file_id}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, new_filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Store metadata in MongoDB
    music_doc = {
        "id": file_id,
        "filename": new_filename,
        "original_filename": file.filename,
        "path": file_path,
        "title": title if title else "Untitled",  # Default to "Untitled" if no title is provided
        "artist": artist if artist else "Unknown Artist",  # Default to "Unknown Artist"
        "genre": genre if genre else "Unknown Genre"  # Default to "Unknown Genre"
    }
    await music_collection.insert_one(music_doc)

    return {"message": "File uploaded successfully", "file_id": file_id, "filename": new_filename}

# Verify the token
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

from fastapi.responses import FileResponse

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
    # Verify token
    verify_token(token)
    
    result = await music_collection.update_one(
        {"_id": ObjectId(song_id)},
        {"$inc": {"likes": 1}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    return {"message": "Song liked successfully"}

# Add a comment to a song
@app.post("/songs/{song_id}/comments")
async def add_comment(song_id: str, comment: Comment, token: str = Depends(oauth2_scheme)):
    # Verify token
    verify_token(token)

    result = await music_collection.update_one(
        {"_id": ObjectId(song_id)},
        {"$push": {"comments": comment.dict()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Song not found")
    return {"message": "Comment added successfully"}

# Update get_songs to include comments and handle missing fields safely
@app.get("/songs")
async def get_songs():
    # Find all songs, result will be a cursor
    songs_cursor = music_collection.find()
    song_list = []
    # Iterate through the cursor asynchronously
    async for song in songs_cursor:
        song_list.append({
            "_id": str(song["_id"]),
            "filename": song.get("filename", "Unknown Filename"),
            "title": song.get("title", "Untitled"),  # Default to "Untitled" if missing
            "artist": song.get("artist", "Unknown Artist"),  # Default to "Unknown Artist"
            "genre": song.get("genre", "Unknown Genre"),  # Default to "Unknown Genre"
            "likes": song.get("likes", 0),
            "comments": song.get("comments", [])  # Include comments, default to empty list
        })
    return song_list

# Search and filter songs
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
            "_id": str(song["_id"]),  # Convert ObjectId to string
            "filename": song["filename"],
            "title": song.get("title", "Untitled"),
            "artist": song.get("artist", "Unknown Artist"),
            "genre": song.get("genre", "Unknown Genre")
        })

    return song_list
