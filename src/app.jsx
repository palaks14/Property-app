import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import AdminDashboard from "./pages/AdminDashboard";
import TenantDashboard from "./pages/TenantDashboard";
import CompleteProfile from "./pages/CompleteProfile";
import RoleRoute from "./components/RoleRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard"
          element={<RoleRoute role="landlord"><Dashboard /></RoleRoute>}
        />

        <Route path="/complete-profile"
          element={<RoleRoute role="landlord"><CompleteProfile /></RoleRoute>}
        />

        <Route path="/admin"
          element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>}
        />

        <Route path="/tenant"
          element={<RoleRoute role="tenant"><TenantDashboard /></RoleRoute>}
        />

        <Route path="/payments" element={<Payments />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;