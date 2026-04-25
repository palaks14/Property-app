import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function TenantDashboard() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);

  const fetch = async () => {
    const res = await axios.get("http://localhost:5000/properties");
    setProperties(res.data);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  useEffect(() => {
    fetch();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tenant Dashboard</h2>
        <button
          onClick={logout}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Logout
        </button>
      </div>

      {properties.map(p => (
        <div key={p._id} className="bg-white p-4 mb-2 shadow rounded">
          {p.title} - ₹{p.price}
        </div>
      ))}
    </div>
  );
}

export default TenantDashboard;
