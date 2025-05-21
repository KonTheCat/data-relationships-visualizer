import { D3Link, D3Node, RelationshipType } from "../types/graphTypes";
import { DataAsset } from "../../models/DataAsset";

/**
 * Calculates the radius of a node based on the text length.
 * @param name The name of the node
 * @returns The calculated radius
 */
export const calculateNodeRadius = (name: string): number => {
  // Base radius of 30px, but increase for longer names
  // Each character needs ~4px of radius
  return Math.max(30, name.length * 4);
};

/**
 * Identifies the type of relationship between a node and the selected node.
 * @param nodeId The ID of the node to check
 * @param selectedNodeId The ID of the selected node
 * @param links The array of links in the graph
 * @returns The type of relationship
 */
export const getNodeRelationshipType = (
  nodeId: string,
  selectedNodeId: string,
  links: D3Link[]
): RelationshipType => {
  if (nodeId === selectedNodeId) {
    return "selected";
  }

  // Check if this node is a direct dependency (selected node uses this node's data)
  const isDirectDependency = links.some((link) => {
    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;
    return sourceId === nodeId && targetId === selectedNodeId;
  });

  if (isDirectDependency) {
    return "directDependency";
  }

  // Check if this node is a direct user (this node uses selected node's data)
  const isDirectUser = links.some((link) => {
    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;
    return sourceId === selectedNodeId && targetId === nodeId;
  });

  if (isDirectUser) {
    return "directUser";
  }

  return "indirectlyRelated";
};

/**
 * Creates the nodes array from the data assets.
 * @param dataAssets The array of data assets
 * @returns The array of D3 nodes
 */
export const createNodesFromDataAssets = (
  dataAssets: DataAsset[]
): D3Node[] => {
  return dataAssets.map((asset) => ({
    id: asset.name,
    name: asset.name,
    description: asset.description,
    radius: calculateNodeRadius(asset.name),
  }));
};

/**
 * Creates the links array from the data assets.
 * @param dataAssets The array of data assets
 * @param nodes The array of nodes
 * @returns The array of D3 links
 */
export const createLinksFromDataAssets = (
  dataAssets: DataAsset[],
  nodes: D3Node[]
): D3Link[] => {
  const links: D3Link[] = [];

  dataAssets.forEach((asset) => {
    if (asset.relationships && asset.relationships.length > 0) {
      asset.relationships.forEach((rel) => {
        // Check if the target node exists in our nodes array
        if (nodes.some((node) => node.id === rel.name)) {
          // Reverse the relationship direction to show that the related asset is used by this asset
          // source = the data being used, target = the asset using it
          links.push({
            source: rel.name, // The source data asset
            target: asset.name, // The asset that uses the source data
          });
        }
      });
    }
  });

  return links;
};

/**
 * Calculates the depths of nodes based on their relationships.
 * @param nodes The array of nodes
 * @param links The array of links
 * @returns A map of node IDs to their depths
 */
export const calculateNodeDepths = (
  nodes: D3Node[],
  links: D3Link[]
): Map<string, number> => {
  // Create a map to store each node's depth
  const depthMap = new Map<string, number>();

  // Start with nodes that have no outgoing relationships
  // (nodes that are not used by any other node)
  const rootNodes = nodes.filter(
    (node) =>
      !links.some(
        (link) =>
          (link.target as string | D3Node) === node.id ||
          (typeof link.target === "object" && link.target.id === node.id)
      )
  );

  // Assign depth 0 to root nodes
  rootNodes.forEach((node) => depthMap.set(node.id, 0));

  // Function to get all child nodes (nodes that use this node)
  const getChildNodes = (nodeId: string) => {
    return links
      .filter(
        (link) =>
          (link.source as string) === nodeId ||
          (typeof link.source === "object" && link.source.id === nodeId)
      )
      .map((link) =>
        typeof link.target === "object"
          ? link.target.id
          : (link.target as string)
      );
  };

  // Breadth-first traversal to assign depths
  const queue = [...rootNodes.map((n) => n.id)];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = depthMap.get(currentId) || 0;

    // Get all children and assign them depth + 1
    const children = getChildNodes(currentId);
    children.forEach((childId) => {
      // If this child already has a depth assigned, use the maximum
      const existingDepth = depthMap.get(childId as string);
      const newDepth = currentDepth + 1;

      if (existingDepth === undefined || newDepth > existingDepth) {
        depthMap.set(childId as string, newDepth);
      }

      queue.push(childId as string);
    });
  }

  // If there are any nodes without a depth (disconnected), assign them depth 0
  nodes.forEach((node) => {
    if (!depthMap.has(node.id)) {
      depthMap.set(node.id, 0);
    }
  });

  return depthMap;
};

/**
 * Finds the maximum depth in a node depth map.
 * @param nodeDepths The map of node IDs to their depths
 * @returns The maximum depth
 */
export const getMaxDepth = (nodeDepths: Map<string, number>): number => {
  let maxDepth = 0;
  nodeDepths.forEach((depth) => {
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  });
  return maxDepth;
};

/**
 * Finds all connected nodes (direct and indirect relationships) from a given node.
 * @param nodeId The ID of the node to start from
 * @param links The array of links in the graph
 * @param nodes The array of nodes in the graph
 * @returns A set of connected node IDs
 */
export const findConnectedNodes = (
  nodeId: string,
  links: D3Link[],
  nodes: D3Node[]
): Set<string> => {
  const connected = new Set<string>();
  connected.add(nodeId);

  const findRelatedNodes = (id: string, direction: "outgoing" | "incoming") => {
    const relatedLinks = links.filter((link) => {
      if (direction === "outgoing") {
        // Find links where this node is the source
        return (
          (typeof link.source === "object" && link.source.id === id) ||
          (typeof link.source === "string" && link.source === id)
        );
      } else {
        // Find links where this node is the target
        return (
          (typeof link.target === "object" && link.target.id === id) ||
          (typeof link.target === "string" && link.target === id)
        );
      }
    });

    relatedLinks.forEach((link) => {
      const relatedId =
        typeof link[direction === "outgoing" ? "target" : "source"] === "object"
          ? (link[direction === "outgoing" ? "target" : "source"] as D3Node).id
          : (link[direction === "outgoing" ? "target" : "source"] as string);

      if (!connected.has(relatedId)) {
        connected.add(relatedId);
        // Recursively find connected nodes in both directions
        findRelatedNodes(relatedId, "outgoing");
        findRelatedNodes(relatedId, "incoming");
      }
    });
  };

  // Start searching in both directions
  findRelatedNodes(nodeId, "outgoing");
  findRelatedNodes(nodeId, "incoming");

  return connected;
};

/**
 * Finds all connected nodes from multiple source nodes.
 * @param nodeIds An array of node IDs to start from
 * @param links The array of links in the graph
 * @param nodes The array of nodes in the graph
 * @returns A set of connected node IDs
 */
export const findConnectedNodesFromMultiple = (
  nodeIds: string[],
  links: D3Link[],
  nodes: D3Node[]
): Set<string> => {
  const connected = new Set<string>();

  nodeIds.forEach((nodeId) => {
    connected.add(nodeId);

    const findRelatedNodes = (
      id: string,
      direction: "outgoing" | "incoming"
    ) => {
      const relatedLinks = links.filter((link) => {
        if (direction === "outgoing") {
          // Find links where this node is the source
          return (
            (typeof link.source === "object" && link.source.id === id) ||
            (typeof link.source === "string" && link.source === id)
          );
        } else {
          // Find links where this node is the target
          return (
            (typeof link.target === "object" && link.target.id === id) ||
            (typeof link.target === "string" && link.target === id)
          );
        }
      });

      relatedLinks.forEach((link) => {
        const relatedId =
          typeof link[direction === "outgoing" ? "target" : "source"] ===
          "object"
            ? (link[direction === "outgoing" ? "target" : "source"] as D3Node)
                .id
            : (link[direction === "outgoing" ? "target" : "source"] as string);

        if (!connected.has(relatedId)) {
          connected.add(relatedId);
          // Recursively find connected nodes in both directions
          findRelatedNodes(relatedId, "outgoing");
          findRelatedNodes(relatedId, "incoming");
        }
      });
    };

    // Start searching in both directions
    findRelatedNodes(nodeId, "outgoing");
    findRelatedNodes(nodeId, "incoming");
  });

  return connected;
};

/**
 * Gets direct dependencies of a node (assets that the node uses).
 * @param selectedNodeId The ID of the selected node
 * @param links The array of links in the graph
 * @returns A set of direct dependency node IDs
 */
export const getDirectDependencies = (
  selectedNodeId: string,
  links: D3Link[]
): Set<string> => {
  const directDependencies = new Set<string>();

  links.forEach((link) => {
    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;

    if (targetId === selectedNodeId) {
      directDependencies.add(sourceId as string);
    }
  });

  return directDependencies;
};

/**
 * Gets direct users of a node (assets that use the node's data).
 * @param selectedNodeId The ID of the selected node
 * @param links The array of links in the graph
 * @returns A set of direct user node IDs
 */
export const getDirectUsers = (
  selectedNodeId: string,
  links: D3Link[]
): Set<string> => {
  const directUsers = new Set<string>();

  links.forEach((link) => {
    const sourceId =
      typeof link.source === "object" ? link.source.id : link.source;
    const targetId =
      typeof link.target === "object" ? link.target.id : link.target;

    if (sourceId === selectedNodeId) {
      directUsers.add(targetId as string);
    }
  });

  return directUsers;
};
