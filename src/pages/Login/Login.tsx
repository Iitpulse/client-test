import { useState, useEffect, useContext } from "react";
import styles from "./Login.module.scss";
import { Button, Header, InputField } from "../../components";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../utils/auth/AuthContext";
import logo from "../../assets/images/logo.svg";
import axios from "axios";
import { decodeToken } from "react-jwt";
import { API_USERS } from "src/utils/api";
import { AUTH_TOKEN } from "src/utils/constants";

const Login = () => {
  const navigate = useNavigate();

  const { setCurrentUser, keyRequiredForTest } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleClickSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const response = await API_USERS().post("/auth/login/", {
      email,
      password,
    });

    console.log({ decoded: decodeToken(response.data.token), response });

    if (response.status === 200) {
      let decoded = decodeToken(response.data.token) as any;
      setCurrentUser({
        id: decoded.id,
        email: decoded.email,
        userType: decoded.userType,
        instituteId: decoded.instituteId,
      });
      localStorage.setItem(AUTH_TOKEN, response.data.token);
      navigate(keyRequiredForTest ? "/login-key" : "/instructions");
    }
  }

  useEffect(() => {
    let token = localStorage.getItem(AUTH_TOKEN);
    if (token) {
      const decoded = decodeToken(token) as any;
      if (decoded) {
        setCurrentUser({
          email: decoded.email,
          id: decoded.id,
          userType: decoded.userType,
          instituteId: decoded.instituteId,
        });
      }
    }
  }, [setCurrentUser]);

  return (
    <div className={styles.container}>
      {/* <section className={styles.logoSection}>
        <div className={styles.imageContainer}>
          <img src={logo} alt="IIT Pulse" />
        </div>
      </section> */}
      <Header
        testInfoLeftComp={<HeaderLeft candidateName="Anurag" paper="Paper" />}
        rightComp={<p style={{ marginLeft: "auto" }}>Test</p>}
        classes={[styles.header]}
      />
      <div className={styles.card}>
        <h4>Login</h4>
        <form onSubmit={handleClickSubmit}>
          <InputField
            classes={[styles.inputField]}
            id="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            type="text"
          />
          <InputField
            classes={[styles.inputField]}
            id="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your Password"
            type="password"
          />
          <Button type="submit" classes={[styles.submitBtn]}>
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;

const HeaderLeft: React.FC<{ candidateName: string; paper: string }> = ({
  candidateName,
  paper,
}) => {
  return (
    <div className={styles.headerLeft}>
      <img src="" alt="" />
      <div>
        <h4>
          Candidate Name: <span>{candidateName}</span>
        </h4>
        <h4>
          Paper: <span>{paper}</span>
        </h4>
      </div>
    </div>
  );
};
