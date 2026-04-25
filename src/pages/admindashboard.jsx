import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <button
          onClick={logout}
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          Logout
        </button>
      </div>
      <p>Approve users from backend (API ready)</p>
    </div>
  );
}

export default AdminDashboard;
