import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [title, setTitle] = useState("");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  const fetchData = async () => {
    const res = await axios.get("http://localhost:5000/properties");
    setProperties(res.data);
  };

  const checkProfile = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const profileRes = await axios.get("http://localhost:5000/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!profileRes.data.profileCompleted) {
        navigate("/complete-profile");
      }
    } catch (err) {
      console.warn("Unable to verify profile completion", err);
    }
  };

  const addProperty = async () => {
    await axios.post("http://localhost:5000/property", {
      title,
      price: 1000,
      location: "Delhi"
    });
    fetchData();
  };

  useEffect(() => {
    fetchData();
    checkProfile();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Landlord Dashboard</h2>
        <button
          onClick={logout}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Logout
        </button>
      </div>

      <input
        className="border p-2 mr-2"
        placeholder="Property Title"
        onChange={e => setTitle(e.target.value)}
      />

      <button
        onClick={addProperty}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Property
      </button>

      <div className="mt-6">
        {properties.map(p => (
          <div key={p._id} className="bg-white p-4 mb-2 shadow rounded">
            {p.title} - ₹{p.price}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
