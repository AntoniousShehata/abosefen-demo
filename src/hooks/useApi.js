import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/index.js';

/**
 * Loads something from the fake API and keeps it fresh: when any demo data changes (a cart line, a stock movement,
 * a reset…), the call runs again. `deps` decide when the call itself changes.
 */
export function useApi(call, deps = []) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true });
  const callRef = useRef(call);
  callRef.current = call;
  const runId = useRef(0);

  const run = useCallback((quiet = false) => {
    const id = ++runId.current;
    if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(() => callRef.current())
      .then(
        (data) => {
          if (id === runId.current) setState({ data, error: null, loading: false });
        },
        (error) => {
          if (id === runId.current) setState({ data: undefined, error, loading: false });
        },
      );
  }, []);

  useEffect(() => {
    run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => api.onChange(() => run(true)), [run]);

  useEffect(
    () => () => {
      runId.current += 1; // ignore answers that arrive after the page is gone
    },
    [],
  );

  return { ...state, reload: () => run(false) };
}
