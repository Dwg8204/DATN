# Attempt render benchmark

Run `npm run dev` from `frontend`, then open `/benchmarks/attemptRender.html` in Chrome.
The page reports React Profiler times for 60 updates to a roughly 7,700-character Writing answer while a mocked two-second autosave request is pending. It also verifies that the final response reached the mocked server and that a late status response cannot reopen a submitted attempt. The benchmark uses a local fixture and does not call the project backend. Results depend on the local browser and machine; use them to compare changes, not as a production latency guarantee.
