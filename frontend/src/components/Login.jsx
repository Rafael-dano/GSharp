import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Import navigation hook
import { loginUser } from "../api"; 

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); 
  const navigate = useNavigate(); // Initialize navigation

  const handleLogin = async () => {
    try {
      const data = await loginUser(username, password);
      localStorage.setItem("token", data.access_token); // Store token
      navigate("/dashboard"); // Redirect after login
    } catch (error) {
      setError(error.message); // Show error message
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>} {/* Show error */}
      <input
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Login</button>
    </div>
  );
}

export default Login;
