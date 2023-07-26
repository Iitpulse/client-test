import { ButtonHTMLAttributes, MouseEvent } from "react";
import clsx from "clsx";
import styles from "./Button.module.scss";

interface ButtonProps {
  children?: React.ReactNode | string;
  title?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  classes?: Array<string>;
  icon?: React.ReactNode;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  color?: "primary" | "success" | "error" | "warning";
  [key: string]: any;
}

const Button = (props: ButtonProps) => {
  const {
    title,
    classes,
    icon: Icon,
    type,
    children,
    onClick,
    disabled = false,
    color,
    ...rest
  } = props;

  return (
    <button
      title={title}
      type={type}
      className={clsx(
        styles.btn,
        classes ? [...classes] : "",
        getStyleByColor(color || "primary")
      )}
      disabled={disabled}
      onClick={onClick || (() => {})}
      {...rest}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        {Icon && <span className={styles.icon}>{Icon}</span>}
        {children}
      </span>
    </button>
  );
};

export default Button;

function getStyleByColor(color: string) {
  switch (color) {
    case "primary":
      return styles.clrPrimary;
    case "success":
      return styles.clrSuccess;
    case "error":
      return styles.clrError;
    case "warning":
      return styles.clrWarning;
    default:
      return "";
  }
}
