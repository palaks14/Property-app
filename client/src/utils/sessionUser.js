import { jwtDecode } from "jwt-decode";
import { auth } from "../firebase";

export function getSessionUser() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role") || "";

  if (token) {
    try {
      const decoded = jwtDecode(token);
      return {
        id: decoded?.id ? String(decoded.id) : "",
        role: decoded?.role || role || "",
        source: "jwt"
      };
    } catch (_error) {}
  }

  if (auth.currentUser) {
    return {
      id: auth.currentUser.uid,
      role,
      source: "firebase"
    };
  }

  return {
    id: "",
    role,
    source: "none"
  };
}
