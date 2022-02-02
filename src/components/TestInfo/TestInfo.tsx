import styles from "./TestInfo.module.scss";
import { StudentProfile } from "../../components";
import currentUserImage from "../../assets/images/currentUserImage.jpg";

const TestInfo = () => {
  return (
    <div className={styles.container}>
      <StudentProfile
        name="Deepak Kewadia"
        exam="JEE ADVANCED 2022"
        image={currentUserImage}
      />
      <select title="Langauge" name="language">
        <option value="english">English</option>
        <option value="hindi">Hindi</option>
      </select>
    </div>
  );
};

export default TestInfo;
