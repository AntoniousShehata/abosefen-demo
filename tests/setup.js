import { afterEach } from 'vitest';

// jsdom does not implement scrolling; the pages call it on navigation.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
}

afterEach(() => {
  try {
    if (typeof window !== 'undefined') window.localStorage.clear();
  } catch {
    /* storage unavailable */
  }
});
