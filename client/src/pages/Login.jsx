import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  fetchSignInMethodsForEmail,
  getRedirectResult,
  GithubAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect
} from "firebase/auth";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LockKeyhole,
  Mail,
  MapPin,
  Shield,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import AuthCard from "../components/auth/AuthCard";
import Button from "../components/auth/Button";
import InputField from "../components/auth/InputField";
import { auth, githubProvider, googleProvider } from "../firebase";

const initialFormState = { email: "", password: "" };

const featureHighlights = [
  "Curated homes and premium rentals across prime locations",
  "Trusted landlords, transparent workflows, and fast approvals",
  "One elegant workspace for bookings, payments, and support"
];

const trustIndicators = [
  { icon: Shield, label: "Secure login" },
  { icon: Sparkles, label: "Premium experience" },
  { icon: CheckCircle2, label: "Trusted landlords" }
];

const showcaseMetrics = [
  { value: "250+", label: "Luxury listings" },
  { value: "40+", label: "Prime districts" },
  { value: "4.9/5", label: "Renter satisfaction" }
];

const propertyScenes = [
  {
    title: "Skyline Residences",
    detail: "Penthouse living with city views",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Private Villa Collection",
    detail: "Refined spaces for modern families",
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
  },
  {
    title: "Signature Interiors",
    detail: "Concierge-ready premium interiors",
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
  }
];

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path d="M21.8 12.23c0-.76-.07-1.5-.2-2.2H12v4.16h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.31c1.94-1.79 3.04-4.42 3.04-7.6Z" fill="#4285F4" />
      <path d="M12 22c2.75 0 5.05-.9 6.73-2.44l-3.31-2.56c-.92.62-2.08.99-3.42.99-2.63 0-4.86-1.77-5.66-4.15H2.92v2.64A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.34 13.84A5.98 5.98 0 0 1 6.02 12c0-.64.11-1.26.32-1.84V7.52H2.92a10 10 0 0 0 0 8.96l3.42-2.64Z" fill="#FBBC04" />
      <path d="M12 5.98c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 2.94 14.75 2 12 2a10 10 0 0 0-9.08 5.52l3.42 2.64C7.14 7.75 9.37 5.98 12 5.98Z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.76-.24.76-.54v-1.88c-3.11.68-3.77-1.5-3.77-1.5-.5-1.28-1.24-1.62-1.24-1.62-1.02-.7.07-.68.07-.68 1.12.08 1.71 1.15 1.71 1.15 1 .1 1.65-.73 2.03-1.12.1-.73.39-1.23.7-1.52-2.49-.28-5.11-1.25-5.11-5.55 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.43.1-2.98 0 0 .94-.3 3.08 1.14a10.77 10.77 0 0 1 5.6 0c2.14-1.44 3.08-1.14 3.08-1.14.6 1.55.22 2.7.1 2.98.72.78 1.15 1.78 1.15 3 0 4.31-2.63 5.26-5.13 5.54.4.35.76 1.02.76 2.06v3.06c0 .3.2.65.77.54A11.25 11.25 0 0 0 12 .75Z" />
    </svg>
  );
}

function Login() {
  const navigate = useNavigate();
  const [data, setData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loadingMethod, setLoadingMethod] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const validateField = (field, value) => {
    const trimmedValue = value.trim();
    if (field === "email") {
      if (!trimmedValue) return "Email is required.";
      if (!/\S+@\S+\.\S+/.test(trimmedValue)) return "Enter a valid email address.";
      return "";
    }
    if (field === "password") {
      if (!trimmedValue) return "Password is required.";
      return "";
    }
    return "";
  };

  const updateField = (field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    setStatus((prev) => (prev.type === "error" ? { type: "", message: "" } : prev));
  };

  const redirectByRole = (role, profileCompleted = true) => {
    setIsSuccess(true);
    setStatus({ type: "success", message: "Signed in successfully. Redirecting to your workspace..." });
    window.setTimeout(() => {
      if (role === "tenant") {
        navigate(profileCompleted ? "/tenant-dashboard" : "/complete-profile");
      } else if (role === "landlord") {
        navigate(profileCompleted ? "/landlord-dashboard" : "/complete-profile");
      } else {
        navigate("/admin");
      }
    }, 550);
  };

  const finalizeLogin = async (firebaseUser, fallbackName = "") => {
    const idToken = await firebaseUser.getIdToken();
    const res = await axios.post("/api/auth/firebase-login", {
      idToken,
      name: firebaseUser.displayName || fallbackName
    });

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("role", res.data.role);

    if (res.data.role === "admin") {
      redirectByRole("admin");
      return;
    }

    try {
      const profileRes = await axios.get("/api/profile", {
        headers: { Authorization: `Bearer ${res.data.token}` }
      });
      const profileName = profileRes.data?.name || firebaseUser.displayName || fallbackName || "";
      if (res.data.role === "landlord" && profileName) {
        localStorage.setItem("landlord_name", profileName);
      }
      if (res.data.role === "tenant" && profileName) {
        localStorage.setItem("tenant_name", profileName);
      }
      redirectByRole(res.data.role, Boolean(profileRes.data?.profileCompleted));
    } catch (_err) {
      const fallbackProfileName = firebaseUser.displayName || fallbackName || "";
      if (res.data.role === "landlord" && fallbackProfileName) {
        localStorage.setItem("landlord_name", fallbackProfileName);
      }
      if (res.data.role === "tenant" && fallbackProfileName) {
        localStorage.setItem("tenant_name", fallbackProfileName);
      }
      redirectByRole(res.data.role, true);
    }
  };

  const finalizeLegacyLogin = (payload) => {
    localStorage.setItem("token", payload.token);
    localStorage.setItem("role", payload.role);
    redirectByRole(payload.role);
  };

  const getFriendlyAuthError = (err, fallback) => {
    if (err?.code === "auth/popup-blocked") return "Popup was blocked by your browser. Retrying with full-page redirect...";
    if (err?.code === "auth/popup-closed-by-user") return "Popup was closed before completing login.";
    if (err?.code === "auth/cancelled-popup-request") return "Another popup login is already in progress.";
    if (err?.code === "auth/operation-not-allowed") return "GitHub login is not enabled in Firebase Authentication settings.";
    if (err?.code === "auth/unauthorized-domain") return "This app domain is not authorized in Firebase. Add your current host in Authentication > Settings > Authorized domains.";
    if (err?.code === "auth/invalid-credential") return "The email or password is incorrect. Please try again.";
    if (err?.code === "auth/invalid-email") return "Enter a valid email address to continue.";
    if (err?.code === "auth/missing-password") return "Enter your password to continue.";
    if (err?.code === "auth/too-many-requests") return "Too many attempts. Please wait a moment and try again.";
    return err?.response?.data || err?.message || fallback;
  };

  useEffect(() => {
    let cancelled = false;

    const consumeRedirectResult = async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (!cancelled && redirectResult?.user) {
          setLoadingMethod("redirect");
          await finalizeLogin(redirectResult.user, redirectResult.user.displayName || "Social User");
        }
      } catch (err) {
        if (!cancelled) {
          setStatus({ type: "error", message: getFriendlyAuthError(err, "Social login failed after redirect.") });
        }
      } finally {
        if (!cancelled) {
          setLoadingMethod("");
        }
      }
    };

    consumeRedirectResult();

    return () => {
      cancelled = true;
    };
  }, []);

  const providerLabel = (providerId) => {
    if (providerId === "google.com") return "Google";
    if (providerId === "github.com") return "GitHub";
    if (providerId === "password") return "email/password";
    return providerId;
  };

  const resolveAccountConflict = async (err, attemptedProvider) => {
    if (err?.code !== "auth/account-exists-with-different-credential") throw err;

    const email = err?.customData?.email;
    if (!email) {
      setStatus({ type: "error", message: "This email is already in use with another login provider." });
      return null;
    }

    const pendingCredential =
      attemptedProvider === "google"
        ? GoogleAuthProvider.credentialFromError(err)
        : GithubAuthProvider.credentialFromError(err);

    if (!pendingCredential) {
      setStatus({ type: "error", message: "Could not continue login. Please sign in with your existing provider first." });
      return null;
    }

    let signInMethods = [];
    try {
      signInMethods = await fetchSignInMethodsForEmail(auth, email);
    } catch {
      signInMethods = [];
    }

    const verifiedProviders = err?.customData?._tokenResponse?.verifiedProvider || err?.customData?._tokenResponse?.signinMethods || [];
    const detectedMethods = Array.from(
      new Set([...(Array.isArray(signInMethods) ? signInMethods : []), ...(Array.isArray(verifiedProviders) ? verifiedProviders : [])])
    );

    if (detectedMethods.includes("password")) {
      setStatus({ type: "error", message: `An account already exists for ${email} with email and password. Please use your password first.` });
      return null;
    }

    const providersToTry = [];
    if (detectedMethods.includes("google.com")) providersToTry.push(googleProvider);
    if (detectedMethods.includes("github.com")) providersToTry.push(githubProvider);
    if (providersToTry.length === 0) {
      if (attemptedProvider === "google") providersToTry.push(githubProvider);
      if (attemptedProvider === "github") providersToTry.push(googleProvider);
    }

    let lastProviderErr = null;
    for (const provider of providersToTry) {
      try {
        const existingCred = await signInWithPopup(auth, provider);
        await linkWithCredential(existingCred.user, pendingCredential);
        return existingCred.user;
      } catch (providerErr) {
        lastProviderErr = providerErr;
        if (providerErr?.code === "auth/popup-closed-by-user" || providerErr?.code === "auth/cancelled-popup-request") {
          throw providerErr;
        }
      }
    }

    if (lastProviderErr?.code && providersToTry.length > 0) throw lastProviderErr;

    const knownProviders = detectedMethods.map(providerLabel).filter(Boolean).join(", ");
    setStatus({
      type: "error",
      message: knownProviders
        ? `For ${email}, sign in once with ${knownProviders}. Then try this login method again.`
        : `We couldn't detect your original login method for ${email}. Please try Google, GitHub, or email and password first.`
    });

    return null;
  };

  const validateForm = () => {
    const nextErrors = {
      email: validateField("email", data.email),
      password: validateField("password", data.password)
    };
    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key];
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const login = async () => {
    if (!validateForm()) {
      setStatus({ type: "error", message: "Please fix the highlighted fields and try again." });
      return;
    }

    setLoadingMethod("email");
    setStatus({ type: "", message: "" });

    try {
      const cred = await signInWithEmailAndPassword(auth, data.email, data.password);
      await finalizeLogin(cred.user);
    } catch (firebaseErr) {
      const shouldTryLegacy =
        firebaseErr?.code === "auth/invalid-credential" ||
        firebaseErr?.code === "auth/user-not-found" ||
        firebaseErr?.code === "auth/wrong-password";

      if (!shouldTryLegacy) {
        setStatus({ type: "error", message: getFriendlyAuthError(firebaseErr, "Login failed.") });
        setLoadingMethod("");
        return;
      }

      try {
        const legacyRes = await axios.post("/api/login", { email: data.email, password: data.password });
        try {
          const profileRes = await axios.get("/api/profile", {
            headers: { Authorization: `Bearer ${legacyRes.data.token}` }
          });
          const profileName = profileRes.data?.name || "";
          if (legacyRes.data.role === "landlord" && profileName) {
            localStorage.setItem("landlord_name", profileName);
          }
          if (legacyRes.data.role === "tenant" && profileName) {
            localStorage.setItem("tenant_name", profileName);
          }
        } catch (_profileErr) {}
        finalizeLegacyLogin(legacyRes.data);
      } catch (legacyErr) {
        setStatus({ type: "error", message: legacyErr?.response?.data || getFriendlyAuthError(firebaseErr, "Login failed.") });
        setLoadingMethod("");
      }
    }
  };

  const handleGoogle = async () => {
    setLoadingMethod("google");
    setStatus({ type: "", message: "" });
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await finalizeLogin(cred.user, "Google User");
    } catch (err) {
      if (err?.code === "auth/popup-blocked") {
        setStatus({ type: "info", message: "Popup blocked. Redirecting to Google sign-in..." });
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      try {
        const linkedUser = await resolveAccountConflict(err, "google");
        if (linkedUser) await finalizeLogin(linkedUser, "Google User");
        else setLoadingMethod("");
      } catch (innerErr) {
        setStatus({ type: "error", message: getFriendlyAuthError(innerErr, "Google login failed.") });
        setLoadingMethod("");
      }
    }
  };

  const handleGithub = async () => {
    setLoadingMethod("github");
    setStatus({ type: "", message: "" });
    try {
      const cred = await signInWithPopup(auth, githubProvider);
      await finalizeLogin(cred.user, "GitHub User");
    } catch (err) {
      if (err?.code === "auth/popup-blocked") {
        setStatus({ type: "info", message: "Popup blocked. Redirecting to GitHub sign-in..." });
        await signInWithRedirect(auth, githubProvider);
        return;
      }

      try {
        const linkedUser = await resolveAccountConflict(err, "github");
        if (linkedUser) await finalizeLogin(linkedUser, "GitHub User");
        else setLoadingMethod("");
      } catch (innerErr) {
        setStatus({ type: "error", message: getFriendlyAuthError(innerErr, "GitHub login failed.") });
        setLoadingMethod("");
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!data.email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Enter your email to reset your password." }));
      setStatus({ type: "error", message: "Add your email address first, then we can send a reset link." });
      return;
    }
    setLoadingMethod("reset");
    try {
      await sendPasswordResetEmail(auth, data.email.trim());
      setStatus({ type: "success", message: `Password reset email sent to ${data.email.trim()}.` });
    } catch (err) {
      setStatus({ type: "error", message: getFriendlyAuthError(err, "Unable to send reset email.") });
    } finally {
      setLoadingMethod("");
    }
  };

  const statusClassName = useMemo(() => {
    if (status.type === "error") return "border-rose-200 bg-rose-50 text-rose-700";
    if (status.type === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (status.type === "info") return "border-sky-200 bg-sky-50 text-sky-700";
    return "";
  }, [status.type]);

  const isAnyLoading = Boolean(loadingMethod);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06111f] text-white" style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,197,24,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(43,108,176,0.26),_transparent_28%),linear-gradient(135deg,#06111f_0%,#0d1b2a_45%,#09111c_100%)]" />
        <motion.div animate={{ x: [0, 16, 0], y: [0, -12, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} className="absolute -left-28 top-12 h-72 w-72 rounded-full bg-amber-300/12 blur-3xl" />
        <motion.div animate={{ x: [0, -18, 0], y: [0, 14, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} className="absolute right-[-5rem] top-[-4rem] h-80 w-80 rounded-full bg-blue-400/12 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/3 h-72 w-72 rounded-full bg-cyan-300/8 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <motion.section
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative flex min-h-[48vh] w-full items-stretch px-4 pb-4 pt-4 sm:px-6 sm:pb-6 sm:pt-6 lg:min-h-screen lg:w-[56%] lg:px-8 lg:pb-8 lg:pt-8"
        >
          <div className="relative w-full overflow-hidden rounded-[28px] border border-white/10 shadow-[0_30px_120px_-60px_rgba(0,0,0,0.85)]">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${propertyScenes[0].image})` }} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,10,18,0.14),rgba(3,10,18,0.64)_38%,rgba(4,9,17,0.9)_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,197,24,0.18),_transparent_26%),linear-gradient(110deg,rgba(6,17,31,0.72),rgba(6,17,31,0.2),rgba(6,17,31,0.86))]" />
              <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent" />
            </div>

            <div className="relative flex h-full min-h-[48vh] flex-col justify-between p-6 sm:p-8 lg:min-h-[calc(100vh-4rem)] lg:p-10 xl:p-12">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/16 bg-white/10 px-4 py-2.5 shadow-lg shadow-black/10 backdrop-blur-xl">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f5c518] via-[#d6a406] to-[#8c6a00] text-slate-950 shadow-[0_14px_30px_-18px_rgba(245,197,24,0.7)]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-200/90">Property Checker</p>
                    <p className="text-sm text-white/72">Luxury rental marketplace</p>
                  </div>
                </div>

                <div className="hidden items-center gap-2 rounded-full border border-white/12 bg-slate-950/30 px-4 py-2 text-sm text-white/80 backdrop-blur-xl sm:inline-flex">
                  <MapPin className="h-4 w-4 text-amber-300" />
                  Prime locations
                </div>
              </div>

              <div className="max-w-2xl">
                <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}>
                  <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200/90 backdrop-blur-xl" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                    <Compass className="h-3.5 w-3.5" />
                    Premium real estate access
                  </p>
                  <h2 className="max-w-xl text-[2.6rem] font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-[3.4rem] xl:text-[4.35rem]" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                    Find Your Dream Property
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-white/74 sm:text-lg">
                    Premium rentals. Trusted landlords. Seamless experience.
                  </p>
                </motion.div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {showcaseMetrics.map((metric, index) => (
                    <motion.div
                      key={metric.label}
                      initial={{ opacity: 0, y: 22 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: 0.18 + index * 0.08 }}
                      className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-md"
                    >
                      <p className="text-2xl font-semibold text-white">{metric.value}</p>
                      <p className="mt-1 text-sm text-white/60">{metric.label}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                <motion.div
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.24 }}
                  className="min-w-0 rounded-[24px] border border-white/12 bg-slate-950/38 p-5 backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-amber-200">Why residents choose us</p>
                      <h3 className="mt-2 max-w-xl text-2xl font-semibold text-white" style={{ fontFamily: "'Poppins', 'Inter', sans-serif" }}>
                        Premium living, without the friction
                      </h3>
                    </div>
                    <div className="rounded-2xl border border-white/12 bg-white/10 p-3 text-amber-300">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {featureHighlights.map((feature, index) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.28 + index * 0.08 }}
                        className="rounded-2xl border border-white/10 bg-white/6 p-4"
                      >
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <p className="mt-3 text-sm leading-6 text-white/72">{feature}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.55, delay: 0.32 }}
                  className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1"
                >
                  {propertyScenes.map((scene) => (
                    <div key={scene.title} className="group relative min-h-[140px] overflow-hidden rounded-[22px] border border-white/12">
                      <div className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${scene.image})` }} />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,31,0.02),rgba(6,17,31,0.88))]" />
                      <div className="relative flex h-full flex-col justify-end p-4">
                        <p className="text-sm font-semibold text-white">{scene.title}</p>
                        <p className="mt-1 text-xs text-white/70">{scene.detail}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {trustIndicators.map(({ icon: Icon, label }) => (
                  <div key={label} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/72 backdrop-blur-xl">
                    <Icon className="h-4 w-4 text-amber-300" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.12, ease: "easeOut" }}
          className="flex w-full items-center justify-center px-4 pb-8 sm:px-6 sm:pb-10 lg:w-[44%] lg:px-8 lg:py-8"
        >
          <div className="relative w-full max-w-[34rem]">
            <div className="absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_top,_rgba(245,197,24,0.18),_transparent_34%),linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] blur-2xl" />

            <AuthCard
              theme="dark"
              eyebrow="Secure Sign In"
              title="Welcome Back"
              subtitle="Login to continue your journey"
              className="max-w-none rounded-[28px] border-white/12 bg-white/8 p-6 shadow-[0_30px_90px_-52px_rgba(0,0,0,0.95)] backdrop-blur-[22px] sm:p-8"
              eyebrowClassName="border-amber-300/20 bg-amber-300/10 px-3.5 py-1.5 text-amber-200"
              titleClassName="text-[2.2rem] text-white sm:text-[2.7rem]"
              subtitleClassName="max-w-sm text-white/64"
              footerClassName="border-white/10"
              footer={
                <div className="text-center text-sm text-white/60">
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => navigate("/register")} className="font-semibold text-amber-300 transition duration-300 hover:text-amber-200 hover:underline">
                    Sign up
                  </button>
                  <div className="mt-3 flex justify-center gap-2">
                    <button type="button" onClick={() => navigate("/register?role=tenant")} className="rounded-full border border-white/10 bg-white/6 px-3.5 py-1.5 text-xs font-medium text-white/72 transition duration-300 hover:border-amber-300/35 hover:bg-amber-300/10 hover:text-amber-100">
                      Join as tenant
                    </button>
                    <button type="button" onClick={() => navigate("/register?role=landlord")} className="rounded-full border border-white/10 bg-white/6 px-3.5 py-1.5 text-xs font-medium text-white/72 transition duration-300 hover:border-amber-300/35 hover:bg-amber-300/10 hover:text-amber-100">
                      Join as landlord
                    </button>
                  </div>
                </div>
              }
            >
              <div className="mb-6 flex items-center justify-between rounded-[20px] border border-white/10 bg-slate-950/24 px-4 py-3 text-sm text-white/62">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-amber-300">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Access your premium workspace</p>
                    <p className="text-xs text-white/54">Secure dashboard entry for tenants, landlords, and admins</p>
                  </div>
                </div>
                <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200 sm:block">
                  Live access
                </div>
              </div>

              <form className="space-y-5 sm:space-y-6" onSubmit={(event) => {
                event.preventDefault();
                login();
              }}>
                <InputField
                  theme="dark"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={data.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  icon={<Mail className="h-5 w-5" />}
                  error={errors.email}
                  hint={!errors.email && data.email ? "We'll only use this for secure account access." : ""}
                  className="border-white/12 bg-white/[0.08] shadow-none focus-within:border-amber-300/60 focus-within:shadow-[0_0_0_4px_rgba(245,197,24,0.12),0_18px_40px_-26px_rgba(245,197,24,0.35)]"
                  labelClassName="text-white/72"
                  inputClassName="text-white placeholder:text-white/32"
                  iconClassName="text-white/40 group-focus-within:text-amber-300"
                  hintClassName="text-white/48"
                />

                <InputField
                  theme="dark"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={data.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  icon={<LockKeyhole className="h-5 w-5" />}
                  error={errors.password}
                  className="border-white/12 bg-white/[0.08] shadow-none focus-within:border-amber-300/60 focus-within:shadow-[0_0_0_4px_rgba(245,197,24,0.12),0_18px_40px_-26px_rgba(245,197,24,0.35)]"
                  labelClassName="text-white/72"
                  inputClassName="text-white placeholder:text-white/32"
                  iconClassName="text-white/40 group-focus-within:text-amber-300"
                  rightElement={
                    <motion.button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      whileTap={{ scale: 0.92 }}
                      whileHover={{ scale: 1.04 }}
                      className="rounded-full p-1.5 text-white/45 transition duration-300 hover:bg-white/10 hover:text-white/80"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <motion.span key={showPassword ? "hide" : "show"} initial={{ opacity: 0, rotate: -12, scale: 0.9 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} transition={{ duration: 0.18 }} className="block">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </motion.span>
                    </motion.button>
                  }
                />

                <div className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-slate-950/28 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex items-center gap-3 text-sm text-white/65">
                    <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe((prev) => !prev)} className="h-4 w-4 rounded border-white/20 bg-transparent text-amber-400 focus:ring-amber-400" />
                    <span>Remember me</span>
                  </label>
                  <div className="flex items-center gap-2 text-sm text-white/50">
                    <Lock className="h-4 w-4 text-amber-300" />
                    <span>Protected by Firebase</span>
                  </div>
                  <button type="button" onClick={handleForgotPassword} disabled={loadingMethod === "reset"} className="text-left font-semibold text-amber-300 transition duration-300 hover:text-amber-200 hover:underline disabled:opacity-60 sm:text-right">
                    Forgot Password?
                  </button>
                </div>

                {status.message ? (
                  <div className={`rounded-[18px] border px-4 py-3 text-sm ${statusClassName}`}>{status.message}</div>
                ) : null}

                <Button
                  type="submit"
                  loading={loadingMethod === "email"}
                  disabled={isAnyLoading}
                  className={
                    isSuccess
                      ? "border border-emerald-400/20 bg-emerald-500 text-white hover:bg-emerald-500"
                      : "border border-amber-300/20 bg-[linear-gradient(135deg,#f5c518_0%,#d4a017_48%,#8b6a07_100%)] text-slate-950 shadow-[0_24px_54px_-26px_rgba(245,197,24,0.7)] hover:scale-[1.01] hover:shadow-[0_28px_64px_-26px_rgba(245,197,24,0.75)] focus:ring-amber-300/30"
                  }
                  icon={<ArrowRight className="h-4 w-4" />}
                  loadingText="Logging in..."
                >
                  {isSuccess ? "Success" : "Login"}
                </Button>

                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#102033] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38">Or continue with</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="secondary"
                    onClick={handleGoogle}
                    loading={loadingMethod === "google"}
                    disabled={isAnyLoading}
                    className="border-white/10 bg-white/[0.06] text-white/84 shadow-none hover:border-[#4285F4]/35 hover:bg-[#4285F4]/[0.09]"
                    icon={<GoogleIcon />}
                    loadingText="Connecting..."
                  >
                    Google
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleGithub}
                    loading={loadingMethod === "github"}
                    disabled={isAnyLoading}
                    className="border-white/10 bg-white/[0.06] text-white/84 shadow-none hover:border-white/20 hover:bg-white/[0.1]"
                    icon={<GitHubIcon />}
                    loadingText="Connecting..."
                  >
                    GitHub
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs font-medium text-white/55">
                  {trustIndicators.map(({ icon: Icon, label }) => (
                    <div key={label} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5">
                      <Icon className="h-3.5 w-3.5 text-amber-300" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </form>
            </AuthCard>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

export default Login;
