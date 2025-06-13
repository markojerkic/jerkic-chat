import { useEffect, useState } from "react";

/**
 * A custom React hook that debounces a value.
 *
 * The debounced value will only update after the specified delay
 * has passed without the original value changing.
 *
 * @template T The type of the value being debounced.
 * @param {T} value The value to debounce.
 * @param {number} delay The delay in milliseconds to wait before updating the debounced value.
 * @returns {T} The debounced value.
 */
export function useDebounce<T>(value: T, delay: number = 100): T {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function:
    // If the value changes before the timeout fires, clear the previous timeout
    // This ensures that the debounced value is only updated after the delay
    // has passed *without* any new changes to the original value.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Re-run the effect whenever 'value' or 'delay' changes

  return debouncedValue;
}

export default useDebounce;
