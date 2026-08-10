import React from 'react';
import styles from '../styles/AddFixtures.module.css';

export default function ModernFormInput({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  required = false,
  options = null,
  error = null,
  disabled = false,
  className = ''
}) {
  const baseClasses = `${styles.formInput} ${error ? 'border-red-500' : ''} ${className}`;

  return (
    <div className={styles.formGroup}>
      {label && (
        <label className={styles.formLabel}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {options ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`${styles.formSelect} ${error ? 'border-red-500' : ''}`}
        >
          <option value="">{placeholder || `Select ${label?.toLowerCase()}`}</option>
          {options.map((option) => (
            <option key={option.id || option.value} value={option.id || option.value}>
              {option.name || option.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`${styles.formTextarea} ${error ? 'border-red-500' : ''}`}
          rows="4"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={baseClasses}
        />
      )}

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}
