# Compiler failure classification

Review findings: #1's duplicated error codes and #15's compilation failure classification.

The existing application Result pattern and Zod boundary schemas now share one error-code tuple. Compilation retains its source diagnostics while accepting those same typed errors. Cancellation is CANCELLED, queue saturation is CONFLICT, and process/setup failures are IO_ERROR. Invalid source remains INVALID_INPUT. Queue worker exceptions retain IO_ERROR.

Regression tests first reproduced cancellation and queue saturation returning the wrong codes. A real isolated worker with its declaration file absent separately reproduced an environment failure reported as invalid source. Each failing regression was committed before its implementation. A boundary test round-trips all six codes through snapshot, boolean, update, scene-job, preview and compilation schemas.

The complete checks passed before the final worker setup correction. Targeted compiler, queue and boundary tests passed after it. A manual call to the real compiler returned CANCELLED for a pre-cancelled request, IO_ERROR for a missing worker and INVALID_INPUT with one source diagnostic for malformed TSX. The compiler still runs serially with the existing Linux resource limits. The real Electron MCP journey also compiled, validated and atomically installed a custom scene successfully. No rendering behaviour changes.
