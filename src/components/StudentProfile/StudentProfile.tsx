import styles from "./StudentProfile.module.scss";
import profilePlaceholderImage from "../../assets/images/profilePlaceholderImage.jpg";

interface Props {
  name: string;
  exam: string;
  image?: string;
}

const StudentProfile = (props: Props) => {
  const { name, exam, image } = props;
  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        <img src={image ? image : profilePlaceholderImage} alt={name} />
      </div>
      <div className={styles.textContainer}>
        <p>
          Name : <span className={styles.fieldAnswerTextual}>{name}</span>
        </p>
        <p>
          Exam : <span className={styles.fieldAnswerTextual}>{exam}</span>{" "}
        </p>
        <p>
          Time Remaining : <span className={styles.timeTag}>12:33:22</span>{" "}
        </p>
      </div>
    </div>
  );
};

export default StudentProfile;
