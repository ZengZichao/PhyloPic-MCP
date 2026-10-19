/**
 * Formatting utilities for converting PhyloPic API entities into
 * human-readable text for MCP tool responses.
 *
 * @module tools/formatters
 */

import type {
  Contributor,
  Image,
  ImageWithEmbedded,
  Node,
  NodeWithEmbedded,
  Page,
} from "../api/types.js";

/**
 * Format a node's names into a readable string.
 *
 * Each name is an array of parts (scientific + citation, or vernacular).
 * We join the parts within a name, then join the names.
 */
export function formatNodeNames(names: Node["names"]): string {
  return names
    .map((nameParts) =>
      nameParts
        .map((p) => p.text)
        .join(" "),
    )
    .join(" | ");
}

/**
 * Get the primary/display name of a node (first name).
 */
export function getNodeDisplayName(node: Node): string {
  if (node.names.length === 0) return node.uuid;
  return node.names[0].map((p) => p.text).join(" ");
}

/**
 * Format a single node into a concise summary string.
 */
export function formatNodeSummary(node: Node): string {
  const name = getNodeDisplayName(node);
  const allNames = formatNodeNames(node.names);
  const lines: string[] = [
    `UUID: ${node.uuid}`,
    `Name: ${name}`,
  ];
  if (allNames !== name) {
    lines.push(`All Names: ${allNames}`);
  }
  lines.push(`Created: ${node.created}`);

  // Parent node
  const parent = node._links.parentNode;
  if (parent) {
    lines.push(`Parent: ${parent.title ?? parent.href}`);
  }

  // Primary image
  const primaryImage = node._links.primaryImage;
  if (primaryImage) {
    lines.push(`Primary Image: ${primaryImage.title ?? primaryImage.href}`);
  }

  // Number of child nodes
  const childCount = node._links.childNodes?.length ?? 0;
  if (childCount > 0) {
    lines.push(`Child Nodes: ${childCount}`);
  }

  return lines.join("\n");
}

/**
 * Format a node with embedded entities into a detailed string.
 */
export function formatNodeDetailed(node: NodeWithEmbedded): string {
  const lines: string[] = [formatNodeSummary(node)];

  // Embedded parent node
  if (node._embedded?.parentNode) {
    lines.push("");
    lines.push("--- Parent Node ---");
    lines.push(formatNodeSummary(node._embedded.parentNode));
  }

  // Embedded primary image
  if (node._embedded?.primaryImage) {
    lines.push("");
    lines.push("--- Primary Image ---");
    lines.push(formatImageSummary(node._embedded.primaryImage));
  }

  return lines.join("\n");
}

/**
 * Format an image into a concise summary string.
 */
export function formatImageSummary(image: Image | ImageWithEmbedded): string {
  const lines: string[] = [
    `UUID: ${image.uuid}`,
    `Created: ${image.created}`,
  ];
  if (image.modified) {
    lines.push(`Modified: ${image.modified}`);
  }
  if (image.attribution) {
    lines.push(`Attribution: ${image.attribution}`);
  }
  if (image.sponsor) {
    lines.push(`Sponsor: ${image.sponsor}`);
  }

  // Contributor
  const contributor = image._links.contributor;
  if (contributor) {
    lines.push(`Contributor: ${contributor.title ?? contributor.href}`);
  }

  // Specific node
  const specificNode = image._links.specificNode;
  if (specificNode) {
    lines.push(`Specific Node: ${specificNode.title ?? specificNode.href}`);
  }

  // General node
  const generalNode = image._links.generalNode;
  if (generalNode) {
    lines.push(`General Node: ${generalNode.title ?? generalNode.href}`);
  }

  // License
  const license = image._links.license;
  if (license) {
    lines.push(`License: ${license.href}`);
  }

  // File links
  const links = image._links;
  if (links.sourceFile) {
    lines.push(`Source File: ${links.sourceFile.href} (${links.sourceFile.type ?? "unknown"})`);
  }
  if (links.vectorFile) {
    lines.push(`Vector File: ${links.vectorFile.href} (${links.vectorFile.type ?? "SVG"})`);
  }
  if (links.rasterFiles && links.rasterFiles.length > 0) {
    lines.push("Raster Files:");
    for (const rf of links.rasterFiles) {
      lines.push(`  ${rf.href} [${rf.sizes ?? "?"}] (${rf.type ?? "unknown"})`);
    }
  }
  if (links.thumbnailFiles && links.thumbnailFiles.length > 0) {
    lines.push("Thumbnail Files:");
    for (const tf of links.thumbnailFiles) {
      lines.push(`  ${tf.href} [${tf.sizes ?? "?"}] (${tf.type ?? "unknown"})`);
    }
  }
  if (links["http://ogp.me/ns#image"]) {
    lines.push(`Social Preview: ${links["http://ogp.me/ns#image"].href}`);
  }

  // PhyloPic website URL
  lines.push(`View on PhyloPic: https://www.phylopic.org/images/${image.uuid}`);

  return lines.join("\n");
}

/**
 * Format an image with embedded entities into a detailed string.
 */
export function formatImageDetailed(image: ImageWithEmbedded): string {
  const lines: string[] = [formatImageSummary(image)];

  // Embedded contributor
  if (image._embedded?.contributor) {
    lines.push("");
    lines.push("--- Contributor ---");
    lines.push(formatContributorSummary(image._embedded.contributor));
  }

  // Embedded specific node
  if (image._embedded?.specificNode) {
    lines.push("");
    lines.push("--- Specific Node ---");
    lines.push(formatNodeSummary(image._embedded.specificNode));
  }

  // Embedded general node
  if (image._embedded?.generalNode) {
    lines.push("");
    lines.push("--- General Node ---");
    lines.push(formatNodeSummary(image._embedded.generalNode));
  }

  // Embedded nodes (lineage)
  if (image._embedded?.nodes && image._embedded.nodes.length > 0) {
    lines.push("");
    lines.push("--- Taxonomic Lineage ---");
    for (const n of image._embedded.nodes) {
      lines.push(`  - ${getNodeDisplayName(n)} (${n.uuid})`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a contributor into a concise summary string.
 */
export function formatContributorSummary(contributor: Contributor): string {
  const lines: string[] = [
    `UUID: ${contributor.uuid}`,
    `Name: ${contributor.name}`,
    `Image Count: ${contributor.count}`,
    `Created: ${contributor.created}`,
  ];
  if (contributor.modified) {
    lines.push(`Modified: ${contributor.modified}`);
  }
  const contact = contributor._links.contact;
  if (contact) {
    lines.push(`Contact: ${contact.href}`);
  }
  lines.push(`View on PhyloPic: https://www.phylopic.org/contributors/${contributor.uuid}`);
  return lines.join("\n");
}

/**
 * Format a page of nodes into a readable list.
 */
export function formatNodePage(page: Page<Node>): string {
  const lines: string[] = [];

  if (page.totalItems !== undefined) {
    lines.push(`Total Items: ${page.totalItems}`);
  }
  if (page.totalPages !== undefined) {
    lines.push(`Total Pages: ${page.totalPages}`);
  }
  if (page.index !== undefined) {
    lines.push(`Current Page: ${page.index}`);
  }
  lines.push("");

  const items = page._embedded?.items ?? [];
  if (items.length === 0) {
    lines.push("No items found.");
  } else {
    lines.push("Results:");
    for (let i = 0; i < items.length; i++) {
      lines.push(`\n[${i + 1}]`);
      lines.push(formatNodeSummary(items[i]));
    }
  }

  return lines.join("\n");
}

/**
 * Format a page of images into a readable list.
 */
export function formatImagePage(page: Page<Image>): string {
  const lines: string[] = [];

  if (page.totalItems !== undefined) {
    lines.push(`Total Items: ${page.totalItems}`);
  }
  if (page.totalPages !== undefined) {
    lines.push(`Total Pages: ${page.totalPages}`);
  }
  if (page.index !== undefined) {
    lines.push(`Current Page: ${page.index}`);
  }
  lines.push("");

  const items = page._embedded?.items ?? [];
  if (items.length === 0) {
    lines.push("No items found.");
  } else {
    lines.push("Results:");
    for (let i = 0; i < items.length; i++) {
      lines.push(`\n[${i + 1}]`);
      lines.push(formatImageSummary(items[i]));
    }
  }

  return lines.join("\n");
}

/**
 * Format a page of contributors into a readable list.
 */
export function formatContributorPage(page: Page<Contributor>): string {
  const lines: string[] = [];

  if (page.totalItems !== undefined) {
    lines.push(`Total Items: ${page.totalItems}`);
  }
  if (page.totalPages !== undefined) {
    lines.push(`Total Pages: ${page.totalPages}`);
  }
  if (page.index !== undefined) {
    lines.push(`Current Page: ${page.index}`);
  }
  lines.push("");

  const items = page._embedded?.items ?? [];
  if (items.length === 0) {
    lines.push("No items found.");
  } else {
    lines.push("Results:");
    for (let i = 0; i < items.length; i++) {
      lines.push(`\n[${i + 1}]`);
      lines.push(formatContributorSummary(items[i]));
    }
  }

  return lines.join("\n");
}
