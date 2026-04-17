---
inclusion: auto
---

# Stox — Server-Side Priorities

When making tradeoffs on server-side performance, function, or logic, use the following heuristic (in priority order):

1. **Accurate client responses** (highest priority): The values returned to the client must be complete and accurate. Never sacrifice data correctness for performance or simplicity.

2. **Accurate metrics and logs**: Server metrics and logs should always display the current, accurate state of the system. Do not defer, batch, or skip metric/log updates in ways that would misrepresent system state.

3. **Prompt cleanup of abandoned work**: Once the web page has ceased its requests (closed or cancelled), associated server-side processes and resources should be cleaned up as soon as possible — without compromising the above priorities.

4. **Simplicity, reuse, and logical programming**: Prefer simple, reusable, and logically structured code whenever possible. Avoid unnecessary complexity or one-off solutions when a general approach works.
