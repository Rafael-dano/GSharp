from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer
import jwt
import os
import shutil
import uuid
import certifi  # Fix SSL issue
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# FastAPI app instance
app = FastAPI()

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())  
db = client.music_hub  
users_collection = db.users  
music_collection = db.music  # New collection for music files

# Authentication settings
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")
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

# Register user
@app.post("/register")
async def register(user: UserRegister):
    existing_user = await users_collection.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    hashed_password = pwd_context.hash(user.password)
    await users_collection.insert_one({"username": user.username, "password": hashed_password})
    return {"message": "User registered successfully"}

# Login user
@app.post("/login")
async def login(user: UserLogin):
    existing_user = await users_collection.find_one({"username": user.username})
    if not existing_user or not pwd_context.verify(user.password, existing_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = jwt.encode({"sub": user.username}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

# Protected route
@app.get("/protected")
async def protected_route(token: str = Depends(oauth2_scheme)):
    return {"message": "You have access to this protected route!"}

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# File Upload Handling
MUSIC_UPLOAD_DIR = "uploads"
os.makedirs(MUSIC_UPLOAD_DIR, exist_ok=True)  # Ensure the folder exists

@app.post("/upload")
async def upload_music(file: UploadFile = File(...)):
    file_ext = file.filename.split(".")[-1]
    if file_ext not in ["mp3", "wav"]:  # Allow only audio files
        raise HTTPException(status_code=400, detail="Invalid file type")

    file_id = str(uuid.uuid4())  # Generate unique file name
    file_path = os.path.join(MUSIC_UPLOAD_DIR, f"{file_id}.{file_ext}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)  # Save file

    # Store metadata in MongoDB
    music_doc = {
        "id": file_id,
        "filename": file.filename,
        "path": file_path
    }
    await music_collection.insert_one(music_doc)

    return {"message": "File uploaded successfully", "file_id": file_id}
