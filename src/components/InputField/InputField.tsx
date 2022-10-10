import { HTMLInputTypeAttribute } from "react";
import clsx from "clsx";
import styles from "./InputField.module.scss";

interface Props {
  id: string;
  label: string;
  type: HTMLInputTypeAttribute;
  placeholder?: string;
  disabled?: boolean;
  value: string;
  required?: boolean;
  classes?: Array<string>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  [x: string]: any;
}

const InputField = (props: Props) => {
  const {
    id,
    type,
    label,
    placeholder,
    required,
    disabled,
    value,
    classes,
    onChange,
    ...rest
  } = props;
  return (
    <div
      style={
        type === "radio" || type === "checkbox"
          ? { flexDirection: "row", width: "fit-content", alignItems: "center" }
          : { flexDirection: "column-reverse", width: "250px" }
      }
      className={clsx(styles.container, classes)}
    >
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
        {...rest}
      />
      <label htmlFor={id}>
        {label}
        {required && " *"}
      </label>
    </div>
  );
};

export default InputField;
