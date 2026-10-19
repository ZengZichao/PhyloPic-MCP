/**
 * PhyloPic API v2 client.
 *
 * Wraps all PhyloPic REST API endpoints with automatic build-number
 * management, proper Accept headers, and typed responses.
 *
 * @module api/client
 */

import type {
  APIRoot,
  ApiErrorResponse,
  AutocompleteResponse,
  Contributor,
  ContributorListParams,
  Image,
  ImageListParams,
  ImageWithEmbedded,
  License,
  NamespacesResponse,
  Node,
  NodeListParams,
  NodeWithEmbedded,
  Page,
} from "./types.js";

/** Base URL for the PhyloPic API. */
const BASE_URL = "https://api.phylopic.org";

/** Accept header value for API v2. */
const ACCEPT_HEADER = "application/vnd.phylopic.v2+json";

/** Request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 30000;

/**
 * PhyloPic API client.
 *
 * Automatically handles the build number: the first request fetches the
 * current build from the API root, and subsequent requests reuse it.
 * If a `410 Gone` is returned (stale build), the client re-fetches the
 * build number and retries once.
 */
export class PhyloPicClient {
  private build: number | null = null;
  private readonly baseUrl: string;

  /**
   * @param baseUrl Override the default API base URL (mainly for testing).
   */
  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ── Public API ────────────────────────────────────────────────────

  /**
   * Fetch the API root (index) to obtain the current build number and
   * general metadata.
   */
  async getAPIRoot(): Promise<APIRoot> {
    const data = await this.request<APIRoot>("/");
    this.build = data.build;
    return data;
  }

  /**
   * Ping the API to check if it's operational.
   * Returns `true` if the API is up.
   */
  async ping(): Promise<boolean> {
    try {
      const build = await this.ensureBuild();
      const params = new URLSearchParams({ build: String(build) });
      // The /ping endpoint returns 204 No Content on success.
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );
      try {
        const response = await fetch(
          `${this.baseUrl}/ping?${params}`,
          {
            headers: { Accept: ACCEPT_HEADER },
            signal: controller.signal,
            redirect: "follow",
          },
        );
        return response.ok;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      return false;
    }
  }

  /**
   * Ensure we have a valid build number before making build-dependent calls.
   */
  private async ensureBuild(): Promise<number> {
    if (this.build === null) {
      await this.getAPIRoot();
    }
    return this.build!;
  }

  /**
   * Autocomplete taxonomic name suggestions.
   *
   * @param query Partial text to search for (lower-case recommended).
   * @returns A list of matching name suggestions.
   */
  async autocomplete(query: string): Promise<AutocompleteResponse> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({ build: String(build), query });
    return this.request<AutocompleteResponse>(`/autocomplete?${params}`);
  }

  // ── Images ────────────────────────────────────────────────────────

  /**
   * Get a specific image by UUID.
   *
   * @param uuid The image UUID.
   * @param options Embed options for related entities.
   */
  async getImage(
    uuid: string,
    options: {
      embed_contributor?: boolean;
      embed_generalNode?: boolean;
      embed_specificNode?: boolean;
      embed_nodes?: boolean;
    } = {},
  ): Promise<ImageWithEmbedded> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({ build: String(build) });
    if (options.embed_contributor) params.set("embed_contributor", "true");
    if (options.embed_generalNode) params.set("embed_generalNode", "true");
    if (options.embed_specificNode) params.set("embed_specificNode", "true");
    if (options.embed_nodes) params.set("embed_nodes", "true");
    return this.request<ImageWithEmbedded>(
      `/images/${uuid}?${params}`,
    );
  }

  /**
   * List images, optionally filtered.
   *
   * @param params Filtering and pagination parameters.
   */
  async listImages(params: ImageListParams = {}): Promise<Page<Image>> {
    const build = await this.ensureBuild();
    return this.request<Page<Image>>(
      "/images",
      { ...params, build },
    );
  }

  /**
   * List images for a specific node (direct matches only).
   *
   * @param nodeUuid The node UUID.
   * @param page Zero-indexed page number.
   * @param embedItems Whether to embed image data in the response.
   */
  async listImagesForNode(
    nodeUuid: string,
    page = 0,
    embedItems = true,
  ): Promise<Page<Image>> {
    return this.listImages({
      filter_node: nodeUuid,
      page,
      embed_items: embedItems,
    });
  }

  /**
   * List images within a clade (node and all descendants).
   *
   * @param cladeUuid The clade root node UUID.
   * @param page Zero-indexed page number.
   * @param embedItems Whether to embed image data in the response.
   */
  async listImagesForClade(
    cladeUuid: string,
    page = 0,
    embedItems = true,
  ): Promise<Page<Image>> {
    return this.listImages({
      filter_clade: cladeUuid,
      page,
      embed_items: embedItems,
    });
  }

  /**
   * List images by a specific contributor.
   *
   * @param contributorUuid The contributor UUID.
   * @param page Zero-indexed page number.
   * @param embedItems Whether to embed image data in the response.
   */
  async listImagesByContributor(
    contributorUuid: string,
    page = 0,
    embedItems = true,
  ): Promise<Page<Image>> {
    return this.listImages({
      filter_contributor: contributorUuid,
      page,
      embed_items: embedItems,
    });
  }

  // ── Nodes ─────────────────────────────────────────────────────────

  /**
   * Get a specific phylogenetic node by UUID.
   *
   * @param uuid The node UUID.
   * @param options Embed options for related entities.
   */
  async getNode(
    uuid: string,
    options: {
      embed_parentNode?: boolean;
      embed_primaryImage?: boolean;
    } = {},
  ): Promise<NodeWithEmbedded> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({ build: String(build) });
    if (options.embed_parentNode) params.set("embed_parentNode", "true");
    if (options.embed_primaryImage) params.set("embed_primaryImage", "true");
    return this.request<NodeWithEmbedded>(`/nodes/${uuid}?${params}`);
  }

  /**
   * Get the lineage (ancestral chain) for a node.
   *
   * The API paginates the lineage; this method requests the first
   * page with embedded items so the caller receives the actual
   * Node entities (not just links).
   *
   * @param uuid The node UUID.
   */
  async getNodeLineage(uuid: string): Promise<Page<Node>> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({
      build: String(build),
      embed_items: "true",
      page: "0",
    });
    return this.request<Page<Node>>(`/nodes/${uuid}/lineage?${params}`);
  }

  /**
   * Get the root phylogenetic node (ancestor of all others).
   */
  async getRootNode(
    options: {
      embed_primaryImage?: boolean;
    } = {},
  ): Promise<NodeWithEmbedded> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({ build: String(build) });
    if (options.embed_primaryImage) params.set("embed_primaryImage", "true");
    return this.request<NodeWithEmbedded>(`/root?${params}`);
  }

  /**
   * Search for nodes by taxonomic name.
   *
   * @param name The taxonomic name to search for (lower-case recommended,
   *   non-alphabetic characters removed, whitespace trimmed).
   * @param page Zero-indexed page number.
   * @param embedItems Whether to embed node data in the response.
   */
  async searchNodes(
    name: string,
    page = 0,
    embedItems = true,
  ): Promise<Page<Node>> {
    const build = await this.ensureBuild();
    return this.request<Page<Node>>(
      "/nodes",
      {
        build,
        filter_name: name,
        page,
        embed_items: embedItems,
      },
    );
  }

  /**
   * List all nodes, optionally filtered.
   *
   * @param params Filtering and pagination parameters.
   */
  async listNodes(params: NodeListParams = {}): Promise<Page<Node>> {
    const build = await this.ensureBuild();
    return this.request<Page<Node>>("/nodes", { ...params, build });
  }

  // ── Contributors ──────────────────────────────────────────────────

  /**
   * List all contributing users.
   *
   * @param params Pagination and embed parameters.
   */
  async listContributors(
    params: ContributorListParams = {},
  ): Promise<Page<Contributor>> {
    const build = await this.ensureBuild();
    return this.request<Page<Contributor>>(
      "/contributors",
      { ...params, build },
    );
  }

  /**
   * Get a specific contributor by UUID.
   *
   * @param uuid The contributor UUID.
   */
  async getContributor(uuid: string): Promise<Contributor> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({ build: String(build) });
    return this.request<Contributor>(`/contributors/${uuid}?${params}`);
  }

  // ── Licenses ──────────────────────────────────────────────────────

  /**
   * List all licenses available for new submissions.
   *
   * The /licenses endpoint returns a bare array of simple link objects
   * (each with `href` and optional `title`), not a standard HAL page.
   */
  async listLicenses(): Promise<License[]> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({ build: String(build) });
    return this.request<License[]>(`/licenses?${params}`);
  }

  // ── External Identifiers ──────────────────────────────────────────

  /**
   * List authorized external namespaces for resolving.
   */
  async listNamespaces(): Promise<NamespacesResponse> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({ build: String(build) });
    return this.request<NamespacesResponse>(`/namespaces?${params}`);
  }

  /**
   * Resolve an external identifier to the closest phylogenetic node.
   *
   * The API responds with a 303 redirect to the resolved node's
   * canonical URL; we follow the redirect and return the full
   * Node entity.
   *
   * @param authority The authority (e.g. "gbif.org").
   * @param namespace The namespace (e.g. "species").
   * @param objectId The external identifier.
   */
  async resolve(
    authority: string,
    namespace: string,
    objectId: string,
  ): Promise<NodeWithEmbedded> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({ build: String(build) });
    return this.request<NodeWithEmbedded>(
      `/resolve/${authority}/${namespace}/${objectId}?${params}`,
    );
  }

  /**
   * Resolve a list of external identifiers to a single phylogenetic node.
   *
   * @param authority The authority (e.g. "gbif.org").
   * @param namespace The namespace (e.g. "species").
   * @param objectIds Array of external identifiers (least to most inclusive).
   */
  async resolveMultiple(
    authority: string,
    namespace: string,
    objectIds: string[],
  ): Promise<NodeWithEmbedded> {
    const build = await this.ensureBuild();
    const params = new URLSearchParams({
      build: String(build),
      objectIDs: objectIds.join(","),
    });
    return this.request<NodeWithEmbedded>(
      `/resolve/${authority}/${namespace}?${params}`,
    );
  }

  // ── Internal request handler ──────────────────────────────────────

  /**
   * Low-level request method. Automatically handles redirects for the
   * build parameter and retries once on `410 Gone`.
   */
  private async request<T>(
    path: string,
    queryParams?: Record<string, unknown>,
  ): Promise<T> {
    const url = this.buildUrl(path, queryParams);
    return this.doRequest<T>(url, 0);
  }

  /**
   * Build a full URL from a path and optional query parameters.
   */
  private buildUrl(path: string, queryParams?: Record<string, unknown>): string {
    let url = `${this.baseUrl}${path}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value === undefined || value === null) continue;
        if (typeof value === "boolean") {
          params.set(key, value ? "true" : "false");
        } else {
          params.set(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) {
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    }
    return url;
  }

  /**
   * Perform the actual HTTP request with redirect and retry handling.
   *
   * @param url The full URL to request.
   * @param retryCount Current retry count (0 = first attempt).
   */
  private async doRequest<T>(url: string, retryCount: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        headers: {
          Accept: ACCEPT_HEADER,
        },
        signal: controller.signal,
        redirect: "follow",
      });

      if (!response.ok) {
        // 410 Gone → build number is stale; refresh and retry once.
        if (response.status === 410 && retryCount === 0) {
          this.build = null;
          await this.ensureBuild();
          // Rebuild the URL with the new build number.
          const newUrl = this.refreshBuildInUrl(url);
          return this.doRequest<T>(newUrl, retryCount + 1);
        }

        // Try to extract a human-friendly error message from the body.
        const body = await response.text().catch(() => "");
        let message = body || response.statusText;

        // The PhyloPic API returns JSON error bodies with an `errors` array.
        if (body) {
          try {
            const errorBody = JSON.parse(body) as ApiErrorResponse;
            if (errorBody.errors && errorBody.errors.length > 0) {
              const userMessages = errorBody.errors
                .map((e) => e.userMessage)
                .filter(Boolean);
              if (userMessages.length > 0) {
                message = userMessages.join("; ");
              }
            }
          } catch {
            // Body is not JSON; fall back to the raw text.
          }
        }

        throw new Error(
          `PhyloPic API error ${response.status}: ${message}`,
        );
      }

      // 204 No Content (e.g. from /ping) — return null cast as T.
      if (response.status === 204) {
        return null as T;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Replace the build query parameter in a URL with the current build.
   */
  private refreshBuildInUrl(url: string): string {
    const urlObj = new URL(url);
    if (this.build !== null) {
      urlObj.searchParams.set("build", String(this.build));
    }
    return urlObj.toString();
  }
}
