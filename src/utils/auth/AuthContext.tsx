import { useState, createContext, useEffect } from "react";
import { ICurrentUser, IAuthContext } from "../interfaces";
import { decodeToken } from "react-jwt";
import { AUTH_TOKEN } from "../constants";

interface ProviderProps {
  children: React.ReactNode;
}

const defaultAuthContext = {
  currentUser: null,
  setCurrentUser: () => {},
  keyRequiredForTest: false,
  setKeyRequiredForTest: () => {},
};

export const AuthContext = createContext<IAuthContext>(defaultAuthContext);

const AuthContextProvider = (props: ProviderProps) => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);
  const [keyRequiredForTest, setKeyRequiredForTest] = useState<boolean>(false);

  useEffect(() => {
    const user = localStorage.getItem(AUTH_TOKEN);
    if (user) {
      let decoded = decodeToken(user) as any;
      setCurrentUser({
        email: decoded.email,
        id: decoded.id,
        userType: decoded.userType,
        instituteId: decoded.instituteId,
      });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        keyRequiredForTest,
        setKeyRequiredForTest,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
