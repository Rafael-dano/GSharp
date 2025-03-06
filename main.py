from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
import jwt
import traceback
import bcrypt
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

if not hasattr(bcrypt, '__about__'):
    bcrypt.__about__ = type('about', (object,), {'__version__': bcrypt.__version__})()

# Load environment variables
load_dotenv()

# FastAPI app instance
app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
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
        "genre": genre or "Unknown Genre"
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
            "genre": song.get("genre", "Unknown Genre")
        })
    return song_list

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI backend!"}
  