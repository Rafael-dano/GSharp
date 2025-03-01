import { useState, useEffect } from "react";
import axios from "axios";

function SongList() {
  const [songs, setSongs] = useState([]);
  const [error, setError] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});  // For handling comments input

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("You must be logged in to view songs.");
          return;
        }

        const response = await fetch("http://localhost:8000/songs", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch songs");
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setSongs(data);
        } else {
          setSongs([]);
        }
      } catch (error) {
        console.error("Error fetching songs:", error);
        setError("Error fetching songs. Please try again later.");
      }
    };

    fetchSongs();
  }, []);

  // Handle like button click
  const handleLike = async (songId) => {
    try {
      await axios.post(`http://127.0.0.1:8000/songs/${songId}/like`);
      setSongs((prevSongs) =>
        prevSongs.map((song) =>
          song._id === songId ? { ...song, likes: (song.likes || 0) + 1 } : song
        )
      );
    } catch (error) {
      console.error("Error liking song:", error);
    }
  };

  // Handle comment input change
  const handleCommentChange = (e, songId) => {
    setCommentInputs({
      ...commentInputs,
      [songId]: e.target.value,
    });
  };

  // Handle adding a comment
  const handleAddComment = async (songId) => {
    const comment = commentInputs[songId];
    if (!comment) return;

    try {
      await axios.post(`http://127.0.0.1:8000/songs/${songId}/comments`, {
        username: "Guest",  // Replace with actual username if logged in
        content: comment,
      });
      setSongs((prevSongs) =>
        prevSongs.map((song) =>
          song._id === songId
            ? {
                ...song,
                comments: [...(song.comments || []), { username: "Guest", content: comment }],
              }
            : song
        )
      );
      setCommentInputs({ ...commentInputs, [songId]: "" });
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <h2>Uploaded Songs</h2>
      {songs.length > 0 ? (
        <ul>
          {songs.map((song) => (
            <li key={song._id}>
              <p>{song.original_filename || song.filename}</p>
              <audio controls>
                <source
                  src={`http://127.0.0.1:8000/songs/${song.filename}`}
                  type="audio/mpeg"
                />
                Your browser does not support the audio element.
              </audio>

              {/* Like button */}
              <div>
                <button onClick={() => handleLike(song._id)}>
                  👍 {song.likes || 0} Likes
                </button>
              </div>

              {/* Comment section */}
              <div>
                <h4>Comments:</h4>
                {song.comments && song.comments.length > 0 ? (
                  song.comments.map((c, index) => (
                    <p key={index}>
                      <strong>{c.username}:</strong> {c.content}
                    </p>
                  ))
                ) : (
                  <p>No comments yet.</p>
                )}
                <input
                  type="text"
                  value={commentInputs[song._id] || ""}
                  onChange={(e) => handleCommentChange(e, song._id)}
                  placeholder="Add a comment"
                />
                <button onClick={() => handleAddComment(song._id)}>Comment</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No songs uploaded yet.</p>
      )}
    </div>
  );
}

export default SongList;
