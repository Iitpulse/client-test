import { useState, useEffect, useContext } from "react";
import styles from "../Login/Login.module.scss";
import { Button, Header, InputField } from "../../components";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../utils/auth/AuthContext";
import logo from "../../assets/images/logo.svg";
import axios from "axios";
import { decodeToken } from "react-jwt";
import { APIS, AUTH_TOKEN } from "src/utils/constants";
import { API_USERS } from "src/utils/api/config";

const TestKeyLogin = () => {
  const navigate = useNavigate();

  const { keyRequiredForTest } = useContext(AuthContext);

  const [key, setKey] = useState("");

  async function handleClickSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const response = await API_USERS().post(`/student/auth/login-with-key/`, {
      key,
    });

    console.log({ decoded: decodeToken(response.data.token), response });

    if (response.status === 200) {
      let decoded = decodeToken(response.data.token) as any;
      if (decoded) {
        localStorage.setItem("testKeyToken", response.data.token);
        navigate("/instructions");
      }
    }
  }

  useEffect(() => {
    let token = localStorage.getItem(AUTH_TOKEN);
    if (!token) {
      navigate("/login");
      return;
    }
    // Explicitly checking for false because the key might be null
    if (keyRequiredForTest === false) {
      navigate("/instructions");
      return;
    }
  }, [navigate, keyRequiredForTest]);

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
            id="key"
            label="Key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            placeholder="Enter your key"
            type="text"
          />
          <Button type="submit" classes={[styles.submitBtn]}>
            Submit
          </Button>
        </form>
      </div>
    </div>
  );
};

export default TestKeyLogin;

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
