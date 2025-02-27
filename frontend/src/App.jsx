import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import MusicUpload from "./components/MusicUpload";


function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" />} /> {/* Redirect unknown routes */}
        <Route path="/upload" element={<ProtectedRoute><MusicUpload /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

function Navbar() {
  const token = localStorage.getItem("token");

  return (
    <nav style={{ padding: "10px", background: "#333", color: "white", display: "flex", justifyContent: "space-between" }}>
      <Link to="/" style={{ color: "white", textDecoration: "none", fontSize: "20px" }}>GSharp Hub</Link>
      <div>
        {token ? (
          <>
            <Link to="/dashboard" style={{ color: "white", marginRight: "10px" }}>Dashboard</Link>
            <Link to="/upload" style={{ color: "white", marginRight: "10px" }}>Music Upload</Link>
            <button onClick={handleLogout} style={{ background: "red", color: "white", border: "none", padding: "5px 10px", cursor: "pointer" }}>Logout</button>
          </>
        ) : (
          <Link to="/login" style={{ color: "white" }}>Login</Link>
        )}
      </div>
    </nav>
  );
}

function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

export default App;
