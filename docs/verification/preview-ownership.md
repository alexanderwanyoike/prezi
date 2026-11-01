# Preview request ownership

Review finding: #26. Restoring the shared preview list could offer human controls that cancelled an agent's in-progress capture. Agent failures also appeared as the human's persistent error.

The editor tracks its submitted request IDs before invoking capture. Only those active jobs supply pending/cancel controls or failure messages. Terminal replies and failed submissions release ownership. All completed images remain shared in the existing bounded cache. This reuses the application's established request-ID correlation pattern without changing MCP access or adding a new job registry.

The native regression failed with the human capture button disabled after reloading during an agent job. The hook regression failed with the unrelated agent error. Both pass after implementation, alongside both existing native preview journeys. Targeted lint, strict types and production build pass.

A separate private-display manual run restored an active agent job, started and cancelled a separate human capture, then verified that the agent job completed and its thumbnail appeared. Screenshots show the agent job without human cancel controls, the human's own controls, and the shared result. No user desktop or audio session was used.
