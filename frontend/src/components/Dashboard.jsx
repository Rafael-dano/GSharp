import { useEffect, useState } from "react";
import { getProtectedData, logoutUser } from "../api";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getProtectedData();
        if (data?.message) {
          setMessage(data.message);
        } else {
          throw new Error("Invalid response from server.");
        }
      } catch (error) {
        console.error("Error fetching protected data:", error);
        setError("Session expired. Please log in again.");
        logoutUser(); // Clear token
        navigate("/login"); // Redirect to login
      }
    };

    fetchData();
  }, [navigate]);

  return (
    <div>
      <h2>Dashboard</h2>
      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <p>{message || "Loading..."}</p>
      )}
      <button onClick={() => { logoutUser(); navigate("/login"); }}>
        Logout
      </button>
    </div>
  );
}

export default Dashboard;
