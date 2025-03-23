import { useState, useCallback, useEffect, useRef, type ChangeEvent, type KeyboardEvent, type InputHTMLAttributes } from 'react';
import { Input} from './ui/input';
import debounce from 'lodash/debounce';

export interface DebouncedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    /** Initial value of the input */
    value?: string;
    /** Delay in ms before triggering onChange after user stops typing */
    debounceTime?: number;
    /** Called after debounce time when user types */
    onChange?: (value: string) => void;
    /** Called when user commits the value with Enter/Tab */
    onFinalChange: (value: string) => void;
    /** Optional autocomplete suggestion */
    suggestion: string | null;
}

export function DebouncedInput({
    value: initialValue = "",
    debounceTime = 500,
    onChange,
    onFinalChange,
    suggestion,
    ...props
}: DebouncedInputProps) {
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement>(null);
    const debouncedFnRef = useRef<ReturnType<typeof debounce>>(undefined);

    // Recreate debounce when onChange or debounceTime changes
    useEffect(() => {
        debouncedFnRef.current = debounce((value: string) => onChange?.(value), debounceTime);
        return () => debouncedFnRef.current?.cancel();
    }, [onChange, debounceTime]);

    const debouncedOnChange = useCallback((value: string) => {
        debouncedFnRef.current?.(value);
    }, []);

    // Sync with external value changes
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        setValue(newValue);
        debouncedOnChange(newValue);
    }, [debouncedOnChange]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            const finalValue = suggestion && suggestion.startsWith(value) ? suggestion : value;
            onFinalChange(finalValue);
            setValue('');
            inputRef.current?.blur();
        }
    }, [onFinalChange, value, suggestion]);

    // Handle suggestion display
    useEffect(() => {
        const input = inputRef.current;
        if (input && suggestion && suggestion.startsWith(value) && suggestion !== value) {
            input.value = suggestion;
            input.setSelectionRange(value.length, suggestion.length);
        }
    }, [value, suggestion]);

    return (
        <Input
            {...props}
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
        />
    );
}