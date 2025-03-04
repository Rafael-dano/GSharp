import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, getProtectedData } from "../api";
import axios from "axios";

const API_URL = "https://gsharp.onrender.com";

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
      const response = await axios.post(`${API_URL}/api/login`, {
        username,
        password,
      });

      const data = response.data;
      localStorage.setItem("token", data.access_token);
      await getProtectedData(); 
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
    <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <input
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full p-2 mb-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleLogin}
        disabled={loading}
        className={`w-full p-2 rounded text-white ${loading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"} transition duration-200`}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}

export default Login;
