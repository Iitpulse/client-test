import { useState, createContext, useEffect } from "react";
import { ICurrentUser, IAuthContext, IUserDetails } from "../interfaces";
import { decodeToken, isExpired } from "react-jwt";
import { AUTH_TOKEN } from "../constants";
import { API_USERS } from "../api/config";

interface ProviderProps {
  children: React.ReactNode;
}

const defaultAuthContext = {
  currentUser: null,
  userDetails: null,
  setCurrentUser: () => {},
  keyRequiredForTest: false,
  setKeyRequiredForTest: () => {},
};

export const AuthContext = createContext<IAuthContext>(defaultAuthContext);

const AuthContextProvider = (props: ProviderProps) => {
  const [currentUser, setCurrentUser] = useState<ICurrentUser | null>(null);
  const [userDetails, setuserDetails] = useState<any>(null);
  const [keyRequiredForTest, setKeyRequiredForTest] = useState<boolean>(false);

  useEffect(() => {
    const user = localStorage.getItem(AUTH_TOKEN);
    async function getUserDetails(id: string, userType: string) {
      // console.log(id);
      const res = await API_USERS().get(`/${userType}/single`, {
        params: { id },
      });
      console.log({ id, res });
      setuserDetails(res.data);
    }
    if (user) {
      let decoded = decodeToken(user) as any;
      // console.log({ decoded });
      if (isExpired(user)) {
        localStorage.removeItem(AUTH_TOKEN);
        setCurrentUser(null);
        return;
      }
      let newRoles: any = {};
      decoded?.roles?.forEach((role: any) => {
        newRoles[role.id] = {
          id: role.id,
          permissions: [],
        };
      });
      // console.log({ hello: newRoles });
      // console.log({ decoded });
      setCurrentUser({
        email: decoded.email,
        id: decoded.id,
        userType: decoded.userType,
        instituteId: decoded.instituteId,
      });

      getUserDetails(decoded.id, decoded.userType);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userDetails,
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
