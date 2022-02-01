import { useState, useEffect, useContext } from "react";
import styles from "./Login.module.scss";
import { Button, InputField, Header } from "../../components";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../utils/auth/AuthContext";
import logo from "../../assets/images/logo.svg";

const Login = () => {
  const navigate = useNavigate();

  const { setCurrentUser } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleClickSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    localStorage.setItem(
      "currentUser",
      JSON.stringify({ email, uid: "IITP_ST_123", userType: "student" })
    );
    setCurrentUser({ email, uid: "IITP_ST_123", userType: "student" });
    navigate("/");
  }

  useEffect(() => {
    localStorage.getItem("currentUser") &&
      setCurrentUser(JSON.parse(localStorage.getItem("currentUser") as string));
  }, [setCurrentUser]);

  return (
    <div className={styles.container}>
      <section className={styles.logoSection}>
        <div className={styles.imageContainer}>
          <img src={logo} alt="IIT Pulse" />
        </div>
      </section>
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
