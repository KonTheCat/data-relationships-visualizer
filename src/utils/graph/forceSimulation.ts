import * as d3 from "d3";
import { D3Link, D3Node } from "../types/graphTypes";
import { calculateNodeDepths, getMaxDepth } from "./graphCalculations";

/**
 * Creates and configures the D3 force simulation for the graph.
 * @param nodes The array of nodes
 * @param links The array of links
 * @param dimensions The dimensions of the visualization area
 * @returns The configured simulation
 */
export const createForceSimulation = (
  nodes: D3Node[],
  links: D3Link[],
  dimensions: { width: number; height: number }
): d3.Simulation<D3Node, D3Link> => {
  // Calculate node depths
  const nodeDepths = calculateNodeDepths(nodes, links);
  const maxDepth = getMaxDepth(nodeDepths);

  // Assign initial x positions based on depth
  nodes.forEach((node) => {
    const depth = nodeDepths.get(node.id) || 0;
    // Set initial x position proportional to depth
    node.x = depth * (dimensions.width / (maxDepth + 1)) + 50;
    // Randomize initial y position
    node.y = Math.random() * dimensions.height;
  });

  // Create D3 force simulation with horizontal layout forces
  const simulation = d3
    .forceSimulation<D3Node>(nodes)
    .force(
      "link",
      d3
        .forceLink<D3Node, D3Link>(links)
        .id((d: any) => d.id)
        .distance(200) // Increased distance to reduce overlap
    )
    .force("charge", d3.forceManyBody().strength(-800)) // Increased repulsion force
    .force(
      "center",
      d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
    )
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d) => (d as D3Node).radius + 35) // Increased padding to prevent overlap
        .strength(1.0) // Maximum strength for collision prevention
    )
    // Add horizontal positioning force based on node depth
    .force(
      "x",
      d3
        .forceX()
        .x((d) => {
          // Need to cast d to D3Node to access the id property
          const nodeId = (d as D3Node).id;
          const depth = nodeDepths.get(nodeId) || 0;
          const step = dimensions.width / (maxDepth + 2);

          // Add a small offset based on node id hash to avoid exact vertical alignment
          const idHash = nodeId
            .split("")
            .reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const jitter = (idHash % 80) - 40; // +/- 40px jitter

          return (depth + 0.5) * step + jitter; // position nodes based on their depth with slight horizontal jitter
        })
        .strength(0.35) // Slightly reduced strength to allow jitter
    )
    // Add a vertical force to spread nodes within their depth level
    .force("y", d3.forceY(dimensions.height / 2).strength(0.1));

  // Add a custom force to prevent nodes from overlapping with links
  simulation.force("link-node-repulsion", (alpha) => {
    applyLinkNodeRepulsionForce(nodes, links, alpha);
  });

  return simulation;
};

/**
 * Custom force function to prevent nodes from overlapping with links.
 * @param nodes The array of nodes
 * @param links The array of links
 * @param alpha The current alpha value of the simulation
 */
const applyLinkNodeRepulsionForce = (
  nodes: D3Node[],
  links: D3Link[],
  alpha: number
): void => {
  // Loop through each node
  nodes.forEach((node) => {
    // Check each link for potential overlaps with this node
    links.forEach((link) => {
      const sourceNode =
        typeof link.source === "object"
          ? link.source
          : nodes.find((n) => n.id === link.source);
      const targetNode =
        typeof link.target === "object"
          ? link.target
          : nodes.find((n) => n.id === link.target);

      if (
        !sourceNode ||
        !targetNode ||
        sourceNode === node ||
        targetNode === node
      ) {
        // Skip if this node is part of the link or nodes not found
        return;
      }

      // Calculate if the node is near the link path
      const x1 = sourceNode.x || 0;
      const y1 = sourceNode.y || 0;
      const x2 = targetNode.x || 0;
      const y2 = targetNode.y || 0;
      const x0 = node.x || 0;
      const y0 = node.y || 0;

      // Calculate the squared distance from point to line segment
      const dx = x2 - x1;
      const dy = y2 - y1;
      const l2 = dx * dx + dy * dy; // Length of line squared

      if (l2 === 0) return; // Skip if line is a point

      // Calculate projection of node position onto line
      const t = Math.max(
        0,
        Math.min(1, ((x0 - x1) * dx + (y0 - y1) * dy) / l2)
      );
      const projX = x1 + t * dx;
      const projY = y1 + t * dy;

      // Calculate squared distance from node to projection point
      const nodeRadius = node.radius + 15; // Additional safe zone
      const distSq = (x0 - projX) * (x0 - projX) + (y0 - projY) * (y0 - projY);

      if (distSq < nodeRadius * nodeRadius) {
        // If node is too close to the link path, push it away
        const dist = Math.sqrt(distSq);
        const repulsionStrength =
          Math.min(5, (nodeRadius - dist) / nodeRadius) * alpha * 10;

        // Vector from projection to node
        const vx = (x0 - projX) / (dist || 1);
        const vy = (y0 - projY) / (dist || 1);

        // Apply force to node
        if (node.vx !== undefined && node.vy !== undefined) {
          node.vx += vx * repulsionStrength;
          node.vy += vy * repulsionStrength;
        }
      }
    });
  });
};
