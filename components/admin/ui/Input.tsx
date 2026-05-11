import React, { forwardRef, useId } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helper?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helper, error, required, id, className = '', ...rest }, ref) => {
    const autoId = useId();
    const inputId = id || rest.name || autoId;
    const describedBy = error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[0.8125rem] font-medium text-[#3D332C] tracking-[0.01em]"
          >
            {label}
            {required && <span className="text-[#B14848] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={
            'w-full rounded-lg bg-[#FAF7F0] border px-3.5 py-2.5 ' +
            'text-[0.9375rem] text-[#1C1814] placeholder:text-[#8B7B6E] ' +
            'transition-[border-color,box-shadow] duration-150 ' +
            'focus:outline-none focus:ring-4 focus:ring-[#C2622F]/15 ' +
            (error
              ? 'border-[#B14848] focus:border-[#B14848] '
              : 'border-[#D6C5AA] focus:border-[#C2622F] ') +
            className
          }
          {...rest}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-[0.8125rem] text-[#B14848]">
            {error}
          </p>
        ) : helper ? (
          <p id={`${inputId}-helper`} className="text-[0.8125rem] text-[#6B5B4D]">
            {helper}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';
