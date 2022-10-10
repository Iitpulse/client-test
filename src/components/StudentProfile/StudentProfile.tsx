import styles from "./StudentProfile.module.scss";
import profilePlaceholderImage from "../../assets/images/profilePlaceholderImage.jpg";
import { useEffect, useState } from "react";

interface Props {
  name: string;
  exam: string;
  image?: string;
}

type RemainingTime = {
  hours: number;
  minutes: number;
  seconds: number;
};

const StudentProfile = (props: Props) => {
  const { name, exam, image } = props;
  const [timer, setTimer] = useState<RemainingTime>({
    hours: 3,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    let remTime = localStorage.getItem("remainingTime");
    if (remTime) {
      setTimer(JSON.parse(remTime));
    }
    let countDownDate = new Date(
      new Date().setHours(new Date().getHours() + 3)
    ).getTime();

    let x = setInterval(function () {
      let now = new Date().getTime();

      let distance = countDownDate - now;

      let h = Math.floor(distance / (1000 * 60 * 60));
      let m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      let s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimer({ hours: h ?? 0, minutes: m ?? 0, seconds: s ?? 0 });

      if (distance < 0) {
        clearInterval(x);
        setTimer({ hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000); // update every one second
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        <img src={image ? image : profilePlaceholderImage} alt={name} />
      </div>
      <div className={styles.textContainer}>
        <p>
          <span>Name : </span>
          <span className={styles.fieldAnswerTextual}>{name}</span>
        </p>
        <p>
          <span>Exam : </span>
          <span className={styles.fieldAnswerTextual}>{exam}</span>
        </p>
        <p>
          <span>Time Remaining : </span>
          <span className={styles.timeTag}>
            {timer.hours} : {timer.minutes} : {timer.seconds}
          </span>
        </p>
      </div>
    </div>
  );
};

export default StudentProfile;
