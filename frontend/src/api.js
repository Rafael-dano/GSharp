import axios from "axios";

const API_URL = "https://gsharp.onrender.com"; // Updated Backend URL with /api prefix

// Helper function to get token
const getToken = () => localStorage.getItem("token");

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
      { headers: { "Content-Type": "application/json" } }
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
    const token = getToken();
    if (!token) {
      console.log("No token found!");
      return;
    }

    const response = await axios.get(`${API_URL}/protected`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("Protected data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching protected data:", error.response?.data?.detail || error.message);
    throw new Error(error.response?.data?.detail || "Failed to fetch protected data");
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
    const token = getToken();
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

// Like a Song
export const likeSong = async (songId) => {
  try {
    const token = getToken();
    if (!token) throw new Error("No token found. Please log in.");

    const response = await axios.post(`${API_URL}/songs/${songId}/like`, null, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error liking song:", error.response?.data?.detail || error.message);
    throw new Error(error.response?.data?.detail || "Failed to like song");
  }
};

// Add Comment to a Song
export const addComment = async (songId, comment) => {
  try {
    const token = getToken();
    if (!token) throw new Error("No token found. Please log in.");

    const response = await axios.post(
      `${API_URL}/songs/${songId}/comments`,
      { content: comment },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error adding comment:", error.response?.data?.detail || error.message);
    throw new Error(error.response?.data?.detail || "Failed to add comment");
  }
};

// Logout User
export const logoutUser = () => {
  localStorage.removeItem("token");
};
