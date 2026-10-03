import React, { useRef, useState, useEffect } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

interface PasskeyPinInputProps {
  value: string;
  onChange: (pin: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  label?: string;
  autoFocus?: boolean;
  idPrefix?: string;
}

export const PasskeyPinInput: React.FC<PasskeyPinInputProps> = ({
  value,
  onChange,
  disabled = false,
  hasError = false,
  label = '6-Digit Passkey PIN',
  autoFocus = false,
  idPrefix = 'passkey_pin',
}) => {
  const [showDigits, setShowDigits] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleDigitChange = (index: number, char: string) => {
    // Only accept numeric characters
    const numericChar = char.replace(/[^0-9]/g, '');
    if (!numericChar && char !== '') return;

    const newDigits = [...digits];
    newDigits[index] = numericChar.slice(-1); // Take last char if multiple entered
    const newPin = newDigits.join('').slice(0, 6);
    onChange(newPin);

    // Auto-advance to next box if character was entered
    if (numericChar && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
      inputRefs.current[index + 1]?.select();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Move back and clear previous
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pastedData) {
      onChange(pastedData);
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
        <label className="flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{label}</span>
          <span className="text-rose-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setShowDigits(!showDigits)}
          className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          tabIndex={-1}
        >
          {showDigits ? (
            <>
              <EyeOff className="w-3 h-3" />
              <span>Hide</span>
            </>
          ) : (
            <>
              <Eye className="w-3 h-3" />
              <span>Show</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between gap-1.5 sm:gap-2" onPaste={handlePaste}>
        {Array.from({ length: 6 }).map((_, index) => {
          const val = digits[index] || '';
          return (
            <input
              key={index}
              id={`${idPrefix}_${index}`}
              ref={(el) => { inputRefs.current[index] = el; }}
              type={showDigits ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={1}
              value={val}
              disabled={disabled}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border transition-all shadow-2xs focus:outline-none focus:ring-2 ${
                hasError
                  ? 'border-rose-400 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 focus:ring-rose-500'
                  : val
                  ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20 text-neutral-900 dark:text-white focus:ring-indigo-500'
                  : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white focus:ring-indigo-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label={`Passkey digit ${index + 1} of 6`}
            />
          );
        })}
      </div>
      
      <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
        <span>6 numeric digits required</span>
        <span className="font-mono tabular-nums">{value.length} / 6 digits entered</span>
      </div>
    </div>
  );
};
