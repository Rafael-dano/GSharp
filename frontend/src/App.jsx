import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import MusicUpload from "./components/MusicUpload";
import SongList from "./components/SongList";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
  const [songs, setSongs] = useState([]); // Store song list

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem("token"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch uploaded songs
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch("/songs", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSongs(data); // Set songs only if it's an array
        } else {
          setSongs([]); // Avoid errors
        }
      })
      .catch((err) => console.error("Error fetching songs:", err));
  }, [isAuthenticated]);

  return (
    <Router>
      <Navbar isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><MusicUpload /></ProtectedRoute>} />
        <Route path="/songs" element={<ProtectedRoute><SongList songs={songs} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

function Navbar({ isAuthenticated, setIsAuthenticated }) {
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    window.location.href = "/login";
  };

  return (
    <nav style={{ padding: "10px", background: "#333", color: "white", display: "flex", justifyContent: "space-between" }}>
      <Link to="/" style={{ color: "white", textDecoration: "none", fontSize: "20px" }}>GSharp Hub</Link>
      <div>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" style={{ color: "white", marginRight: "10px" }}>Dashboard</Link>
            <Link to="/upload" style={{ color: "white", marginRight: "10px" }}>Music Upload</Link>
            <Link to="/songs" style={{ color: "white", marginRight: "10px" }}>Songs</Link>
            <button onClick={handleLogout} style={{ background: "red", color: "white", border: "none", padding: "5px 10px", cursor: "pointer" }}>Logout</button>
          </>
        ) : (
          <Link to="/login" style={{ color: "white" }}>Login</Link>
        )}
      </div>
    </nav>
  );
}

export default App;
