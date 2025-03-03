import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, getProtectedData } from "../api";  // Import loginUser
import axios from "axios";

const API_URL = "https://gsharp.onrender.com";  // Backend URL

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(`${API_URL}/api/login`, {  // Updated URL
        username,
        password,
      });

      const data = response.data;
      localStorage.setItem("token", data.access_token);
      await getProtectedData();  // Test the protected route
      navigate("/dashboard");
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          setError("API endpoint not found (404). Check the server URL.");
        } else if (error.response.status === 401) {
          setError("Invalid username or password.");
        } else {
          setError(error.response.data?.detail || "Login failed. Please try again.");
        }
      } else {
        setError("Network error. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}

export default Login;
