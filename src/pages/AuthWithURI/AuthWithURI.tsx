import { useState, useEffect, useContext } from "react";
import styles from "./AuthWithURI.module.scss";
import { decodeToken } from "react-jwt";
import { AuthContext } from "../../utils/auth/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { Loader } from "src/components";
import { TestsContext } from "src/utils/contexts/TestsContext";

const AuthWithURI = () => {
  const { setCurrentUser, setKeyRequiredForTest } = useContext(AuthContext);
  const { setTestId } = useContext(TestsContext);
  const navigate = useNavigate();
  const { user, testId } = useParams();
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (user && testId) {
      const token = user;
      if (token) {
        const decoded = decodeToken(token) as any;
        if (decoded) {
          let keyRequired = Boolean(decoded.keyRequiredForTest);
          setIsError(false);
          setCurrentUser({
            email: decoded.email,
            id: decoded.id,
            userType: decoded.userType,
            instituteId: decoded.instituteId,
          });
          setTestId(testId);
          localStorage.setItem("token", token);
          setKeyRequiredForTest(keyRequired);
          navigate(keyRequired ? "/login-key" : `/login`);
        }
      }
    } else {
      setIsError(true);
    }
  }, [
    user,
    testId,
    setCurrentUser,
    navigate,
    setKeyRequiredForTest,
    setTestId,
  ]);

  return (
    <div className={styles.container}>
      {!isError ? <Loader /> : <div>Some error occured</div>}
    </div>
  );
};

export default AuthWithURI;
