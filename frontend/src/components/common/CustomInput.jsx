import { forwardRef } from 'react';

const CustomInput = forwardRef(function CustomInput(
  {
    label,
    helperText,
    error,
    className = '',
    inputClassName = '',
    required = false,
    ...props
  },
  ref,
) {
  return (
    <label className={`form-field ${className}`.trim()}>
      {label ? (
        <span className="form-field__label">
          {label}
          {required ? <span aria-hidden="true"> *</span> : null}
        </span>
      ) : null}
      <input
        ref={ref}
        className={`form-field__input ${error ? 'form-field__input--error' : ''} ${inputClassName}`
          .trim()
          .replace(/\s+/g, ' ')}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <span className="form-field__message form-field__message--error">{error}</span> : null}
      {!error && helperText ? <span className="form-field__message">{helperText}</span> : null}
    </label>
  );
});

export default CustomInput;
