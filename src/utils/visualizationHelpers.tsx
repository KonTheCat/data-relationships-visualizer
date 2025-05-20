import React from "react";
import { DataAsset } from "../models/DataAsset";
import * as d3 from "d3";

export const formatDataAsset = (dataAsset: {
  name: string;
  description: string;
  relationships?: DataAsset[];
}) => {
  return {
    title: dataAsset.name,
    content: dataAsset.description,
    relatedAssets: dataAsset.relationships || [],
  };
};

export const calculateRelationships = (dataAssets: DataAsset[]) => {
  const relationshipMap: Record<string, DataAsset[]> = {};

  dataAssets.forEach((asset) => {
    relationshipMap[asset.name] = asset.relationships || [];
  });

  return relationshipMap;
};

// This function is kept for backward compatibility, but isn't used for visualization anymore
export const visualizeRelationships = (
  dataAssets: DataAsset[]
): JSX.Element[] => {
  return dataAssets.map((asset) => (
    <div key={asset.name}>
      <strong>{asset.name}</strong> is related to:{" "}
      {asset.relationships && asset.relationships.length > 0
        ? asset.relationships.map((rel) => rel.name).join(", ")
        : "None"}
    </div>
  ));
};

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  description: string;
  radius: number;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | string | number;
  target: D3Node | string | number;
}

// New function to create a D3 force-directed graph
export const createD3ForceGraph = (
  svgElement: SVGSVGElement,
  dataAssets: DataAsset[],
  dimensions: { width: number; height: number }
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
        .distance(180) // Increased distance to reduce overlap
    )
    .force("charge", d3.forceManyBody().strength(-600)) // Increased repulsion force
    .force(
      "center",
      d3.forceCenter(dimensions.width / 2, dimensions.height / 2)
    )
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d) => (d as D3Node).radius + 25)
        .strength(0.8) // Increased padding and strength
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
          return (depth + 0.5) * step; // position nodes based on their depth
        })
        .strength(0.4) // Slightly stronger to maintain horizontal layout
    )
    // Add a vertical force to spread nodes within their depth level
    .force("y", d3.forceY(dimensions.height / 2).strength(0.1));

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
    .attr("fill", "none");

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
    .attr("stroke-width", 2);

  // Create better tooltips for nodes that include relationships
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

  // Add text labels to nodes - show the full name, no truncation
  const labels = nodeGroup
    .append("text")
    .text((d: D3Node) => d.name) // Use full name
    .attr("text-anchor", "middle")
    .attr("alignment-baseline", "middle")
    .attr("fill", "white")
    .attr("font-size", "12px")
    .style("pointer-events", "none");

  // Helper function to calculate path with proper arrow placement
  function calculatePath(source: any, target: any) {
    const sourceRadius = (source.radius || 30) + 8; // Extra 8px padding
    const targetRadius = (target.radius || 30) + 20; // Extra 20px padding for arrow placement

    // Calculate the angle between source and target
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);

    // Calculate where the line should start (outside source node)
    const startX = source.x + Math.cos(angle) * sourceRadius;
    const startY = source.y + Math.sin(angle) * sourceRadius;

    // Calculate where the line should end (outside target node)
    const endX = target.x - Math.cos(angle) * targetRadius;
    const endY = target.y - Math.sin(angle) * targetRadius;

    // Calculate where arrow should be placed (slightly before line end)
    const arrowX = endX; // Position arrow exactly at the end of the line
    const arrowY = endY; // Position arrow exactly at the end of the line

    return {
      path: `M${startX},${startY} L${endX},${endY}`,
      arrowPosition: { x: arrowX, y: arrowY, angle: angle },
    };
  }

  // Update positions on each tick of the simulation
  simulation.on("tick", () => {
    // Update links using paths without arrow markers
    link.attr("d", (d: any) => {
      return calculatePath(d.source, d.target).path;
    });

    // Remove any existing arrows before redrawing
    linkGroup.selectAll(".arrow").remove();

    // Create arrows at the correct positions with larger size
    links.forEach((d: any) => {
      const { arrowPosition } = calculatePath(d.source, d.target);

      // Create arrow element with larger size
      linkGroup
        .append("path")
        .attr("class", "arrow")
        .attr("d", "M-10,-8 L 0,0 L -10,8") // Larger arrow shape
        .attr("fill", "#3367d6")
        .attr("stroke", "#3367d6") // Add stroke to make it more visible
        .attr("stroke-width", 1)
        .attr(
          "transform",
          `translate(${arrowPosition.x},${arrowPosition.y}) ` +
            `rotate(${(arrowPosition.angle * 180) / Math.PI})`
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

  // Run simulation for a few iterations to establish initial positions
  // This helps prevent initial overlaps
  simulation.alpha(1).restart();
  for (let i = 0; i < 20; ++i) simulation.tick();

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

// Legacy function name to maintain backward compatibility
export const createForceGraphVisualization = createD3ForceGraph;
