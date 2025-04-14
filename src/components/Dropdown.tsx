import { Form } from "react-bootstrap";

interface Language {
  code: string;
  name: string;
}

interface DropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Language[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Select language",
  className = ""
}) => {
  return (
    <Form.Group className={className}>
      <Form.Label className="text-start w-100">
        {label}
      </Form.Label>
      <Form.Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
};

export default Dropdown; 