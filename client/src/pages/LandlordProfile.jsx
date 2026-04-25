import { useEffect, useState } from "react";
import LandlordLayout from "../components/landlord/LandlordLayout";
import ProfileCard from "../components/common/ProfileCard";
import UploadImage from "../components/common/UploadImage";
import InputField from "../components/auth/InputField";
import Button from "../components/auth/Button";
import { getSessionUser } from "../utils/sessionUser";
import { getFullProfile, saveBaseUserProfile, saveLandlordProfile, uploadProfileImage } from "../services/profileService";

function LandlordProfile() {
  const session = getSessionUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    propertyName: "",
    propertyLocation: "",
    propertyImage: "",
    propertyPrice: "",
    propertyFacilities: ""
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!session.id) {
        setLoading(false);
        return;
      }

      try {
        const data = await getFullProfile(session.id);
        if (data) {
          setProfile(data);
          setForm({
            name: data.name || "",
            phone: data.phone || "",
            propertyName: data.propertyName || "",
            propertyLocation: data.propertyLocation || "",
            propertyImage: data.propertyImage || "",
            propertyPrice: data.propertyPrice ? String(data.propertyPrice) : "",
            propertyFacilities: data.propertyFacilities || ""
          });
        }
      } catch (error) {
        console.error("Landlord profile load failed", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [session.id]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!profile?.id) return;
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      let profilePicUrl = profile.profilePic || profile.profilePicUrl || "";
      if (photoFile) {
        profilePicUrl = await uploadProfileImage(photoFile, profile.id);
      }

      await saveBaseUserProfile(profile.id, {
        name: form.name,
        phone: form.phone,
        profilePic: profilePicUrl,
        profileCompleted: true
      });

      await saveLandlordProfile(profile.id, {
        propertyName: form.propertyName,
        propertyLocation: form.propertyLocation,
        propertyImage: form.propertyImage,
        propertyPrice: Number(form.propertyPrice) || 0,
        propertyFacilities: form.propertyFacilities
      });

      const updatedProfile = {
        ...profile,
        name: form.name,
        phone: form.phone,
        profilePic: profilePicUrl,
        propertyName: form.propertyName,
        propertyLocation: form.propertyLocation,
        propertyImage: form.propertyImage,
        propertyPrice: Number(form.propertyPrice) || 0,
        propertyFacilities: form.propertyFacilities,
        profileCompleted: true
      };
      setProfile(updatedProfile);
      setStatus({ type: "success", message: "Landlord profile updated." });
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Unable to save landlord profile." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <LandlordLayout
      title="Landlord profile"
      subtitle="View and edit your landlord account and property details."
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search profile settings..."
    >
      {loading ? (
        <div className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-6 w-40 rounded-full bg-slate-200" />
          <div className="h-40 rounded-[28px] bg-slate-200" />
        </div>
      ) : !profile ? (
        <div className="saas-panel">No landlord profile data available.</div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-5">
            <ProfileCard profile={profile} editable={false} />
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Landlord profile overview</h3>
              <p className="mt-2 text-sm text-slate-600">All account and property details for your landlord profile.</p>

              <div className="mt-6 grid gap-4">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Account details</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Full name</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.name || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Email</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.email || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Phone</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.phone || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Role</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.role || "landlord"}</p>
                    </div>
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Approval status</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.isApproved ? "Approved" : "Pending approval"}</p>
                    </div>
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Profile completed</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.profileCompleted ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Property details</h4>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Property name</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.propertyName || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Location</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.propertyLocation || "Not set"}</p>
                    </div>
                    <div>
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Rent amount</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.propertyPrice ? `₹${profile.propertyPrice}` : "Not set"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[0.72rem] uppercase tracking-[0.24em] text-slate-500">Facilities</p>
                      <p className="mt-1 text-sm text-slate-900">{profile.propertyFacilities ? String(profile.propertyFacilities).replace(/,/g, ", ") : "Not set"}</p>
                    </div>
                  </div>
                  {profile.propertyImage ? (
                    <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <img src={profile.propertyImage} alt={profile.propertyName || "Property image"} className="h-48 w-full object-cover" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Edit landlord profile</h3>
            <p className="mt-2 text-sm text-slate-600">Update your profile and landlord property details here.</p>
            <form className="mt-6 space-y-5" onSubmit={handleSave}>
              <UploadImage
                label="Profile photo"
                hint="Upload an image for your landlord account."
                value={photoFile}
                onChange={setPhotoFile}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Full name"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <InputField
                  label="Phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Property name"
                  value={form.propertyName}
                  onChange={(event) => setForm((prev) => ({ ...prev, propertyName: event.target.value }))}
                />
                <InputField
                  label="Location"
                  value={form.propertyLocation}
                  onChange={(event) => setForm((prev) => ({ ...prev, propertyLocation: event.target.value }))}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Property image URL"
                  value={form.propertyImage}
                  onChange={(event) => setForm((prev) => ({ ...prev, propertyImage: event.target.value }))}
                />
                <InputField
                  label="Rent amount"
                  type="number"
                  value={form.propertyPrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, propertyPrice: event.target.value }))}
                />
              </div>

              <InputField
                label="Facilities"
                hint="Comma-separated list"
                value={form.propertyFacilities}
                onChange={(event) => setForm((prev) => ({ ...prev, propertyFacilities: event.target.value }))}
              />

              {status.message ? (
                <div className={`rounded-3xl border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  {status.message}
                </div>
              ) : null}

              <Button type="submit" loading={saving} disabled={saving}>
                Save landlord profile
              </Button>
            </form>
          </div>
        </section>
      )}
    </LandlordLayout>
  );
}

export default LandlordProfile;
