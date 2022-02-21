import clsx from "clsx";
import styles from "./Loader.module.scss";

const Loader = () => {
  return (
    <div className={clsx(styles.loader, styles.center)}>
      <span></span>
    </div>
  );
};

export default Loader;
