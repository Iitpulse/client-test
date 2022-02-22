import { useContext } from "react";
import { decodeToken } from "react-jwt";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

interface Props {
  component: React.ComponentType;
  path?: string;
}
const PrivateRoute: React.FC<Props> = ({ component: RouteComponent }) => {
  const { currentUser, keyRequiredForTest } = useContext(AuthContext);

  if (
    !currentUser &&
    !localStorage.getItem("token") &&
    !isValidTestKey(keyRequiredForTest)
  ) {
    return <Navigate to="/login" />;
  }

  return <RouteComponent />;
};

export default PrivateRoute;

function isValidTestKey(keyRequired: boolean) {
  if (!keyRequired) return true;
  const token = localStorage.getItem("testKeyToken");
  if (token) {
    const decoded = decodeToken(token) as any;
    if (decoded?.testKey) {
      return true;
    }
  }
  return false;
}
