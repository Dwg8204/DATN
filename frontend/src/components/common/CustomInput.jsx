import { useUiTranslation } from "../../i18n/useUiTranslation.jsx";
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
  const ui = useUiTranslation();
  return (
    <label className={`form-field ${className}`.trim()}>
      {label ? (
        <span className="form-field__label">
          {ui(label)}
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
        placeholder={props.placeholder ? ui(props.placeholder) : undefined}
        title={props.title ? ui(props.title) : undefined}
        aria-label={props['aria-label'] ? ui(props['aria-label']) : undefined}
      />
      {error ? <span className="form-field__message form-field__message--error">{ui.error(error)}</span> : null}
      {!error && helperText ? <span className="form-field__message">{ui(helperText)}</span> : null}
    </label>
  );
});

export default CustomInput;
