# Image resource limits

Images are limited to 32 MiB, 8192 pixels per side and 33,554,432 pixels overall. PNG, JPEG, WebP and GIF headers must match the filename extension. Header reads stop at 512 KiB; no image decoding or conversion runs during validation. Imports return typed failures without modifying the slide or history. Serving rechecks images loaded from portable projects so archived resources cannot bypass import limits.

Separate failing tests precede dimension, file-size and archived-resource implementation. Coverage includes oversized width/height/area, sparse oversized files, malformed headers, disguised formats, native import, MCP import, archived GET/HEAD rejection and normal image range requests. Existing media retry tests now use actual PNG fixtures. Header validation does not certify complete image integrity; decoder failures retain the existing replacement workflow.

`yarn verify` passed with 75 unit tests and all 38 Electron journeys passed. Manual private-Xvfb verification rejected the same oversized PNG through File and MCP without changing the project, then opened a synthetic archive containing it and confirmed GET/HEAD returned 400 before decoder access. The rendered error screenshot was inspected.
