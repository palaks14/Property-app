import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function CompleteProfile() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    name: "",
    phone: "",
    profilePic: "",
    propertyName: "",
    propertyLocation: "",
    propertyImage: "",
    price: ""
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const authHeaders = {
    headers: { Authorization: `Bearer ${token}` }
  };

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await axios.get("http://localhost:5000/profile", authHeaders);
        const profile = res.data;

        if (profile.role !== "landlord") {
          navigate("/");
          return;
        }

        if (profile.profileCompleted) {
          navigate("/dashboard");
          return;
        }

        setData({
          name: profile.name || "",
          phone: profile.phone || "",
          profilePic: profile.profilePic || "",
          propertyName: profile.propertyName || "",
          propertyLocation: profile.propertyLocation || "",
          propertyImage: profile.propertyImage || "",
          price: profile.propertyPrice ? String(profile.propertyPrice) : ""
        });
      } catch (err) {
        console.error("Unable to load profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token, navigate]);

  const validate = () => {
    const next = {};
    if (!data.name.trim()) next.name = "Name is required.";
    if (!data.phone.trim()) next.phone = "Phone number is required.";
    if (!data.profilePic.trim()) next.profilePic = "Profile picture URL is required.";
    if (!data.propertyName.trim()) next.propertyName = "Property name is required.";
    if (!data.propertyLocation.trim()) next.propertyLocation = "Property location is required.";
    if (!data.propertyImage.trim()) next.propertyImage = "Property image URL is required.";
    if (!data.price.trim() || Number(data.price) <= 0) next.price = "Rent amount must be greater than 0.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;

    try {
      await axios.put(
        "http://localhost:5000/profile",
        {
          name: data.name,
          phone: data.phone,
          profilePic: data.profilePic,
          propertyName: data.propertyName,
          propertyLocation: data.propertyLocation,
          propertyImage: data.propertyImage,
          propertyPrice: Number(data.price),
          profileCompleted: true
        },
        authHeaders
      );

      alert("Profile completed successfully.");
      navigate("/dashboard");
    } catch (err) {
      alert(err.response?.data?.message || "Unable to complete profile");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-3">Complete your landlord profile</h2>
        <p className="text-sm text-slate-500 mb-6">
          Your landlord account has been approved. Please finish your profile to start listing properties.
        </p>

        <input
          className="w-full border p-2 mb-2 rounded"
          placeholder="Full name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
        />
        {errors.name && <p className="text-xs text-red-600 mb-3">{errors.name}</p>}

        <input
          className="w-full border p-2 mb-2 rounded"
          placeholder="Phone number"
          value={data.phone}
          onChange={(e) => setData({ ...data, phone: e.target.value })}
        />
        {errors.phone && <p className="text-xs text-red-600 mb-3">{errors.phone}</p>}

        <input
          className="w-full border p-2 mb-2 rounded"
          placeholder="Profile picture URL"
          value={data.profilePic}
          onChange={(e) => setData({ ...data, profilePic: e.target.value })}
        />
        {errors.profilePic && <p className="text-xs text-red-600 mb-3">{errors.profilePic}</p>}

        <input
          className="w-full border p-2 mb-2 rounded"
          placeholder="Property name"
          value={data.propertyName}
          onChange={(e) => setData({ ...data, propertyName: e.target.value })}
        />
        {errors.propertyName && <p className="text-xs text-red-600 mb-3">{errors.propertyName}</p>}

        <input
          className="w-full border p-2 mb-2 rounded"
          placeholder="Property location"
          value={data.propertyLocation}
          onChange={(e) => setData({ ...data, propertyLocation: e.target.value })}
        />
        {errors.propertyLocation && <p className="text-xs text-red-600 mb-3">{errors.propertyLocation}</p>}

        <input
          className="w-full border p-2 mb-2 rounded"
          placeholder="Property image URL"
          value={data.propertyImage}
          onChange={(e) => setData({ ...data, propertyImage: e.target.value })}
        />
        {errors.propertyImage && <p className="text-xs text-red-600 mb-3">{errors.propertyImage}</p>}

        <input
          className="w-full border p-2 mb-2 rounded"
          placeholder="Monthly rent amount"
          type="number"
          min="0"
          value={data.price}
          onChange={(e) => setData({ ...data, price: e.target.value })}
        />
        {errors.price && <p className="text-xs text-red-600 mb-3">{errors.price}</p>}

        <button
          onClick={submit}
          className="w-full bg-green-600 hover:bg-green-700 transition text-white p-3 rounded-xl mt-4"
        >
          Complete profile
        </button>
      </div>
    </div>
  );
}

export default CompleteProfile;
