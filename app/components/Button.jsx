import "./Button.scss";

function Button({ children, disabled, className, ...rest }) {
  const cn = `${className || ""} btn${disabled ? " btn-disabled" : ""}`;
  return (
    <button disabled={disabled} {...rest} className={cn}>
      <span>{children}</span>
    </button>
  );
}

export default Button;
