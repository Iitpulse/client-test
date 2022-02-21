import { useState, useEffect, useContext } from "react";
import styles from "./AuthWithURI.module.scss";
import { decodeToken } from "react-jwt";
import { AuthContext } from "../../utils/auth/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Loader } from "src/components";

const AuthWithURI = () => {
  const { setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const { user, testId } = useParams();
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (user && testId) {
      const token = user;
      if (token) {
        const decoded = decodeToken(token) as any;
        if (decoded) {
          setIsError(false);
          setCurrentUser({
            email: decoded.email,
            id: decoded.id,
            userType: decoded.userType,
            instituteId: decoded.instituteId,
          });
          localStorage.setItem("token", token);
          navigate(`/instructions`);
        }
      }
    } else {
      setIsError(true);
    }
  }, [user, testId, setCurrentUser, navigate]);

  return (
    <div className={styles.container}>
      {!isError ? <Loader /> : <div>Some error occured</div>}
    </div>
  );
};

export default AuthWithURI;
