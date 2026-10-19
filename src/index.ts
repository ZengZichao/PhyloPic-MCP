#!/usr/bin/env node

/**
 * PhyloPic MCP Server — Entry Point
 *
 * This is the main entry point for the PhyloPic MCP server. It starts
 * the server using the stdio transport, allowing AI assistants (and
 * other MCP clients) to interact with the PhyloPic API.
 *
 * Usage:
 *   node dist/index.js
 *   npx phylopic-mcp
 *
 * @module index
 */

import { startServer } from "./server.js";

// Start the server and handle any fatal errors.
startServer().catch((error) => {
  process.stderr.write(`Fatal error: ${error.message}\n`);
  process.stderr.write(`${error.stack ?? ""}\n`);
  process.exit(1);
});
