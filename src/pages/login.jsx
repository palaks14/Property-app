import axios from "axios";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    try {
      const res = await axios.post("http://localhost:5000/login", {
        email,
        password
      });

      const token = res.data.token;
      localStorage.setItem("token", token);
      localStorage.setItem("role", res.data.role);

      if (res.data.role === "admin") {
        navigate("/admin");
        return;
      }

      if (res.data.role === "tenant") {
        navigate("/tenant");
        return;
      }

      const profileRes = await axios.get("http://localhost:5000/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!profileRes.data.profileCompleted) {
        navigate("/complete-profile");
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data || "Login failed");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-2xl shadow-lg w-80">
        <h2 className="text-xl font-bold mb-4">Login</h2>

        <input
          className="w-full border p-2 mb-3 rounded"
          placeholder="Email"
          onChange={e => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-2 mb-3 rounded"
          type="password"
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
        />

        <button
          onClick={login}
          className="w-full bg-blue-600 text-white p-2 rounded-xl"
        >
          Login
        </button>

        <p className="mt-3 text-sm">
          Don’t have an account? <Link to="/register" className="text-blue-600">Register</Link>
        </p>
      </div>

    </div>
  );
}

export default Login;