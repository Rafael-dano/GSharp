# Music Hub Project

## Overview

Music Hub is a full-stack web application that allows users to upload, stream, like, and comment on songs. It is built using React (Frontend), FastAPI (Backend), and MongoDB (Database). The application is deployed on Render and utilizes MongoDB Atlas for database management.

### Tech Stack

##### Frontend:

React (Vite-based setup)

Tailwind CSS for styling

Axios for API calls

##### Backend:

FastAPI

Motor (MongoDB async driver)

PyJWT for authentication

##### Database:

MongoDB Atlas (NoSQL Database)

GridFS for storing song files

##### Deployment:

Frontend and Backend hosted on Render

MongoDB Atlas as the cloud database

## Features Implemented

1. User Authentication

JWT-based authentication using PyJWT

Login & Protected routes for uploads

2. Song Upload & Storage

Users can upload audio files (MP3 format)

GridFS is used to store and retrieve song files efficiently

Upload feedback (loading indicator + uploaded filename displayed)

3. Streaming Songs

Users can stream songs directly from the frontend

Songs are retrieved via a FastAPI endpoint and streamed using StreamingResponse

4. Like & Comment System

Users can like and comment on songs

Likes and comments are stored in MongoDB


### API Endpoints

##### Authentication

POST /api/auth/login - Login user and return JWT token

POST /api/auth/register - Register a new user

GET /api/auth/user - Get authenticated user details

##### Songs

POST /api/songs/upload - Upload a song (requires authentication)

GET /api/songs/file/{filename} - Stream a song

POST /api/songs/{song_id}/like - Like a song

POST /api/songs/{song_id}/comments - Comment on a song

##### Deployment Steps

Frontend: Pushed React project to Render

Backend: Deployed FastAPI server on Render

Database: Connected MongoDB Atlas and tested queries

### Environment Variables:

MongoDB connection string stored securely in .env

JWT secret keys for authentication

## Testing:
 Verified upload, streaming, and like/comment functionality

### Known Issues & Fixes

Fixed: Songs not playing due to incorrect filename handling in GridFS retrieval

Fixed: Likes not updating due to incorrect MongoDB ObjectId handling

Planned: Improve error handling and add detailed logs

Future Improvements

Improve UI with animations and better styling

Implement search & filtering for songs

Expand authentication (Google OAuth, social logins)

Add AI-powered recommendations

Enhance CI/CD workflow for smoother deployments

## License 
MIT License 