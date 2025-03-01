import { useState, useEffect } from "react";

function SongList() {
  const [songs, setSongs] = useState([]);
  const [error, setError] = useState(null);

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
                  src={`http://localhost:8000/files/${song.filename}`}
                  type="audio/mpeg"
                />
                Your browser does not support the audio element.
              </audio>
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
