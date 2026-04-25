import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Payments from "./pages/Payments";
import AdminDashboard from "./pages/AdminDashboard";
import TenantDashboard from "./pages/TenantDashboard";
import LandlordProfile from "./pages/LandlordProfile";
import RoleRoute from "./components/RoleRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import CompleteProfile from "./pages/CompleteProfile";
import PublicProfile from "./pages/PublicProfile";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Queries from "./pages/Queries";
import AdminUsers from "./pages/AdminUsers";
import AdminQueries from "./pages/AdminQueries";
import TenantBrowse from "./pages/TenantBrowse";
import TenantBookings from "./pages/TenantBookings";
import TenantPropertyDetails from "./pages/TenantPropertyDetails";
import TenantProfile from "./pages/TenantProfile";
import TenantSupport from "./pages/TenantSupport";
import TenantNotifications from "./pages/TenantNotifications";
import TenantMaintenance from "./pages/TenantMaintenance";
import AdminMaintenance from "./pages/AdminMaintenance";
import LandlordMaintenance from "./pages/LandlordMaintenance";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<PublicProfile />} />

        {/* Dashboards */}
        <Route path="/dashboard"
          element={<RoleRoute role="landlord"><Dashboard /></RoleRoute>}
        />
        <Route path="/landlord-dashboard"
          element={<RoleRoute role="landlord"><Dashboard /></RoleRoute>}
        />
        <Route path="/dashboard/properties"
          element={<RoleRoute role="landlord"><Dashboard /></RoleRoute>}
        />
        <Route path="/dashboard/add-property"
          element={<RoleRoute role="landlord"><Dashboard /></RoleRoute>}
        />
        <Route path="/dashboard/bookings"
          element={<RoleRoute role="landlord"><Dashboard /></RoleRoute>}
        />
        <Route path="/dashboard/earnings"
          element={<RoleRoute role="landlord"><Dashboard /></RoleRoute>}
        />
        <Route path="/dashboard/profile"
          element={<RoleRoute role="landlord"><LandlordProfile /></RoleRoute>}
        />
        <Route path="/dashboard/maintenance"
          element={<RoleRoute role="landlord"><LandlordMaintenance /></RoleRoute>}
        />
        <Route path="/properties"
          element={<RoleRoute role="landlord"><Dashboard /></RoleRoute>}
        />
        <Route path="/maintenance"
          element={<RoleRoute role="landlord"><LandlordMaintenance /></RoleRoute>}
        />

        <Route path="/admin"
          element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>}
        />
        <Route path="/admin/properties"
          element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>}
        />
        <Route path="/admin/bookings"
          element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>}
        />
        <Route path="/admin/payments"
          element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>}
        />
        <Route path="/admin/reports"
          element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>}
        />
        <Route path="/admin/settings"
          element={<RoleRoute role="admin"><AdminDashboard /></RoleRoute>}
        />
        <Route path="/admin/maintenance"
          element={<RoleRoute role="admin"><AdminMaintenance /></RoleRoute>}
        />

        <Route path="/tenant"
          element={<RoleRoute role="tenant"><TenantDashboard /></RoleRoute>}
        />
        <Route path="/tenant-dashboard"
          element={<RoleRoute role="tenant"><TenantDashboard /></RoleRoute>}
        />
        <Route path="/tenant/browse"
          element={<RoleRoute role="tenant"><TenantBrowse /></RoleRoute>}
        />
        <Route path="/tenant/property/:propertyId"
          element={<RoleRoute role="tenant"><TenantPropertyDetails /></RoleRoute>}
        />
        <Route path="/tenant/bookings"
          element={<RoleRoute role="tenant"><TenantBookings /></RoleRoute>}
        />
        <Route path="/tenant/payments"
          element={<RoleRoute role="tenant"><Payments /></RoleRoute>}
        />
        <Route path="/tenant/profile"
          element={<RoleRoute role="tenant"><TenantProfile /></RoleRoute>}
        />
        <Route path="/tenant/maintenance"
          element={<RoleRoute role="tenant"><TenantMaintenance /></RoleRoute>}
        />
        <Route path="/tenant/support"
          element={<RoleRoute role="tenant"><TenantSupport /></RoleRoute>}
        />
        <Route path="/tenant/notifications"
          element={<RoleRoute role="tenant"><TenantNotifications /></RoleRoute>}
        />

        {/* New Pages */}
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/queries" element={<RoleRoute role="tenant"><Queries /></RoleRoute>} />

        {/* Payment */}
        <Route path="/payments" element={<RoleRoute role="tenant"><Payments /></RoleRoute>} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/queries" element={<AdminQueries />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
