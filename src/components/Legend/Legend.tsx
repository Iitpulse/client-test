import clsx from "clsx";
import styles from "./Legend.module.scss";

const Legend = () => {
  return (
    <div className={styles.container}>
      <div className={styles.subContainer}>
        <button className={styles.notVisitedBtn}>74</button>
        <span>Not Visited</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.notAnswered}>74</div>
        <span>Not Answered</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.answered}>74</div>
        <span>Answered</span>
      </div>

      <div className={styles.subContainer}>
        <div className={styles.markForReview}>74</div>
        <span>Marked for Review</span>
      </div>

      <div className={clsx(styles.subContainer, styles.large)}>
        <div className={styles.answeredAndMarkForReview}>74</div>
        <span>
          Answered & Marked for Review (will be considered for evaluation)
        </span>
      </div>
    </div>
  );
};

export default Legend;
