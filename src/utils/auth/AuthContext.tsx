import { useState, createContext, useEffect } from "react";
import { ICurrentUser, IAuthContext } from "../interfaces";

interface ProviderProps {
  children: React.ReactNode;
  setCurrentUser?: React.Dispatch<React.SetStateAction<ICurrentUser | null>>;
}

const defaultAuthContext = {
  currentUser: null,
  setCurrentUser: () => {},
};

export const AuthContext = createContext<IAuthContext>(defaultAuthContext);

const AuthContextProvider = (props: ProviderProps) => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    console.log({ user });
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {props.children}
    </AuthContext.Provider>
  );
};

export default AuthContextProvider;
