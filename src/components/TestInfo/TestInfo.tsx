import styles from "./TestInfo.module.scss";
import { StudentProfile } from "../../components";
import currentUserImage from "../../assets/images/currentUserImage.jpg";

interface Props {
  testInfoLeftComp?: React.ReactNode;
  testInfoRightComp?: React.ReactNode;
}

const TestInfo: React.FC<Props> = ({
  testInfoLeftComp: LeftComp,
  testInfoRightComp: RightComp,
}) => {
  return (
    <div className={styles.container}>
      {LeftComp || (
        <StudentProfile
          name="Deepak Kewadia"
          exam="JEE ADVANCED 2022"
          image={currentUserImage}
        />
      )}
      {RightComp || (
        <select title="Langauge" name="language">
          <option value="english">English</option>
          <option value="hindi">Hindi</option>
        </select>
      )}
    </div>
  );
};

export default TestInfo;
