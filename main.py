from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from passlib.context import CryptContext
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from bson import ObjectId, errors
from bson.errors import InvalidId
from dotenv import load_dotenv
import certifi 
from pydantic import BaseModel
import os
import shutil
import uuid
import bcrypt
import traceback
from datetime import datetime, timedelta

if not hasattr(bcrypt, '__about__'):
    bcrypt.__about__ = type('about', (object,), {'__version__': bcrypt.__version__})()

# Load environment variables
load_dotenv()

# FastAPI app instance
app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://gsharp.onrender.com", "https://gsharp1.onrender.com"],  # Specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response

print("CORS Config:", {
    "allow_origins": ["http://localhost:3000"],
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"]
})

# Create uploads directory if not exists
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI")

# Check if MONGO_URI is set
if not MONGO_URI:
    raise RuntimeError("MONGO_URI environment variable not set. Please add it to your Render environment variables.")

client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
db = client.music_hub
users_collection = db.users
music_collection = db.music
fs = AsyncIOMotorGridFSBucket(db)  # ✅ Use Motor's async GridFSBucket


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
class CommentRequest(BaseModel):
    user: str = "Anonymous"
    comment: str

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
    try:
        db_user = await users_collection.find_one({"username": user.username})
        if not db_user or not pwd_context.verify(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        access_token = create_access_token(data={"sub": user.username})
        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException as e:
        raise e  # Forward HTTP errors as-is
    except Exception as e:
        print("Login Error:", str(e))
        print(traceback.format_exc())  # Log the full error traceback
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.options("/api/login")
async def preflight():
    return JSONResponse(status_code=200)

@app.get("/api/protected")
async def get_protected_data():
    return {"message": "Protected route"}

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

    # Save to GridFS directly without saving locally
    gridfs_file_id = await fs.upload_from_stream(file.filename, file.file)

    music_doc = {
        "file_id": gridfs_file_id,
        "filename": file.filename,
        "title": title or "Untitled",
        "artist": artist or "Unknown Artist",
        "genre": genre or "Unknown Genre"
    }
    await music_collection.insert_one(music_doc)

    return {"message": "File uploaded successfully", "file_id": str(gridfs_file_id)}

# Serve audio files
@app.get("/api/songs/file/{file_id}")
async def get_song_file(file_id: str):
    try:
        # Check if the file_id is a valid ObjectId
        try:
            object_id = ObjectId(file_id)
        except errors.InvalidId:
            # If not a valid ObjectId, search by filename instead
            file_doc = await music_collection.find_one({"filename": file_id})
            if not file_doc:
                raise HTTPException(status_code=404, detail="File not found")
            object_id = file_doc.get("_id")  # Use '_id' from the document

        # Fetch and stream the file from GridFS
        grid_out = await fs.open_download_stream(object_id)
        return Response(content=await grid_out.read(), media_type="audio/mpeg")

    except HTTPException as e:
        print(f"Error serving file: {str(e.detail)}")
        raise e
    except Exception as e:
        print(f"Unexpected error serving file: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
# Get all songs
@app.get("/api/songs")
async def get_songs():
    songs_cursor = music_collection.find()  # Remove (100) and fix find() method
    song_list = []
    async for song in songs_cursor:
        song_list.append({
            "_id": str(song["_id"]),  # Convert ObjectId to string for React
            "filename": song.get("filename", "Unknown Filename"),
            "title": song.get("title", "Untitled"),
            "artist": song.get("artist", "Unknown Artist"),
            "genre": song.get("genre", "Unknown Genre"),
            "likes": song.get("likes", 0),  # Include likes if available
            "comments": song.get("comments", [])  # Include comments if available
        })
    return {"songs": song_list}  # Return as a dictionary with "songs" key

# Like a song
@app.post("/api/songs/{song_id}/like")
async def like_song(song_id: str, token: str = Depends(oauth2_scheme)):
    song = db.songs.find_one({"_id": ObjectId(song_id)})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    db.songs.update_one({"_id": ObjectId(song_id)}, {"$inc": {"likes": 1}})
    return {"message": "Song liked successfully"}

# Add a comment
@app.post("/api/songs/{song_id}/comments")
async def add_comment(song_id: str, comment: CommentRequest):
    comment_data = {
        "user": comment.user,
        "comment": comment.comment,
        "timestamp": datetime.utcnow()
    }
    result = await db["music"].update_one(
        {"_id": ObjectId(song_id)},
        {"$push": {"comments": comment_data}}
    )
    if result.modified_count == 1:
        return {"message": "Comment added"}
    raise HTTPException(status_code=404, detail="Song not found")

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend!"}
  