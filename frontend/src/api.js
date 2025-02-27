import axios from "axios";

const API_URL = "https://gsharp.onrender.com/"; // Update this if your backend is deployed

// Register User
export const registerUser = async (username, password) => {
  try {
    const response = await axios.post(`${API_URL}/register`, { username, password });
    return response.data;
  } catch (error) {
    console.error("Registration error:", error.response?.data?.detail || error.message);
    throw new Error(error.response?.data?.detail || "Registration failed");
  }
};

// Login User
export const loginUser = async (username, password) => {
  try {
    const response = await axios.post(
      `${API_URL}/login`,
      { username, password }, 
      { headers: { "Content-Type": "application/json" } } // Explicitly set JSON headers
    );

    if (response.data.access_token) {
      localStorage.setItem("token", response.data.access_token);
    }

    return response.data;
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || "Login failed");
  }
};


// Get Protected Data
export const getProtectedData = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found. Please log in.");

    const response = await axios.get(`${API_URL}/protected`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    console.error("Protected route error:", error.response?.data?.detail || error.message);
    throw new Error(error.response?.data?.detail || "Access denied");
  }
};

// Logout User (Optional)
export const logoutUser = () => {
  localStorage.removeItem("token");
};
