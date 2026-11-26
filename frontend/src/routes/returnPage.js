const attemptPage = /^\/(?:grammar-vocab|reading|listening|speaking|writing)\/(?:introduction|test)(?:\/|$)/;

// Keep the return destination on the browser entry, including across reloads.
export function trackReturnPage(router, history) {
  let previous = router.state.location;
  let origin = history.state?.returnPage;
  let index = history.state?.idx;
  router.subscribe(({ location, historyAction }) => {
    if (location.key === previous.key) return;
    const entry = history.state;
    if (historyAction === 'POP') {
      origin = entry?.returnPage;
    } else {
      const samePage = location.pathname === previous.pathname;
      if (!samePage && !attemptPage.test(previous.pathname) && historyAction !== 'REPLACE') {
        origin = { href: previous.pathname + previous.search + previous.hash, index };
      }
      history.replaceState({ ...entry, returnPage: origin }, '');
    }
    previous = location;
    index = entry?.idx;
  });
}
