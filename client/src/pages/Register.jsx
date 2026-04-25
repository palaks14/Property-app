import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createUserWithEmailAndPassword, deleteUser, signInWithPopup, signOut } from "firebase/auth";
import { Building2, Mail, Phone, Shield, Sparkles, User, LockKeyhole } from "lucide-react";
import AuthCard from "../components/auth/AuthCard";
import Button from "../components/auth/Button";
import InputField from "../components/auth/InputField";
import { auth, googleProvider } from "../firebase";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        d="M21.8 12.23c0-.76-.07-1.5-.2-2.2H12v4.16h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.31c1.94-1.79 3.04-4.42 3.04-7.6Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.75 0 5.05-.9 6.73-2.44l-3.31-2.56c-.92.62-2.08.99-3.42.99-2.63 0-4.86-1.77-5.66-4.15H2.92v2.64A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.34 13.84A5.98 5.98 0 0 1 6.02 12c0-.64.11-1.26.32-1.84V7.52H2.92a10 10 0 0 0 0 8.96l3.42-2.64Z"
        fill="#FBBC04"
      />
      <path
        d="M12 5.98c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 2.94 14.75 2 12 2a10 10 0 0 0-9.08 5.52l3.42 2.64C7.14 7.75 9.37 5.98 12 5.98Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromURL = searchParams.get("role") || "tenant";

  const [data, setData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: roleFromURL
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    setData((prev) => ({ ...prev, role: roleFromURL }));
  }, [roleFromURL]);

  const validateField = (field, value) => {
    const trimmed = String(value || "").trim();
    if (field === "name") return trimmed ? "" : "Full name is required.";
    if (field === "email") {
      if (!trimmed) return "Email is required.";
      return /\S+@\S+\.\S+/.test(trimmed) ? "" : "Enter a valid email address.";
    }
    if (field === "phone") {
      if (data.role !== "landlord") return "";
      if (!trimmed) return "Phone number is required.";
      return /^[0-9+\-\s]{8,15}$/.test(trimmed) ? "" : "Enter a valid phone number.";
    }
    if (field === "password") {
      if (!trimmed) return "Password is required.";
      return trimmed.length >= 6 ? "" : "Password must be at least 6 characters.";
    }
    return "";
  };

  const updateField = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    setStatus((prev) => (prev.type === "error" ? { type: "", message: "" } : prev));
  };

  const validateForm = () => {
    const nextErrors = {
      name: validateField("name", data.name),
      email: validateField("email", data.email),
      phone: validateField("phone", data.phone),
      password: validateField("password", data.password)
    };
    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key];
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const getPostSignupPath = (role) => {
    if (role === "landlord") {
      return "/complete-profile?role=landlord&source=signup";
    }

    return "/complete-profile?role=tenant&source=signup";
  };

  const persistSessionAndRedirect = (payload, displayName = "") => {
    localStorage.setItem("token", payload.token);
    localStorage.setItem("role", payload.role);

    if (payload.role === "landlord") {
      localStorage.removeItem("profileCompleted");
      if (displayName) {
        localStorage.setItem("landlord_name", displayName);
      }
    } else {
      localStorage.setItem("profileCompleted", "true");
    }

    window.setTimeout(() => {
      navigate(getPostSignupPath(payload.role));
    }, 700);
  };

  const register = async () => {
    if (!validateForm()) {
      setStatus({ type: "error", message: "Please fix highlighted fields before continuing." });
      return;
    }

    let firebaseCred = null;
    setLoading(true);
    setStatus({ type: "", message: "" });

    try {
      firebaseCred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const idToken = await firebaseCred.user.getIdToken();
      const res = await axios.post("/api/auth/firebase-login", {
        idToken,
        name: data.name,
        phone: data.phone,
        role: data.role,
        mode: "register"
      });

      if (res.data?.requiresApproval) {
        await signOut(auth);
        setStatus({
          type: "success",
          message: "Landlord account created. Wait for admin approval before logging in."
        });
        setTimeout(() => navigate("/"), 900);
        return;
      }

      setStatus({
        type: "success",
        message:
          res.data.role === "landlord"
            ? "Account created successfully. Redirecting to landlord profile setup..."
            : "Account created successfully. Redirecting to your dashboard..."
      });
      persistSessionAndRedirect(res.data, data.name.trim());
    } catch (err) {
      if (firebaseCred?.user) {
        try {
          await deleteUser(firebaseCred.user);
        } catch (_cleanupErr) {}
      }
      setStatus({
        type: "error",
        message: err.response?.data || err.message || "Unable to create account."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setStatus({ type: "", message: "" });
    setErrors((prev) => ({ ...prev, name: "", phone: "" }));

    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      const res = await axios.post("/api/auth/firebase-login", {
        idToken,
        name: cred.user.displayName || data.name.trim() || "Google User",
        phone: data.phone.trim(),
        role: data.role,
        mode: "register"
      });

      if (res.data?.requiresApproval) {
        await signOut(auth);
        setStatus({
          type: "success",
          message: "Landlord account created with Google. Wait for admin approval before logging in."
        });
        window.setTimeout(() => navigate("/"), 900);
        return;
      }

      setStatus({
        type: "success",
        message:
          res.data.role === "landlord"
            ? "Landlord account created with Google. Redirecting to profile setup..."
            : "Tenant account created with Google. Redirecting to your dashboard..."
      });
      persistSessionAndRedirect(res.data, cred.user.displayName || data.name.trim());
    } catch (err) {
      if (err?.code === "auth/popup-blocked") {
        setStatus({
          type: "error",
          message: "Popup was blocked by your browser. Please allow popups and try Google signup again."
        });
        return;
      }

      setStatus({
        type: "error",
        message: err.response?.data || err.message || "Google signup failed."
      });
      try {
        await signOut(auth);
      } catch (_ignored) {}
    } finally {
      setGoogleLoading(false);
    }
  };

  const roleAccent =
    data.role === "tenant"
      ? {
          chip: "text-emerald-200 bg-emerald-400/10 border-emerald-300/20",
          button: "border border-amber-300/20 bg-[linear-gradient(135deg,#f5c518_0%,#d4a017_48%,#8b6a07_100%)] text-slate-950 shadow-[0_24px_54px_-26px_rgba(245,197,24,0.7)] hover:scale-[1.01] hover:shadow-[0_28px_64px_-26px_rgba(245,197,24,0.75)] focus:ring-amber-300/30"
        }
      : {
          chip: "text-amber-200 bg-amber-300/10 border-amber-300/20",
          button: "border border-amber-300/20 bg-[linear-gradient(135deg,#f5c518_0%,#d4a017_48%,#8b6a07_100%)] text-slate-950 shadow-[0_24px_54px_-26px_rgba(245,197,24,0.7)] hover:scale-[1.01] hover:shadow-[0_28px_64px_-26px_rgba(245,197,24,0.75)] focus:ring-amber-300/30"
        };

  const statusClassName = useMemo(() => {
    if (status.type === "error") return "border-rose-400/25 bg-rose-500/10 text-rose-100";
    if (status.type === "success") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100";
    return "";
  }, [status.type]);

  const roleLabel = data.role === "tenant" ? "Tenant" : "Landlord";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06111f] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,197,24,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(43,108,176,0.26),_transparent_28%),linear-gradient(135deg,#06111f_0%,#0d1b2a_45%,#09111c_100%)]" />
        <div className="absolute -left-28 top-12 h-72 w-72 rounded-full bg-amber-300/12 blur-3xl" />
        <div className="absolute right-[-5rem] top-[-4rem] h-80 w-80 rounded-full bg-blue-400/12 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-cyan-300/8 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1480px] items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="w-full max-w-[34rem]"
        >
          <AuthCard
            theme="dark"
            eyebrow="Sign Up"
            title="Create your account"
            subtitle="Join as a tenant or landlord to get started."
            className="max-w-none rounded-[30px] border-white/12 bg-white/8 p-6 shadow-[0_30px_90px_-52px_rgba(0,0,0,0.95)] backdrop-blur-[22px] sm:p-8"
            eyebrowClassName="border-amber-300/20 bg-amber-300/10 px-3.5 py-1.5 text-amber-200"
            titleClassName="text-[2.15rem] text-white sm:text-[2.6rem]"
            subtitleClassName="max-w-md text-white/64"
            footerClassName="border-white/10"
            footer={
              <div className="space-y-3 text-center text-white/60">
                <p className="text-sm">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    className="font-semibold text-amber-300 transition hover:text-amber-200 hover:underline"
                  >
                    Login
                  </button>
                </p>
                <p className="inline-flex items-center gap-2 text-xs font-medium text-white/55">
                  <Shield className="h-3.5 w-3.5 text-amber-300" />
                  Secure signup - Your data is protected.
                </p>
              </div>
            }
          >
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                register();
              }}
            >
              <div>
                <p className="mb-2 text-sm font-medium text-white/72">Select your role</p>
                <div className="relative grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.05] p-1.5">
                  <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className={`absolute left-1.5 top-1.5 h-[calc(100%-0.75rem)] w-[calc(50%-0.375rem)] rounded-xl border shadow-sm ${
                      data.role === "tenant"
                        ? "translate-x-0 border-emerald-300/20 bg-white/10"
                        : "translate-x-full border-amber-300/20 bg-white/10"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => navigate("/register?role=tenant")}
                    className={`relative z-10 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      data.role === "tenant" ? "text-emerald-200" : "text-white/55"
                    }`}
                  >
                    Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/register?role=landlord")}
                    className={`relative z-10 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      data.role === "landlord" ? "text-amber-200" : "text-white/55"
                    }`}
                  >
                    Landlord
                  </button>
                </div>
                <p className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleAccent.chip}`}>
                  Registering as {roleLabel}
                </p>
                {data.role === "landlord" ? (
                  <p className="mt-3 text-sm text-slate-200">
                    Landlord accounts need admin approval first. After approval, you will complete your landlord profile with property details and a profile image.
                  </p>
                ) : null}
              </div>

              <InputField
                theme="dark"
                label="Full Name"
                placeholder={data.role === "tenant" ? "Enter your full name" : "Enter landlord name"}
                value={data.name}
                onChange={(event) => updateField("name", event.target.value)}
                icon={<User className="h-5 w-5" />}
                error={errors.name}
                className="border-white/12 bg-white/[0.08] shadow-none focus-within:border-amber-300/60 focus-within:shadow-[0_0_0_4px_rgba(245,197,24,0.12),0_18px_40px_-26px_rgba(245,197,24,0.35)]"
                labelClassName="text-white/72"
                inputClassName="text-white placeholder:text-white/32"
                iconClassName="text-white/40 group-focus-within:text-amber-300"
                hintClassName="text-white/48"
              />

              <InputField
                theme="dark"
                label="Email"
                type="email"
                placeholder="name@company.com"
                value={data.email}
                onChange={(event) => updateField("email", event.target.value)}
                icon={<Mail className="h-5 w-5" />}
                error={errors.email}
                className="border-white/12 bg-white/[0.08] shadow-none focus-within:border-amber-300/60 focus-within:shadow-[0_0_0_4px_rgba(245,197,24,0.12),0_18px_40px_-26px_rgba(245,197,24,0.35)]"
                labelClassName="text-white/72"
                inputClassName="text-white placeholder:text-white/32"
                iconClassName="text-white/40 group-focus-within:text-amber-300"
                hintClassName="text-white/48"
              />

              <InputField
                theme="dark"
                label="Phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={data.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                icon={<Phone className="h-5 w-5" />}
                error={errors.phone}
                className="border-white/12 bg-white/[0.08] shadow-none focus-within:border-amber-300/60 focus-within:shadow-[0_0_0_4px_rgba(245,197,24,0.12),0_18px_40px_-26px_rgba(245,197,24,0.35)]"
                labelClassName="text-white/72"
                inputClassName="text-white placeholder:text-white/32"
                iconClassName="text-white/40 group-focus-within:text-amber-300"
                hintClassName="text-white/48"
              />

              <InputField
                theme="dark"
                label="Password"
                type="password"
                placeholder="Create a strong password"
                value={data.password}
                onChange={(event) => updateField("password", event.target.value)}
                icon={<LockKeyhole className="h-5 w-5" />}
                error={errors.password}
                className="border-white/12 bg-white/[0.08] shadow-none focus-within:border-amber-300/60 focus-within:shadow-[0_0_0_4px_rgba(245,197,24,0.12),0_18px_40px_-26px_rgba(245,197,24,0.35)]"
                labelClassName="text-white/72"
                inputClassName="text-white placeholder:text-white/32"
                iconClassName="text-white/40 group-focus-within:text-amber-300"
                hintClassName="text-white/48"
              />

              {status.message ? (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${statusClassName}`}>
                  {status.message}
                </div>
              ) : null}

              <Button
                type="submit"
                variant="unstyled"
                loading={loading}
                loadingText="Creating account..."
                disabled={loading || googleLoading}
                className={roleAccent.button}
                icon={<Sparkles className="h-4 w-4" />}
              >
                Create {roleLabel} Account
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0c1727] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="glass"
                onClick={handleGoogleRegister}
                loading={googleLoading}
                loadingText="Connecting..."
                disabled={loading || googleLoading}
                className="hover:!border-[#4285F4]/35 hover:!bg-[#4285F4]/[0.09]"
                icon={<GoogleIcon />}
              >
                Continue with Google
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-white/55">
                <Building2 className="h-3.5 w-3.5 text-amber-300" />
                Built for secure property workflows
              </div>
            </form>
          </AuthCard>
        </motion.div>
      </div>
    </div>
  );
}

export default Register;

