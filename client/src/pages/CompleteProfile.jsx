import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LandlordLayout from "../components/landlord/LandlordLayout";
import TenantLayout from "../components/tenant/TenantLayout";
import ProfileCard from "../components/common/ProfileCard";
import UploadImage from "../components/common/UploadImage";
import InputField from "../components/auth/InputField";
import Button from "../components/auth/Button";
import { getSessionUser } from "../utils/sessionUser";
import { getFullProfile, saveBaseUserProfile, uploadProfileImage } from "../services/profileService";

function CompleteProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const session = getSessionUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    preferredLocation: "",
    budget: "",
    propertyName: "",
    propertyLocation: "",
    propertyImage: "",
    propertyPrice: "",
    propertyFacilities: ""
  });

  const roleFromUrl = searchParams.get("role") || "";
  const role = roleFromUrl || session.role || profile?.role || "tenant";
  const isTenant = role === "tenant";
  const Layout = isTenant ? TenantLayout : LandlordLayout;

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
            preferredLocation: data.preferredLocation || "",
            budget: data.budget || "",
            propertyName: data.propertyName || "",
            propertyLocation: data.propertyLocation || "",
            propertyImage: data.propertyImage || "",
            propertyPrice: data.propertyPrice ? String(data.propertyPrice) : "",
            propertyFacilities: data.propertyFacilities || ""
          });
        }
      } catch (error) {
        console.error("CompleteProfile load failed", error);
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

      const payload = {
        name: form.name,
        phone: form.phone,
        profilePic: profilePicUrl,
        profileCompleted: true
      };

      if (isTenant) {
        payload.preferredLocation = form.preferredLocation;
        payload.budget = form.budget;
      } else {
        payload.propertyName = form.propertyName;
        payload.propertyLocation = form.propertyLocation;
        payload.propertyImage = form.propertyImage;
        payload.propertyPrice = Number(form.propertyPrice) || 0;
        payload.propertyFacilities = form.propertyFacilities;
      }

      await saveBaseUserProfile(profile.id, payload);

      if (isTenant) {
        localStorage.setItem("profileCompleted", "true");
      }

      setStatus({ type: "success", message: "Profile saved successfully. Redirecting now..." });
      window.setTimeout(() => navigate(isTenant ? "/tenant-dashboard" : "/landlord-dashboard"), 800);
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Unable to save profile. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      title={isTenant ? "Complete tenant profile" : "Complete landlord profile"}
      subtitle={
        searchParams.get("source") === "signup"
          ? isTenant
            ? "Add your profile photo and preferences before using the tenant dashboard."
            : "Finish your landlord setup to start listing properties."
          : isTenant
            ? "Complete your tenant account details and preferences."
            : "Complete or update your landlord account details."
      }
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search settings..."
    >
      {loading ? (
        <div className="space-y-4 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-6 w-40 rounded-full bg-slate-200" />
          <div className="h-40 rounded-[28px] bg-slate-200" />
        </div>
      ) : !profile ? (
        <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 text-slate-900">
          <h2 className="text-lg font-semibold">Profile not available</h2>
          <p className="mt-3 text-sm text-slate-600">
            We could not load your account details. Please refresh the page or sign in again.
          </p>
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-5">
            <ProfileCard profile={profile} editable={false} />
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">What we need</h3>
              <p className="mt-3 text-sm text-slate-600">
                {isTenant
                  ? "A profile photo and some simple preferences help match you to the right properties."
                  : "A landlord profile lets you publish listings, manage bookings, and track requests."
                }
              </p>
              <div className="mt-5 space-y-3 text-sm text-slate-700">
                {isTenant ? (
                  <>
                    <p><span className="font-semibold">Recommended:</span> profile photo, preferred location, and budget.</p>
                    <p><span className="font-semibold">Tip:</span> a clear profile picture builds trust with landlords.</p>
                  </>
                ) : (
                  <>
                    <p><span className="font-semibold">Required:</span> property name, location, price, and facilities.</p>
                    <p><span className="font-semibold">Tip:</span> keep your property description concise and accurate.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">{isTenant ? "Tenant profile setup" : "Landlord profile setup"}</h3>
            <p className="mt-2 text-sm text-slate-600">Save your details to continue.</p>
            <form className="mt-6 space-y-5" onSubmit={handleSave}>
              <UploadImage
                label="Profile photo"
                hint="Upload a photo to personalize your account."
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

              {isTenant ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <InputField
                    label="Preferred location"
                    value={form.preferredLocation}
                    onChange={(event) => setForm((prev) => ({ ...prev, preferredLocation: event.target.value }))}
                  />
                  <InputField
                    label="Budget"
                    value={form.budget}
                    onChange={(event) => setForm((prev) => ({ ...prev, budget: event.target.value }))}
                  />
                </div>
              ) : (
                <>
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
                      label="Price"
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
                </>
              )}

              {status.message ? (
                <div className={`rounded-3xl border px-4 py-3 text-sm ${status.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  {status.message}
                </div>
              ) : null}
              <Button type="submit" loading={saving} disabled={saving}>
                Save profile
              </Button>
            </form>
          </div>
        </section>
      )}
    </Layout>
  );
}

export default CompleteProfile;
