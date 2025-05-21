import * as d3 from "d3";
import { DataAsset } from "../models/DataAsset";
import { D3Node, D3Link, RelationshipType } from "./types/graphTypes";

// Note: The main functionality of this file has been extracted to separate modules.
// This file is now only kept for backward compatibility.
// Please use the modular imports from the utils directory instead.

// The implementation below is no longer in use and will be removed in a future version.
// It's currently here only for reference and backward compatibility.

// Helper function to identify relationship types with the selected node
const getNodeRelationshipType = (
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

// Modified function with filtering capability for both node selection and search
const createD3ForceGraph = (
  svgElement: SVGSVGElement,
  dataAssets: DataAsset[],
  dimensions: { width: number; height: number },
  selectedNodeId?: string | null,
  searchMatches?: string[] | null
) => {
  // Clear previous visualization
  d3.select(svgElement).selectAll("*").remove();

  // Calculate radius based on name length to ensure text fits
  const calculateRadius = (name: string): number => {
    // Base radius of 30px, but increase for longer names
    // Each character needs ~4px of radius
    return Math.max(30, name.length * 4);
  };

  // Create nodes and links data structure for D3
  const nodes: D3Node[] = dataAssets.map((asset) => ({
    id: asset.name,
    name: asset.name,
    description: asset.description,
    radius: calculateRadius(asset.name),
  }));

  const links: D3Link[] = [];

  // Create links based on relationships
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

  // Calculate node depth (horizontal position) based on relationships
  const calculateNodeDepths = () => {
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

  const nodeDepths = calculateNodeDepths();

  // Get maximum depth value without using spread operator
  const getMaxDepth = (): number => {
    let maxDepth = 0;
    nodeDepths.forEach((depth) => {
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    });
    return maxDepth;
  };

  const maxDepth = getMaxDepth();

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
        .distance(200) // Further increased distance to reduce overlap
    )
    .force("charge", d3.forceManyBody().strength(-800)) // Further increased repulsion force
    .force(
      "center",
      d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
    )
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d) => (d as D3Node).radius + 35) // Further increased padding to prevent overlap
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
  // This creates repulsion between nodes and links to avoid line overlaps
  simulation.force("link-node-repulsion", (alpha) => {
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
        const distSq =
          (x0 - projX) * (x0 - projX) + (y0 - projY) * (y0 - projY);

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
  });

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
        .on("start", dragStarted)
        .on("drag", dragging)
        .on("end", dragEnded)
    );

  // Add circles for nodes
  const circles = nodeGroup
    .append("circle")
    .attr("r", (d: D3Node) => d.radius) // Use dynamic radius
    .attr("fill", "#4285f4")
    .attr("stroke", "#3367d6")
    .attr("stroke-width", 2)
    .style("cursor", "pointer");

  // Create better tooltips for nodes that include relationships
  circles.append("title").text((d: D3Node) => {
    const asset = dataAssets.find((a) => a.name === d.name);
    let tooltip = `${d.name}\n${d.description}`;

    // Find assets that use this asset as a data source
    const usedBy = dataAssets.filter((a) =>
      a.relationships?.some((rel: DataAsset) => rel.name === d.name)
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
      asset.relationships.forEach((rel: DataAsset) => {
        tooltip += `\n- ${rel.name}`;
      });
    }

    return tooltip;
  });

  // Add text labels to nodes - show the full name, no truncation
  const labels = nodeGroup
    .append("text")
    .text((d: D3Node) => d.name) // Use full name
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("fill", "white")
    .attr("font-size", "12px")
    .style("pointer-events", "none");

  // Find all connected nodes (direct and indirect relationships) from a given node
  const findConnectedNodes = (nodeId: string): Set<string> => {
    const connected = new Set<string>();
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

    return connected;
  };

  // Find all connected nodes from a single node (uses the multiple node function)
  const findConnectedNodesFromMultiple = (nodeIds: string[]): Set<string> => {
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
              : (link[
                  direction === "outgoing" ? "target" : "source"
                ] as string);

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

  // Apply filtering if a node is selected
  if (selectedNodeId) {
    const connectedNodes = findConnectedNodes(selectedNodeId);

    // Get direct dependencies (assets that the selected node uses)
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

    // Get direct users (assets that use the selected node)
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
  } else if (searchMatches && searchMatches.length > 0) {
    // If search is active, show matching nodes and their connections
    const connectedNodes = findConnectedNodesFromMultiple(searchMatches);

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

  // Helper function to calculate path with proper arrow placement
  function calculatePath(source: any, target: any) {
    const sourceRadius = (source.radius || 30) + 8; // Extra 8px padding
    const targetRadius = (target.radius || 30) + 20; // Extra 20px padding for arrow placement

    // Calculate the angle between source and target
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);

    // Calculate the distance between the nodes
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate where the line should start (outside source node)
    const startX = source.x + Math.cos(angle) * sourceRadius;
    const startY = source.y + Math.sin(angle) * sourceRadius;

    // Calculate where the line should end (outside target node)
    const endX = target.x - Math.cos(angle) * targetRadius;
    const endY = target.y - Math.sin(angle) * targetRadius;

    // Determine if we should use curved paths based on node positioning
    // More selective criteria for curved paths
    const horizontallyClose = Math.abs(dx) < 100 && Math.abs(dx) > 20;
    const sameVerticalLevel = Math.abs(dy) < 50;
    const shortDistance = distance < 120;

    // Use curved paths primarily for nodes at similar vertical positions
    // but not for nodes that are directly above/below each other or far apart
    const shouldCurve =
      (horizontallyClose && sameVerticalLevel) ||
      (Math.abs(dx) < Math.abs(dy) * 0.5 && !sameVerticalLevel);

    let path;
    if (shouldCurve) {
      // Calculate a curved path with control points perpendicular to the line
      const curveMagnitude = Math.min(80, distance * 0.4); // Adjust curve based on distance

      // Calculate perpendicular direction
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);

      // Create a curved path using quadratic curve
      path = `M${startX},${startY} Q${
        (startX + endX) / 2 + perpX * curveMagnitude
      },${(startY + endY) / 2 + perpY * curveMagnitude} ${endX},${endY}`;

      // Recalculate the arrow angle based on the curve's ending tangent
      const curveEndAngle = Math.atan2(
        endY - ((startY + endY) / 2 + perpY * curveMagnitude),
        endX - ((startX + endX) / 2 + perpX * curveMagnitude)
      );

      return {
        path: path,
        arrowPosition: { x: endX, y: endY, angle: curveEndAngle },
      };
    } else {
      // Use straight line for nodes that are vertically distant
      return {
        path: `M${startX},${startY} L${endX},${endY}`,
        arrowPosition: { x: endX, y: endY, angle: angle },
      };
    }
  } // Update positions on each tick of the simulation
  simulation.on("tick", () => {
    // Remove any existing arrows before redrawing to prevent stale arrows
    linkGroup.selectAll(".arrow").remove();

    // Update each link path and its corresponding arrow together to ensure they're synchronized
    link.each(function (d: any) {
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

      // Create arrow element with improved styling and positioning
      const arrow = linkGroup
        .append("path")
        .attr("class", "arrow")
        .attr("d", "M-12,-8 L 0,0 L -12,8 L -4,0 Z") // More robust arrow shape with closed path
        .attr("fill", arrowColor)
        .attr("stroke", arrowColor) // Add stroke to make it more visible
        .attr("stroke-width", 1)
        .attr("stroke-linejoin", "round") // Rounded corners for better appearance
        .attr(
          "transform",
          `translate(${pathData.arrowPosition.x},${pathData.arrowPosition.y}) ` +
            `rotate(${(pathData.arrowPosition.angle * 180) / Math.PI})`
        );
    });

    // Update node positions
    nodeGroup.attr("transform", (d: any) => {
      // Keep nodes within the SVG boundaries
      d.x = Math.max(d.radius, Math.min(dimensions.width - d.radius, d.x));
      d.y = Math.max(d.radius, Math.min(dimensions.height - d.radius, d.y));
      return `translate(${d.x}, ${d.y})`;
    });
  });

  // Run simulation for more iterations to establish better initial positions
  // This helps prevent initial overlaps
  simulation.alpha(1).restart();
  for (let i = 0; i < 100; ++i) simulation.tick(); // Increased iterations for better layout

  // Drag functions
  function dragStarted(
    event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>,
    d: D3Node
  ) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragging(
    event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>,
    d: D3Node
  ) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(
    event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>,
    d: D3Node
  ) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
};

// The functionality exported from this file is now available through the utils index
// No exports needed from this file anymore, as it's just a legacy reference
