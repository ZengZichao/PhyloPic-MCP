# PhyloPic MCP Server

**English** | [中文](./README.zh-CN.md)

> Version 0.1.0

> **⚠️ Disclaimer**: This is an **unofficial, third-party** implementation and is not affiliated with, endorsed by, or officially connected to [PhyloPic](https://www.phylopic.org/) or its maintainers. PhyloPic is an independent project created and maintained by T. Michael Keesey. This MCP server is an independent community project that wraps the public PhyloPic API.

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for interacting with the [PhyloPic](https://www.phylopic.org/) API. PhyloPic is an open database of freely reusable silhouette images of organisms (animals, plants, and other life forms), searchable by phylogeny.

## Overview

This MCP server wraps the PhyloPic API v2 as a set of MCP tools, enabling AI assistants (such as Claude) to:

- **Search for taxa**: Search for phylogenetic nodes by scientific name (e.g., "Primates", "Homo sapiens", "Aves")
- **Retrieve silhouette images**: Get detailed image information including download links at various resolutions
- **Browse contributors**: List all image contributors and their contribution statistics
- **Resolve external identifiers**: Convert IDs from external databases (GBIF, NCBI, Open Tree of Life, etc.) to PhyloPic nodes
- **View taxonomic lineages**: Get the ancestral lineage chain for any node
- **Check API status**: Verify PhyloPic API availability

## Features

- ✅ Complete wrapper for all read-only PhyloPic API v2 endpoints
- ✅ Automatic API build number management with stale-build auto-retry
- ✅ Communicates via stdio transport protocol
- ✅ Input parameter validation using Zod
- ✅ Comprehensive error handling with user-friendly messages
- ✅ Written entirely in TypeScript for type safety

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm or another package manager

### Install from Source

```bash
# Clone the repository
git clone https://github.com/ZengZichao/phylopic-mcp.git
cd phylopic-mcp

# Install dependencies
npm install

# Build TypeScript
npm run build
```

The compiled files will be in the `dist/` directory.

## Configuration

### Using with Claude Desktop

Add the PhyloPic MCP server to your Claude Desktop configuration file.

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "phylopic": {
      "command": "node",
      "args": [
        "C:\\path\\to\\phylopic-mcp\\dist\\index.js"
      ]
    }
  }
}
```

> **Note**: Replace the path with the actual absolute path to your `dist/index.js`.

### Using with Other MCP Clients

This server uses the standard stdio transport protocol and is compatible with any MCP-supporting client. The launch command is:

```bash
node /path/to/phylopic-mcp/dist/index.js
```

### Debugging with MCP Inspector

```bash
npm run inspector
```

This will launch the MCP Inspector web interface, allowing you to interactively test all tools.

## Available Tools

This server provides 16 MCP tools:

### 1. `search_taxa` — Search Taxa

Search for phylogenetic nodes by scientific name.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | The taxonomic name to search for (lower-case recommended, e.g., "primates", "homo sapiens") |
| `page` | number | No | Page number (0-indexed), defaults to 0 |

**Example**: Search for "primates" → returns the Primates node with its UUID, names, parent, and other info.

### 2. `autocomplete_taxa` — Autocomplete Taxa

Get taxonomic name suggestions based on partial text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Partial text to search for (e.g., "prim", "dros") |

**Example**: Query "prim" → returns ["primates", "primatiformes", "primatomorpha", ...].

### 3. `get_node` — Get Node

Get detailed information about a specific phylogenetic node by UUID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The node UUID |
| `embed_parentNode` | boolean | No | Whether to embed parent node data, defaults to false |
| `embed_primaryImage` | boolean | No | Whether to embed primary image data, defaults to false |

### 4. `get_node_lineage` — Get Node Lineage

Get the ancestral lineage chain for a given phylogenetic node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The node UUID |

### 5. `get_root_node` — Get Root Node

Get the root phylogenetic node (the common ancestor of all organisms).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `embed_primaryImage` | boolean | No | Whether to embed primary image data, defaults to false |

### 6. `get_image` — Get Image

Get detailed information about a specific silhouette image by UUID, including download links for all available file formats.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The image UUID |
| `embed_contributor` | boolean | No | Whether to embed contributor data |
| `embed_generalNode` | boolean | No | Whether to embed the general (broader) taxonomic node data |
| `embed_specificNode` | boolean | No | Whether to embed the specific taxonomic node data |
| `embed_nodes` | boolean | No | Whether to embed the full lineage nodes |

### 7. `search_images_by_node` — Search Images by Node

List silhouette images that directly represent a specific phylogenetic node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `node_uuid` | string | Yes | The node UUID |
| `page` | number | No | Page number, defaults to 0 |

### 8. `search_images_by_clade` — Search Images by Clade

List silhouette images within a clade (a node and all its descendants). Useful for finding all images of a broad group (e.g., all mammals, all birds).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clade_uuid` | string | Yes | The clade root node UUID |
| `page` | number | No | Page number, defaults to 0 |

### 9. `list_images_by_contributor` — List Images by Contributor

List all silhouette images uploaded by a specific PhyloPic contributor.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `contributor_uuid` | string | Yes | The contributor UUID |
| `page` | number | No | Page number, defaults to 0 |

### 10. `list_contributors` — List Contributors

List all PhyloPic contributors, sorted by image count (most prolific first).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number, defaults to 0 |

### 11. `get_contributor` — Get Contributor

Get detailed information about a specific contributor by UUID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uuid` | string | Yes | The contributor UUID |

### 12. `list_licenses` — List Licenses

List all Creative Commons licenses available for new image submissions.

(No parameters)

### 13. `list_namespaces` — List External Namespaces

List all authorized external taxonomic database namespaces available for resolving external identifiers.

(No parameters)

### 14. `resolve_external_id` — Resolve External Identifier

Resolve an external taxonomic database identifier to the closest matching PhyloPic phylogenetic node.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `authority` | string | Yes | The authority (e.g., "gbif.org", "ncbi.nlm.nih.gov") |
| `namespace` | string | Yes | The namespace (e.g., "species", "taxid") |
| `object_id` | string | Yes | The external identifier (e.g., "9443" for NCBI Primates) |

### 15. `get_api_info` — Get API Info

Get general information about the PhyloPic API, including version, build number, and available endpoints.

(No parameters)

### 16. `ping` — Ping API

Check if the PhyloPic API is operational.

(No parameters)

## Usage Examples

Here are some typical usage scenarios:

### Scenario 1: Find a Silhouette of an Organism

1. Use `autocomplete_taxa` with "dro" → discover "drosophila"
2. Use `search_taxa` to search "drosophila" → get the node UUID
3. Use `search_images_by_node` with the node UUID → get the image list
4. Use `get_image` to get specific image download links

### Scenario 2: Find All Images of a Class

1. Use `search_taxa` to search "aves" (birds) → get the node UUID
2. Use `search_images_by_clade` with the node UUID → get all bird images

### Scenario 3: Look Up by NCBI Taxon ID

1. Use `list_namespaces` to see available databases
2. Use `resolve_external_id` with authority="ncbi.nlm.nih.gov", namespace="taxid", object_id="9443" (Primates)
3. Use the returned node UUID to further query images

## Project Structure

```
phylopic-mcp/
├── package.json              # Project configuration and dependencies
├── tsconfig.json             # TypeScript compilation config
├── LICENSE                   # MIT license
├── README.md                 # English documentation (this file)
├── README.zh-CN.md           # Chinese documentation
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server definition and tool registration
│   ├── api/
│   │   ├── client.ts         # PhyloPic API client wrapper
│   │   └── types.ts          # API type definitions
│   └── tools/
│       └── formatters.ts     # Response formatting utilities
├── dist/                     # Compiled output (auto-generated)
└── node_modules/             # Dependencies
```

## Development

### Building the Project

```bash
npm run build      # Compile TypeScript
npm run dev        # Compile in watch mode
```

### Testing

```bash
npm run inspector   # Interactive testing with MCP Inspector
```

## Technical Notes

### PhyloPic API Build Numbers

The PhyloPic API uses a build number system. Each API update is published as a discrete build. Every API request must include the current build number in the query string; otherwise, a `307 Temporary Redirect` is returned.

This server's API client automatically handles build numbers:
1. On the first request, it fetches the current build number from the API root endpoint
2. Subsequent requests reuse the cached build number
3. If a `410 Gone` response is received (stale build), it automatically re-fetches and retries

### Image File Formats

Each PhyloPic image provides multiple file formats:
- **sourceFile**: The original uploaded file
- **vectorFile**: Auto-generated SVG vector graphic (pure black on transparent background)
- **rasterFiles**: PNG raster files at various sizes (largest to smallest)
- **thumbnailFiles**: Square thumbnail images (PNG format)
- **social preview**: Social media preview image (1200x628)

### Licensing

Images on PhyloPic are available under Creative Commons licenses, including CC0 (public domain), CC-BY, CC-BY-SA, and others. License information for each image can be retrieved using the `get_image` tool. For details, see the [PhyloPic image usage guide](https://www.phylopic.org/articles/image-usage).

## License

This project is licensed under the MIT License.

## Acknowledgments

- [PhyloPic](https://www.phylopic.org/) — An open database of organism silhouettes, created and maintained by T. Michael Keesey. This project is an independent, unofficial third-party tool and is not affiliated with PhyloPic.
- [Model Context Protocol](https://modelcontextprotocol.io/) — An AI context protocol developed by Anthropic
- All PhyloPic image contributors — Thank you for providing free silhouette images

## Related Links

- [PhyloPic Website](https://www.phylopic.org/)
- [PhyloPic API Documentation](https://api-docs.phylopic.org/v2/index.html)
- [PhyloPic API Recipes](https://www.phylopic.org/articles/api-recipes)
- [PhyloPic GitHub Repository](https://github.com/keesey/phylopic)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
