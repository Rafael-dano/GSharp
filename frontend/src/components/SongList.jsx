import { useState, useEffect } from "react";

function SongList() {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const response = await fetch("http://localhost:8000/songs");
        const data = await response.json();
        setSongs(data);
      } catch (error) {
        console.error("Error fetching songs:", error);
      }
    };

    fetchSongs();
  }, []);

  return (
    <div>
      <h2>Uploaded Songs</h2>
      <ul>
        {songs.map((song) => (
          <li key={song._id}>
            <p>{song.filename}</p>
            <audio controls>
              <source src={`http://localhost:8000/files/${song.filename}`} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SongList;
