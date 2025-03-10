import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://gsharp.onrender.com/api"; // Updated backend URL

function SongList() {
  const [songs, setSongs] = useState([]);
  const [error, setError] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  useEffect(() => {
    const fetchSongs = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("You must be logged in to view songs.");
        return;
      }

      axios
        .get(`${API_URL}/songs`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((response) => {
          if (response.data?.songs?.length) {
            setSongs(response.data.songs);
          } else {
            console.warn("No songs returned from API.");
            setSongs([]);
          }
        })
        .catch((error) => {
          console.error("Error fetching songs:", error);
          setError("Error fetching songs. Please try again later.");
        });
    };

    fetchSongs();
  }, []);

  // Handle like button click
  const handleLike = (songId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in to like songs.");
      return;
    }

    axios
      .post(`${API_URL}/songs/${songId}/like`, null, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then(() => {
        setSongs((prevSongs) =>
          prevSongs.map((song) =>
            song._id === songId ? { ...song, likes: (song.likes || 0) + 1 } : song
          )
        );
      })
      .catch((error) => {
        console.error("Error liking song:", error);
      });
  };

  // Handle comment input change
  const handleCommentChange = (e, songId) => {
    setCommentInputs({
      ...commentInputs,
      [songId]: e.target.value,
    });
  };

  // Handle adding a comment
  const handleAddComment = (songId) => {
    const token = localStorage.getItem("token");
    const comment = commentInputs[songId];
    if (!token) {
      setError("You must be logged in to comment.");
      return;
    }
    if (!comment) {
      console.warn("Comment is empty!");
      return;
    }

    axios
      .post(
        `${API_URL}/songs/${songId}/comments`,
        { comment: comment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      .then((response) => {
        console.log("Comment added:", response.data);
        setSongs((prevSongs) =>
          prevSongs.map((song) =>
            song._id === songId
              ? {
                  ...song,
                  comments: [
                    ...(song.comments || []),
                    { username: "Guest", comment: comment }, // Updated to use `.comment`
                  ],
                }
              : song
          )
        );
        setCommentInputs({ ...commentInputs, [songId]: "" });
      })
      .catch((error) => {
        console.error("Error adding comment:", error);
      });
  };

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4 text-center">Uploaded Songs</h2>
      {songs.length > 0 ? (
        <ul className="space-y-6">
          {songs.map((song) => (
            <li
              key={song._id}
              className="border rounded-lg p-4 shadow-sm bg-gray-50"
            >
              <p className="font-semibold mb-2">
                {song.title} by {song.artist} ({song.genre})
              </p>
              <audio controls className="w-full mb-2">
                <source
                  src={`${API_URL}/songs/file/${song.filename}`}
                  type="audio/mpeg"
                />
                Your browser does not support the audio element.
              </audio>

              {/* Like button */}
              <div className="mb-2">
                <button
                  onClick={() => handleLike(song._id)}
                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
                >
                  👍 {song.likes || 0} Likes
                </button>
              </div>

              {/* Comment section */}
              <div className="mb-2">
                <h4 className="font-medium mb-1">Comments:</h4>
                {song.comments && song.comments.length > 0 ? (
                  <div className="space-y-1 mb-2">
                    {song.comments.map((c, index) => (
                      <p key={index} className="text-sm">
                        <strong>{c.username}:</strong> {c.comment}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm mb-2 text-gray-500">No comments yet.</p>
                )}
                <input
                  type="text"
                  value={commentInputs[song._id] || ""}
                  onChange={(e) => handleCommentChange(e, song._id)}
                  placeholder="Add a comment"
                  className="border rounded p-1 w-full mb-2"
                />
                <button
                  onClick={() => handleAddComment(song._id)}
                  className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200"
                >
                  Comment
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-gray-500">No songs uploaded yet.</p>
      )}
    </div>
  );
}

export default SongList;
