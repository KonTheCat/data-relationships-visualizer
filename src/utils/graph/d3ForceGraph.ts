// D3 Force Graph Visualization
import * as d3 from "d3";
import { DataAsset } from "../../models/DataAsset";
import { D3Link, D3Node } from "../types/graphTypes";
import {
  createNodesFromDataAssets,
  createLinksFromDataAssets,
  findConnectedNodes,
  findConnectedNodesFromMultiple,
  getDirectDependencies,
  getDirectUsers,
} from "./graphCalculations";
import { createForceSimulation } from "./forceSimulation";
import { calculatePath, createArrowElement } from "./pathCalculations";

/**
 * Creates and renders a D3 force-directed graph visualization for data assets.
 * @param svgElement The SVG element to render the graph in
 * @param dataAssets The array of data assets to visualize
 * @param dimensions The dimensions of the visualization area
 * @param selectedNodeId Optional ID of the currently selected node
 * @param searchMatches Optional array of node IDs that match a search term
 */
export const createD3ForceGraph = (
  svgElement: SVGSVGElement,
  dataAssets: DataAsset[],
  dimensions: { width: number; height: number },
  selectedNodeId?: string | null,
  searchMatches?: string[] | null
) => {
  // Clear previous visualization
  d3.select(svgElement).selectAll("*").remove();

  // Create nodes and links
  const nodes: D3Node[] = createNodesFromDataAssets(dataAssets);
  const links: D3Link[] = createLinksFromDataAssets(dataAssets, nodes);

  // Create D3 force simulation with appropriate forces
  const simulation = createForceSimulation(nodes, links, dimensions);

  // Create SVG elements using D3
  const svg = d3.select(svgElement);

  // First create a group for links so they appear behind nodes
  const linkGroup = svg.append("g").attr("class", "links");

  // Use path elements instead of lines for better arrow positioning control
  const link = linkGroup
    .selectAll("path")
    .data(links)
    .enter()
    .append("path")
    .attr("stroke", "#999")
    .attr("stroke-width", 2.5)
    .attr("fill", "none")
    .attr("class", "relationship-link")
    .style("cursor", "pointer");

  // Add tooltips to links showing relationship direction
  link.append("title").text((d: D3Link) => {
    const sourceId = typeof d.source === "object" ? d.source.id : d.source;
    const targetId = typeof d.target === "object" ? d.target.id : d.target;
    return `${sourceId} → ${targetId}\nData flows from "${sourceId}" to "${targetId}"`;
  });

  // Create a group for nodes that will be rendered above links
  const nodeGroup = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .call(
      d3
        .drag<SVGGElement, D3Node>()
        .on("start", (event, d) => dragStarted(event, d, simulation))
        .on("drag", (event, d) => dragging(event, d, simulation))
        .on("end", (event, d) => dragEnded(event, d, simulation))
    );

  // Add circles for nodes
  const circles = nodeGroup
    .append("circle")
    .attr("r", (d: D3Node) => d.radius) // Use dynamic radius
    .attr("fill", "#4285f4")
    .attr("stroke", "#3367d6")
    .attr("stroke-width", 2)
    .style("cursor", "pointer");

  // Create tooltips for nodes that include relationships
  createNodeTooltips(circles, dataAssets);

  // Add text labels to nodes
  const labels = nodeGroup
    .append("text")
    .text((d: D3Node) => d.name) // Use full name
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("fill", "white")
    .attr("font-size", "12px")
    .style("pointer-events", "none");

  // Apply filtering if a node is selected
  if (selectedNodeId) {
    applyNodeSelectionVisuals(
      selectedNodeId,
      nodes,
      links,
      nodeGroup,
      circles,
      link
    );
  } else if (searchMatches && searchMatches.length > 0) {
    // If search is active, show matching nodes and their connections
    applySearchMatchVisuals(
      searchMatches,
      nodes,
      links,
      nodeGroup,
      circles,
      labels,
      link
    );
  }

  // Add click handlers for nodes
  circles.on("click", function (event, d) {
    // Dispatch custom event with node id for filtering
    const clickEvent = new CustomEvent("nodeClick", {
      detail: { nodeId: d.id },
    });
    svgElement.dispatchEvent(clickEvent);

    // Prevent event from propagating
    event.stopPropagation();
  });

  // Add background click handler to reset filtering
  svg.on("click", function () {
    const resetEvent = new CustomEvent("resetFiltering");
    svgElement.dispatchEvent(resetEvent);
  });

  // Update positions on each tick of the simulation
  simulation.on("tick", () => {
    // Update node positions
    nodeGroup.attr("transform", (d: any) => {
      // Keep nodes within the SVG boundaries
      d.x = Math.max(d.radius, Math.min(dimensions.width - d.radius, d.x));
      d.y = Math.max(d.radius, Math.min(dimensions.height - d.radius, d.y));
      return `translate(${d.x}, ${d.y})`;
    });

    // Clear all arrows first to prevent accumulation
    linkGroup.selectAll("path.arrow, path[class^='arrow-']").remove();

    // Update each link path and its corresponding arrow together to ensure they're synchronized
    link.each(function (d: any, i) {
      const pathElement = d3.select(this);
      const pathData = calculatePath(d.source, d.target);

      // Update the path
      pathElement.attr("d", pathData.path);

      // Determine arrow color based on relationship to selected node
      let arrowColor = "#3367d6"; // Default blue

      if (selectedNodeId) {
        const sourceId = typeof d.source === "object" ? d.source.id : d.source;
        const targetId = typeof d.target === "object" ? d.target.id : d.target;

        if (sourceId === selectedNodeId) {
          arrowColor = "#fbbc05"; // User relationship - amber
        } else if (targetId === selectedNodeId) {
          arrowColor = "#34a853"; // Dependency relationship - green
        }
      }

      // Create arrow element with a unique ID to ensure proper tracking
      const sourceId = typeof d.source === "object" ? d.source.id : d.source;
      const targetId = typeof d.target === "object" ? d.target.id : d.target;
      const linkId = `${sourceId}-${targetId}-${i}`; // Add index for extra uniqueness

      try {
        // Create arrow element with the link's unique ID
        createArrowElement(linkGroup, pathData, arrowColor, linkId);
      } catch (error) {
        console.error("Error creating arrow during tick:", error);
      }
    });
  });

  // Run simulation for more iterations to establish better initial positions
  // This helps prevent initial overlaps and ensures proper arrow placement
  simulation.alpha(1).restart();
  for (let i = 0; i < 150; ++i) simulation.tick(); // More iterations for better layout

  // Force a final synchronization of arrows and links
  setTimeout(() => {
    simulation.tick();
  }, 100);
};

/**
 * Creates tooltips for nodes with detailed relationship information.
 * @param circles The D3 selection of node circles
 * @param dataAssets The array of data assets
 */
const createNodeTooltips = (
  circles: d3.Selection<SVGCircleElement, D3Node, SVGGElement, unknown>,
  dataAssets: DataAsset[]
) => {
  circles.append("title").text((d: D3Node) => {
    const asset = dataAssets.find((a) => a.name === d.name);
    let tooltip = `${d.name}\n${d.description}`;

    // Find assets that use this asset as a data source
    const usedBy = dataAssets.filter((a) =>
      a.relationships?.some((rel) => rel.name === d.name)
    );

    // Add "Used by" section if applicable
    if (usedBy.length > 0) {
      tooltip += "\n\nUsed by:";
      usedBy.forEach((user) => {
        tooltip += `\n- ${user.name}`;
      });
    }

    // Add "Uses data from" section if applicable
    if (asset?.relationships && asset.relationships.length > 0) {
      tooltip += "\n\nUses data from:";
      asset.relationships.forEach((rel) => {
        tooltip += `\n- ${rel.name}`;
      });
    }

    return tooltip;
  });
};

/**
 * Applies visual styles to nodes and links when a node is selected.
 * @param selectedNodeId The ID of the selected node
 * @param nodes The array of nodes
 * @param links The array of links
 * @param nodeGroup The D3 selection of node groups
 * @param circles The D3 selection of node circles
 * @param link The D3 selection of links
 */
const applyNodeSelectionVisuals = (
  selectedNodeId: string,
  nodes: D3Node[],
  links: D3Link[],
  nodeGroup: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>,
  circles: d3.Selection<SVGCircleElement, D3Node, SVGGElement, unknown>,
  link: d3.Selection<SVGPathElement, D3Link, SVGGElement, unknown>
) => {
  const connectedNodes = findConnectedNodes(selectedNodeId, links, nodes);
  const directDependencies = getDirectDependencies(selectedNodeId, links);
  const directUsers = getDirectUsers(selectedNodeId, links);

  // Update node visuals based on relationship type
  nodeGroup.style("opacity", (d) => (connectedNodes.has(d.id) ? 1 : 0.2));
  circles
    .attr("fill", (d) => {
      if (d.id === selectedNodeId) {
        return "#ea4335"; // Selected node - red
      } else if (directDependencies.has(d.id)) {
        return "#34a853"; // Direct dependency - green
      } else if (directUsers.has(d.id)) {
        return "#fbbc05"; // Direct user - yellow/amber
      } else if (connectedNodes.has(d.id)) {
        return "#4285f4"; // Indirectly connected - blue
      }
      return "#4285f4"; // Default blue
    })
    .attr("stroke", (d) => {
      if (d.id === selectedNodeId) {
        return "#c50f0f"; // Darker red for selected node
      } else if (directDependencies.has(d.id)) {
        return "#0f783e"; // Darker green for dependencies
      } else if (directUsers.has(d.id)) {
        return "#d09700"; // Darker amber for users
      }
      return "#3367d6"; // Default blue stroke
    })
    .attr("stroke-width", (d) => {
      // Highlight selected, direct dependencies and users with thicker stroke
      if (
        d.id === selectedNodeId ||
        directDependencies.has(d.id) ||
        directUsers.has(d.id)
      ) {
        return 3;
      }
      return 2;
    });

  // Update link visuals
  link
    .style("opacity", (d) => {
      const sourceId = typeof d.source === "object" ? d.source.id : d.source;
      const targetId = typeof d.target === "object" ? d.target.id : d.target;

      // Highlight links directly connected to selected node
      if (sourceId === selectedNodeId || targetId === selectedNodeId) {
        return 1;
      }

      return connectedNodes.has(sourceId as string) &&
        connectedNodes.has(targetId as string)
        ? 0.7
        : 0.1;
    })
    .attr("stroke", (d) => {
      const sourceId = typeof d.source === "object" ? d.source.id : d.source;
      const targetId = typeof d.target === "object" ? d.target.id : d.target;

      // Color links based on their relationship to selected node
      if (sourceId === selectedNodeId) {
        return "#fbbc05"; // Link to users - amber
      } else if (targetId === selectedNodeId) {
        return "#34a853"; // Link from dependencies - green
      }

      return "#999"; // Default gray
    })
    .attr("stroke-width", (d) => {
      const sourceId = typeof d.source === "object" ? d.source.id : d.source;
      const targetId = typeof d.target === "object" ? d.target.id : d.target;

      // Make direct links thicker
      if (sourceId === selectedNodeId || targetId === selectedNodeId) {
        return 3;
      }

      return 2.5;
    });
};

/**
 * Applies visual styles to nodes and links for search results.
 * @param searchMatches Array of node IDs that match the search term
 * @param nodes The array of nodes
 * @param links The array of links
 * @param nodeGroup The D3 selection of node groups
 * @param circles The D3 selection of node circles
 * @param labels The D3 selection of node labels
 * @param link The D3 selection of links
 */
const applySearchMatchVisuals = (
  searchMatches: string[],
  nodes: D3Node[],
  links: D3Link[],
  nodeGroup: d3.Selection<SVGGElement, D3Node, SVGGElement, unknown>,
  circles: d3.Selection<SVGCircleElement, D3Node, SVGGElement, unknown>,
  labels: d3.Selection<SVGTextElement, D3Node, SVGGElement, unknown>,
  link: d3.Selection<SVGPathElement, D3Link, SVGGElement, unknown>
) => {
  const connectedNodes = findConnectedNodesFromMultiple(
    searchMatches,
    links,
    nodes
  );

  // Update node visuals based on search matches and connections
  nodeGroup.style("opacity", (d) => (connectedNodes.has(d.id) ? 1 : 0.2));
  circles.attr("fill", (d) =>
    searchMatches.includes(d.id) ? "#ea4335" : "#4285f4"
  );

  // Highlight text for search matches
  labels
    .attr("fill", (d) => (searchMatches.includes(d.id) ? "#ffff00" : "white"))
    .attr("font-weight", (d) =>
      searchMatches.includes(d.id) ? "bold" : "normal"
    );

  // Update link visuals
  link.style("opacity", (d) => {
    const sourceId = typeof d.source === "object" ? d.source.id : d.source;
    const targetId = typeof d.target === "object" ? d.target.id : d.target;
    return connectedNodes.has(sourceId as string) &&
      connectedNodes.has(targetId as string)
      ? 1
      : 0.1;
  });
};

/**
 * Drag start handler for node dragging.
 * @param event The D3 drag event
 * @param d The node being dragged
 * @param simulation The D3 force simulation
 */
const dragStarted = (
  event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>,
  d: D3Node,
  simulation: d3.Simulation<D3Node, D3Link>
) => {
  if (!event.active) simulation.alphaTarget(0.3).restart();

  // Fix the node position during dragging
  d.fx = d.x;
  d.fy = d.y;

  try {
    // Instead of storing anything on the node or element, just apply visual changes
    const element = event.sourceEvent.currentTarget;
    if (element) {
      d3.select(element)
        .selectAll("circle")
        .attr("stroke-width", 4)
        .attr("stroke-dasharray", "5,2");
    }
  } catch (error) {
    console.error("Error in dragStarted:", error);
  }
};

/**
 * Drag event handler for node dragging.
 * @param event The D3 drag event
 * @param d The node being dragged
 * @param simulation The D3 force simulation
 */
const dragging = (
  event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>,
  d: D3Node,
  simulation: d3.Simulation<D3Node, D3Link>
) => {
  // Update the node position
  d.fx = event.x;
  d.fy = event.y;

  // Force simulation to recalculate positions immediately
  // This ensures arrows update correctly during dragging
  simulation.alpha(0.3).tick();

  // Request an animation frame for smoother updates
  requestAnimationFrame(() => {
    // Force an additional tick to ensure arrows update
    simulation.tick();
  });
};

/**
 * Drag end handler for node dragging.
 * @param event The D3 drag event
 * @param d The node that was dragged
 * @param simulation The D3 force simulation
 */
const dragEnded = (
  event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>,
  d: D3Node,
  simulation: d3.Simulation<D3Node, D3Link>
) => {
  if (!event.active) simulation.alphaTarget(0);

  // Reset node fixation
  d.fx = null;
  d.fy = null;

  try {
    // Simple reset of the node appearance without using stored values
    const element = event.sourceEvent.currentTarget;
    if (element) {
      d3.select(element)
        .selectAll("circle") // Use selectAll instead of select to avoid querySelector issues
        .attr("stroke-width", 2) // Just reset to default value
        .attr("stroke-dasharray", null);
    }
  } catch (error) {
    console.error("Error in dragEnded:", error);
  }

  // Run the simulation with a slightly higher alpha for better settling
  simulation.alpha(0.1);

  // Run multiple ticks to get a smoother settling
  for (let i = 0; i < 5; i++) {
    simulation.tick();
  }
};

// Explicitly export an empty object to make this file a module
// This fixes the TS1208 error: "cannot be compiled under '--isolatedModules' because it is considered a global script file"
export {};
