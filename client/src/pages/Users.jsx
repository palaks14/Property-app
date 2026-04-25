import axios from "axios";
import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import toast from "react-hot-toast";

function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    const res = await axios.get("/api/users");
    setUsers(res.data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const approve = async (id) => {
    await axios.put(`/api/approve/${id}`);
    toast.success("Approved");
    fetchUsers();
  };

  const deleteUser = async (id) => {
    await axios.delete(`/api/user/${id}`);
    toast.success("Deleted");
    fetchUsers();
  };

  return (
    <div className="flex bg-black text-white min-h-screen">

      <Sidebar />

      <div className="ml-64 p-6 w-full">

        <h1 className="text-3xl mb-6">👥 Users</h1>

        <input
          placeholder="Search..."
          className="p-3 mb-4 w-full bg-gray-800 rounded"
          onChange={(e) => setSearch(e.target.value)}
        />

        {users
          .filter(u => u.name.toLowerCase().includes(search.toLowerCase()))
          .map(user => (

            <div key={user._id} className="bg-white/10 p-4 rounded-xl mb-3 flex justify-between">

              <div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <p>{user.role}</p>
              </div>

              <div className="flex gap-2">

                {!user.isApproved && user.role === "landlord" && (
                  <button onClick={() => approve(user._id)} className="bg-green-600 px-3 py-1 rounded">
                    Approve
                  </button>
                )}

                <button onClick={() => deleteUser(user._id)} className="bg-red-600 px-3 py-1 rounded">
                  Delete
                </button>

              </div>

            </div>
          ))}

      </div>
    </div>
  );
}

export default Users;
