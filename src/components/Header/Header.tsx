import styles from "./Header.module.scss";
import { TestInfo, Button } from "../../components";
import logo from "../../assets/images/logo.svg";
import question from "../../assets/icons/note.svg";
import info from "../../assets/icons/info.svg";

const Header = () => {
  return (
    <div className={styles.container}>
      <section className={styles.logoSection}>
        <div className={styles.imageContainer}>
          <img src={logo} alt="IIT Pulse" />
        </div>
        <div className={styles.moreInfoTest}>
          <Button icon={<img src={question} alt="List" />} color="success">
            View Question Paper
          </Button>
          <Button icon={<img src={info} alt="List" />}>View Instruction</Button>
        </div>
      </section>
      <TestInfo />
    </div>
  );
};

export default Header;
