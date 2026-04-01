const PhoneInput = ({ value, onChange, required = false, className = '' }) => {
  const handleChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
    onChange(val);
  };

  return (
    <div className={`flex ${className}`} dir="ltr">
      <span className="inline-flex items-center px-3 py-3 bg-surface-alt border border-gray-300 border-e-0 rounded-s-xl text-sm text-foreground/50 font-medium select-none">
        +974
      </span>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        required={required}
        maxLength={8}
        minLength={8}
        pattern="[0-9]{8}"
        title="Phone number must be 8 digits"
        placeholder="XXXX XXXX"
        className="flex-1 px-4 py-3 bg-background border border-gray-300 rounded-e-xl text-foreground text-sm focus:outline-none focus:border-accent transition-colors"
      />
    </div>
  );
};

export default PhoneInput;
