import { useEffect, useState } from "react";
import { getProtectedData, logoutUser } from "../api";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getProtectedData();
        setMessage(data.message);
      } catch (error) {
        console.error("Error fetching protected data:", error);
        logoutUser(); // Clear token
        navigate("/login"); // Redirect to login
      }
    };

    fetchData();
  }, [navigate]);

  return (
    <div>
      <h2>Dashboard</h2>
      <p>{message}</p>
      <button onClick={() => { logoutUser(); navigate("/login"); }}>Logout</button>
    </div>
  );
}

export default Dashboard;
