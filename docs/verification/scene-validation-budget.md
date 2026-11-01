# Scene validation budget

Review finding: #16. A fixed 20-second deadline rejected valid scenes with many reveals.

The validator still checks frames 0 through 11 at every reveal state. Its finite deadline is now 20 seconds plus 100 ms for each frame/reveal probe, capped by the schema's 30-reveal maximum at 57.2 seconds. Cancellation still destroys only the owned isolated renderer. This retains the existing bounded worker pattern and all render-error coverage.

The real Electron regression adds 50 ms latency to each actual isolated-renderer JavaScript call. The valid 30-reveal scene failed under the old deadline; the same scene passed every probe in 40.6 seconds after the fix. The existing source-validation journey also passed, including rejection of a broken reveal without replacing the accepted source. Targeted lint, strict types and production build pass.

A separate private-display manual run compiled the 30-reveal scene under the same slower calls, checked the completed job and installed scene, and opened its accepted source in Code. No desktop interaction or physical audio was used.
