import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    role: "tenant"
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const nextErrors = {};

    if (!data.name.trim()) nextErrors.name = "Name is required.";
    if (!data.email.trim()) nextErrors.email = "Email is required.";
    if (!data.password.trim()) nextErrors.password = "Password is required.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const register = async () => {
    if (!validate()) return;

    const payload = {
      ...data
    };

    try {
      await axios.post("http://localhost:5000/register", payload);

      if (data.role === "landlord") {
        alert("Landlord registered successfully. Wait for admin approval before login.");
      } else {
        alert("Registered successfully. Please login.");
      }

      navigate("/");
    } catch (err) {
      alert(err.response?.data || "Registration failed");
    }
  };

  const fieldClass = "w-full border p-2 mb-2 rounded";
  const errorClass = "text-xs text-red-600 mb-3";

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-3">Create your account</h2>
        <p className="text-sm text-slate-500 mb-6">
          Choose your role. Landlords will be approved by admin first, then complete property details after login.
        </p>

        <input
          className={fieldClass}
          placeholder="Full name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
        {errors.name && <p className={errorClass}>{errors.name}</p>}

        <input
          className={fieldClass}
          placeholder="Email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
        />
        {errors.email && <p className={errorClass}>{errors.email}</p>}

        <input
          className={fieldClass}
          placeholder="Password"
          type="password"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
        />
        {errors.password && <p className={errorClass}>{errors.password}</p>}

        <select
          className={fieldClass}
          value={data.role}
          onChange={(e) => setData({ ...data, role: e.target.value })}
        >
          <option value="tenant">Tenant</option>
          <option value="landlord">Landlord</option>
        </select>

        <button
          onClick={register}
          className="w-full bg-green-600 hover:bg-green-700 transition text-white p-3 rounded-xl"
        >
          Register
        </button>
      </div>
    </div>
  );
}

export default Register;