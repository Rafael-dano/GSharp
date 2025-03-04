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
        handleLogout(); // Use handleLogout to clear token and redirect
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
      {error ? (
        <p className="text-red-500 mb-4">{error}</p>
      ) : (
        <p className="mb-4">{message || "Loading..."}</p>
      )}
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
      >
        Logout
      </button>
    </div>
  );
}

export default Dashboard;
