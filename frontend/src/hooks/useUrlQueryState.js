import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const queryParam = {
  string: (fallback = '') => ({
    parse: value => value ?? fallback,
    serialize: value => String(value ?? fallback),
  }),
  enum: (values, fallback = values[0]) => ({
    parse: value => values.includes(value) ? value : fallback,
    serialize: value => values.includes(value) ? value : fallback,
  }),
  positiveInt: (fallback = 1, maximum = Number.MAX_SAFE_INTEGER) => ({
    parse: value => {
      const defaultValue = typeof fallback === 'function' ? fallback() : fallback;
      const parsed = Number.parseInt(value, 10);
      return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : defaultValue;
    },
    serialize: value => {
      const defaultValue = typeof fallback === 'function' ? fallback() : fallback;
      return String(Math.min(maximum, Math.max(1, Number.parseInt(value, 10) || defaultValue)));
    },
  }),
};

export function readUrlQueryState(searchParams, schema) {
  return Object.fromEntries(Object.entries(schema).map(([key, descriptor]) => [
    key,
    descriptor.parse(searchParams.get(descriptor.param ?? key)),
  ]));
}

export default function useUrlQueryState(schema) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => readUrlQueryState(searchParams, schema), [schema, searchParams]);

  const updateState = useCallback((nextState, options = { replace: true }) => {
    setSearchParams(currentParams => {
      const currentState = readUrlQueryState(currentParams, schema);
      const patch = typeof nextState === 'function' ? nextState(currentState) : nextState;
      const merged = { ...currentState, ...patch };
      const nextParams = new URLSearchParams(currentParams);

      Object.entries(schema).forEach(([key, descriptor]) => {
        const param = descriptor.param ?? key;
        const value = descriptor.serialize(merged[key]);
        if (value === '' || value == null) nextParams.delete(param);
        else nextParams.set(param, value);
      });
      return nextParams;
    }, options);
  }, [schema, setSearchParams]);

  return [state, updateState];
}
