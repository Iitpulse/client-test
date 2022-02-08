import { useState, createContext, useEffect } from "react";
import { ICurrentUser, IAuthContext } from "../interfaces";
import { decodeToken } from "react-jwt";

interface ProviderProps {
  children: React.ReactNode;
  setCurrentUser?: React.Dispatch<React.SetStateAction<ICurrentUser | any>>;
}

const defaultAuthContext = {
  currentUser: null,
  setCurrentUser: () => {},
};

export const AuthContext = createContext<IAuthContext>(defaultAuthContext);

const AuthContextProvider = (props: ProviderProps) => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("token");
    if (user) {
      let decoded = decodeToken(user) as any;
      setCurrentUser({
        email: decoded.email,
        id: decoded.id,
        userType: decoded.userType,
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
