import { Button as BootstrapButton } from "react-bootstrap";

interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
  variant?: string;
  size?: 'sm' | 'lg';
  className?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  disabled = false,
  variant = "dark",
  size,
  className = "",
  children
}) => {
  return (
    <BootstrapButton
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      size={size}
      className={className}
      style={{
        backgroundColor: "#D35400",
        borderColor: "#A04000",
      }}
    >
      {children}
    </BootstrapButton>
  );
};

export default Button;
