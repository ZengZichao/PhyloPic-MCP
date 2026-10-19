/**
 * MCP Server implementation for the PhyloPic API.
 *
 * Exposes PhyloPic's silhouette image database as MCP tools, enabling
 * AI assistants to search for organisms by taxonomic name, retrieve
 * silhouette images, browse contributors, and more.
 *
 * @module server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PhyloPicClient } from "./api/client.js";
import {
  formatContributorPage,
  formatContributorSummary,
  formatImageDetailed,
  formatImagePage,
  formatNodeDetailed,
  formatNodePage,
  formatNodeSummary,
} from "./tools/formatters.js";

/** Server name reported to the MCP client. */
const SERVER_NAME = "phylopic-mcp";

/** Server version. */
const SERVER_VERSION = "0.1.0";

/**
 * Create and configure the MCP server with all PhyloPic tools.
 *
 * @param client Optional custom PhyloPicClient instance (mainly for testing).
 * @returns The configured McpServer instance.
 */
export function createServer(client?: PhyloPicClient): McpServer {
  const api = client ?? new PhyloPicClient();
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
    },
  );

  // ── Tool: search_taxa ─────────────────────────────────────────────

  server.registerTool(
    "search_taxa",
    {
      title: "Search Taxa",
      description: `Search for phylogenetic nodes (taxa) in PhyloPic by name. Returns matching nodes with their UUIDs, names, parent taxa, and primary images. The search text should be lower-case with non-alphabetic characters removed and whitespace trimmed (e.g. "primates", "homo sapiens", "aves").`,
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("The taxonomic name to search for (e.g. 'primates', 'homo sapiens', 'aves'). Lower-case recommended."),
        page: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Zero-indexed page number for pagination. Defaults to 0 (first page)."),
      },
    },
    async (args) => {
      try {
        const page = await api.searchNodes(args.query, args.page, true);
        const text = formatNodePage(page);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error searching taxa: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: autocomplete_taxa ───────────────────────────────────────

  server.registerTool(
    "autocomplete_taxa",
    {
      title: "Autocomplete Taxa",
      description: `Get autocomplete suggestions for taxonomic names based on partial text. Useful for discovering what taxa are available in PhyloPic before doing a full search. Returns a list of matching name suggestions (e.g. query 'prim' returns 'primates', 'primatiformes', etc.).`,
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Partial text to search for (e.g. 'prim', 'dros', 'aves'). Lower-case recommended."),
      },
    },
    async (args) => {
      try {
        const response = await api.autocomplete(args.query);
        const matches = response.matches;
        const lines: string[] = [
          `Autocomplete suggestions for "${args.query}":`,
          "",
        ];
        if (matches.length === 0) {
          lines.push("No suggestions found.");
        } else {
          for (let i = 0; i < matches.length; i++) {
            lines.push(`${i + 1}. ${matches[i]}`);
          }
        }
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error getting autocomplete: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: get_node ────────────────────────────────────────────────

  server.registerTool(
    "get_node",
    {
      title: "Get Node",
      description: `Get detailed information about a specific phylogenetic node by its UUID. Returns the node's names, parent node, primary image, and child nodes. Can optionally embed the parent node and primary image data in the response.`,
      inputSchema: {
        uuid: z
          .string()
          .uuid()
          .describe("The UUID of the phylogenetic node (e.g. 'e23284cb-38bd-4dc3-8a20-9a4a59ef23ed' for Primates)."),
        embed_parentNode: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to embed the parent node data in the response."),
        embed_primaryImage: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to embed the primary image data in the response."),
      },
    },
    async (args) => {
      try {
        const node = await api.getNode(args.uuid, {
          embed_parentNode: args.embed_parentNode,
          embed_primaryImage: args.embed_primaryImage,
        });
        const text = formatNodeDetailed(node);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error getting node: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: get_node_lineage ────────────────────────────────────────

  server.registerTool(
    "get_node_lineage",
    {
      title: "Get Node Lineage",
      description: `Get the ancestral lineage (chain of parent taxa) for a given phylogenetic node. Returns a list of nodes from the immediate parent up to the root of the tree of life. Useful for understanding the taxonomic classification of an organism.`,
      inputSchema: {
        uuid: z
          .string()
          .uuid()
          .describe("The UUID of the phylogenetic node to get the lineage for."),
      },
    },
    async (args) => {
      try {
        const page = await api.getNodeLineage(args.uuid);
        // The lineage endpoint returns embedded Node entities when
        // embed_items=true is passed (handled by the client).
        const items = page._embedded?.items ?? [];
        const lines: string[] = [
          `Lineage for node ${args.uuid}:`,
          "",
        ];
        if (items.length === 0) {
          lines.push("No lineage found (this may be the root node).");
        } else {
          for (let i = 0; i < items.length; i++) {
            lines.push(`${i + 1}. ${formatNodeSummary(items[i])}`);
          }
        }
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error getting lineage: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: get_root_node ───────────────────────────────────────────

  server.registerTool(
    "get_root_node",
    {
      title: "Get Root Node",
      description: `Get the root phylogenetic node (the ancestor of all organisms in PhyloPic's database). This is the top of the tree of life. Can optionally embed the primary image data.`,
      inputSchema: {
        embed_primaryImage: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to embed the primary image data in the response."),
      },
    },
    async (args) => {
      try {
        const node = await api.getRootNode({
          embed_primaryImage: args.embed_primaryImage,
        });
        const text = formatNodeDetailed(node);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error getting root node: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: get_image ───────────────────────────────────────────────

  server.registerTool(
    "get_image",
    {
      title: "Get Image",
      description: `Get detailed information about a specific silhouette image by its UUID. Returns the image's contributor, taxonomic nodes, license, and links to all available file formats (source file, vector SVG, raster PNG files at various sizes, and thumbnail files). Can optionally embed the contributor, specific node, general node, and full lineage nodes.`,
      inputSchema: {
        uuid: z
          .string()
          .uuid()
          .describe("The UUID of the silhouette image (e.g. '045279d5-24e5-4838-bec9-0bea86812e35')."),
        embed_contributor: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to embed the contributor data in the response."),
        embed_generalNode: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to embed the general (broader) taxonomic node data."),
        embed_specificNode: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to embed the specific taxonomic node data."),
        embed_nodes: z
          .boolean()
          .optional()
          .default(false)
          .describe("Whether to embed the full taxonomic lineage nodes."),
      },
    },
    async (args) => {
      try {
        const image = await api.getImage(args.uuid, {
          embed_contributor: args.embed_contributor,
          embed_generalNode: args.embed_generalNode,
          embed_specificNode: args.embed_specificNode,
          embed_nodes: args.embed_nodes,
        });
        const text = formatImageDetailed(image);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error getting image: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: search_images_by_node ───────────────────────────────────

  server.registerTool(
    "search_images_by_node",
    {
      title: "Search Images by Node",
      description: `List silhouette images that directly represent a specific phylogenetic node. Use this to find all images of a particular taxon (e.g. all images of Homo sapiens). For ancestral nodes, consider using 'search_images_by_clade' instead to get images of all descendant taxa as well.`,
      inputSchema: {
        node_uuid: z
          .string()
          .uuid()
          .describe("The UUID of the phylogenetic node to find images for."),
        page: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Zero-indexed page number for pagination. Defaults to 0 (first page)."),
      },
    },
    async (args) => {
      try {
        const page = await api.listImagesForNode(args.node_uuid, args.page, true);
        const text = formatImagePage(page);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error searching images by node: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: search_images_by_clade ──────────────────────────────────

  server.registerTool(
    "search_images_by_clade",
    {
      title: "Search Images by Clade",
      description: `List silhouette images within a clade (a node and all its descendants). This is useful for ancestral nodes — for example, getting all images of mammals, birds, or insects. Images are roughly sorted by their subject matter's proximity to the clade root node.`,
      inputSchema: {
        clade_uuid: z
          .string()
          .uuid()
          .describe("The UUID of the clade root node (e.g. 'e23284cb-38bd-4dc3-8a20-9a4a59ef23ed' for all primates)."),
        page: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Zero-indexed page number for pagination. Defaults to 0 (first page)."),
      },
    },
    async (args) => {
      try {
        const page = await api.listImagesForClade(args.clade_uuid, args.page, true);
        const text = formatImagePage(page);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error searching images by clade: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: list_images_by_contributor ──────────────────────────────

  server.registerTool(
    "list_images_by_contributor",
    {
      title: "List Images by Contributor",
      description: `List silhouette images contributed by a specific PhyloPic contributor. Use this to browse all images uploaded by a particular artist or contributor.`,
      inputSchema: {
        contributor_uuid: z
          .string()
          .uuid()
          .describe("The UUID of the contributor."),
        page: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Zero-indexed page number for pagination. Defaults to 0 (first page)."),
      },
    },
    async (args) => {
      try {
        const page = await api.listImagesByContributor(args.contributor_uuid, args.page, true);
        const text = formatImagePage(page);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error listing images by contributor: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: list_contributors ───────────────────────────────────────

  server.registerTool(
    "list_contributors",
    {
      title: "List Contributors",
      description: `List all PhyloPic contributors (artists who have uploaded silhouette images). Contributors are sorted by image count (most prolific first). Each contributor entry includes their name, UUID, total image count, and contact info if available.`,
      inputSchema: {
        page: z
          .number()
          .int()
          .min(0)
          .optional()
          .default(0)
          .describe("Zero-indexed page number for pagination. Defaults to 0 (first page)."),
      },
    },
    async (args) => {
      try {
        const page = await api.listContributors({
          page: args.page,
          embed_items: true,
        });
        const text = formatContributorPage(page);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error listing contributors: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: get_contributor ─────────────────────────────────────────

  server.registerTool(
    "get_contributor",
    {
      title: "Get Contributor",
      description: `Get detailed information about a specific PhyloPic contributor by their UUID. Returns the contributor's name, total image count, creation date, and contact information if available.`,
      inputSchema: {
        uuid: z
          .string()
          .uuid()
          .describe("The UUID of the contributor (e.g. '060f03a9-fafd-4d08-81d1-b8f82080573f')."),
      },
    },
    async (args) => {
      try {
        const contributor = await api.getContributor(args.uuid);
        const text = formatContributorSummary(contributor);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error getting contributor: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: list_licenses ───────────────────────────────────────────

  server.registerTool(
    "list_licenses",
    {
      title: "List Licenses",
      description: `List all Creative Commons licenses available for new image submissions to PhyloPic. Each license includes a link to the full license text. Useful for understanding what licenses are accepted when contributing images.`,
      inputSchema: {},
    },
    async () => {
      try {
        const licenses = await api.listLicenses();
        const lines: string[] = [
          "Available Licenses for New Submissions:",
          "",
        ];
        if (licenses.length === 0) {
          lines.push("No licenses found.");
        } else {
          for (let i = 0; i < licenses.length; i++) {
            const lic = licenses[i];
            lines.push(`${i + 1}. ${lic.title ?? lic.href}`);
            lines.push(`   URL: ${lic.href}`);
          }
        }
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error listing licenses: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: list_namespaces ─────────────────────────────────────────

  server.registerTool(
    "list_namespaces",
    {
      title: "List External Namespaces",
      description: `List all authorized external taxonomic database namespaces that can be used for resolving external identifiers to PhyloPic nodes. These include databases like GBIF, Open Tree of Life, NCBI, Paleobiology Database, and more. Each namespace has an authority and a namespace identifier.`,
      inputSchema: {},
    },
    async () => {
      try {
        const response = await api.listNamespaces();
        const lines: string[] = [
          "Authorized External Namespaces:",
          "",
        ];
        for (let i = 0; i < response.namespaces.length; i++) {
          const ns = response.namespaces[i];
          lines.push(
            `${i + 1}. Authority: ${ns.authority} | Namespace: ${ns.namespace} | Resolve path: /resolve/${ns.authority}/${ns.namespace}`,
          );
        }
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error listing namespaces: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: resolve_external_id ─────────────────────────────────────

  server.registerTool(
    "resolve_external_id",
    {
      title: "Resolve External Identifier",
      description: `Resolve an external taxonomic database identifier to the closest matching PhyloPic phylogenetic node. For example, resolve a GBIF species key or an NCBI taxon ID to find the corresponding PhyloPic node. Use 'list_namespaces' first to see available authorities and namespaces.`,
      inputSchema: {
        authority: z
          .string()
          .min(1)
          .describe("The authority of the external database (e.g. 'gbif.org', 'ncbi.nlm.nih.gov', 'opentreeoflife.org')."),
        namespace: z
          .string()
          .min(1)
          .describe("The namespace within the authority (e.g. 'species', 'taxid', 'taxonomy')."),
        object_id: z
          .string()
          .min(1)
          .describe("The external identifier to resolve (e.g. '9443' for NCBI taxid of Primates)."),
      },
    },
    async (args) => {
      try {
        const node = await api.resolve(args.authority, args.namespace, args.object_id);
        const text = formatNodeSummary(node);
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error resolving external ID: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: get_api_info ────────────────────────────────────────────

  server.registerTool(
    "get_api_info",
    {
      title: "Get API Info",
      description: `Get general information about the PhyloPic API, including the current build number, API version, and available resource endpoints. Useful for checking API status and discovering available endpoints.`,
      inputSchema: {},
    },
    async () => {
      try {
        const root = await api.getAPIRoot();
        const lines: string[] = [
          "PhyloPic API Information:",
          "",
          `Title: ${root.title}`,
          `Version: ${root.version}`,
          `Build: ${root.build}`,
          `Build Timestamp: ${root.buildTimestamp}`,
          "",
          "Available Resources:",
        ];
        for (const resource of root._links.resources) {
          lines.push(`  - ${resource.title}: ${resource.href}`);
        }
        lines.push("");
        lines.push(`Documentation: ${root._links.documentation.href}`);
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error getting API info: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  // ── Tool: ping ────────────────────────────────────────────────────

  server.registerTool(
    "ping",
    {
      title: "Ping API",
      description: `Check if the PhyloPic API is operational. Returns a simple status message. Useful for health checks and connectivity verification.`,
      inputSchema: {},
    },
    async () => {
      try {
        const isUp = await api.ping();
        const text = isUp
          ? "PhyloPic API is operational (status: OK)."
          : "PhyloPic API is not responding (status: DOWN).";
        return {
          content: [{ type: "text", text }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error pinging API: ${(err as Error).message}` }],
          isError: true,
        };
      }
    },
  );

  return server;
}

/**
 * Start the MCP server using the stdio transport.
 *
 * This is the main entry point for running the server as a
 * command-line tool that communicates via stdin/stdout.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

