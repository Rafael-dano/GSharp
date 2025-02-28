import axios from "axios";

const API_URL = "https://gsharp.onrender.com"; //backend 

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

// Get Songs
export const getSongs = async () => {
  try {
    const response = await axios.get(`${API_URL}/songs`);
    return response.data;
  } catch (error) {
    console.error("Error fetching songs:", error.response?.data?.detail || error.message);
    throw new Error(error.response?.data?.detail || "Failed to fetch songs");
  }
};

// Upload Music File
export const uploadMusic = async (file) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found. Please log in.");

    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Upload error:", error.response?.data?.detail || error.message);
    throw new Error(error.response?.data?.detail || "Upload failed");
  }
};

// Logout User
export const logoutUser = () => {
  localStorage.removeItem("token");
};
