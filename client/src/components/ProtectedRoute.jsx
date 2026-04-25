import { Navigate } from "react-router-dom";
import { getSessionUser } from "../utils/sessionUser";

function ProtectedRoute({ children }) {
  const session = getSessionUser();

  if (!session.id) {
    return <Navigate to="/" replace />;
  }

  return children;
}


export default ProtectedRoute;