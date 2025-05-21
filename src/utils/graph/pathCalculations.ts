import { PathCalculationResult } from "../types/graphTypes";

/**
 * Calculates the path and arrow positioning for a link between two nodes.
 * @param source The source node
 * @param target The target node
 * @returns The path string and arrow position information
 */
export const calculatePath = (
  source: any,
  target: any
): PathCalculationResult => {
  if (!source || !target || source.x === undefined || target.x === undefined) {
    // Return a default path if nodes aren't properly initialized
    return {
      path: "M0,0 L0,0",
      arrowPosition: { x: 0, y: 0, angle: 0 },
    };
  }

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

  // Use curved paths primarily for nodes at similar vertical positions
  // but not for nodes that are directly above/below each other or far apart
  const shouldCurve =
    (horizontallyClose && sameVerticalLevel) ||
    (Math.abs(dx) < Math.abs(dy) * 0.5 && !sameVerticalLevel);

  if (shouldCurve) {
    // Calculate a curved path with control points perpendicular to the line
    const curveMagnitude = Math.min(80, distance * 0.4); // Adjust curve based on distance

    // Calculate perpendicular direction
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);

    // Create a curved path using quadratic curve
    const path = `M${startX},${startY} Q${
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
};

/**
 * Creates an arrow element for a link to represent the direction.
 * @param linkGroup The D3 selection for the link group
 * @param pathData The path calculation data
 * @param arrowColor The color of the arrow
 * @param linkId Optional unique identifier for the link to create stable arrow elements
 * @returns The created arrow element
 */
export const createArrowElement = (
  linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
  pathData: PathCalculationResult,
  arrowColor: string,
  linkId?: string
) => {
  // Create a unique class for this arrow if linkId is provided
  const arrowClass = linkId ? `arrow-${linkId}` : "arrow";

  try {
    // Validate position data to avoid NaN errors
    if (
      isNaN(pathData.arrowPosition.x) ||
      isNaN(pathData.arrowPosition.y) ||
      isNaN(pathData.arrowPosition.angle)
    ) {
      console.warn("Invalid arrow position data", pathData);
      return linkGroup; // Return without creating arrow
    }

    // First remove any existing arrow with this ID to prevent duplicates
    linkGroup.selectAll(`.${arrowClass}`).remove();

    // Create the new arrow with more robust attributes
    return linkGroup
      .append("path")
      .attr("class", arrowClass)
      .attr("d", "M-10,-6 L 0,0 L -10,6 L -2,0 Z") // Improved arrow shape
      .attr("fill", arrowColor)
      .attr("stroke", arrowColor)
      .attr("stroke-width", 1.5) // Slightly thicker stroke
      .attr("stroke-linejoin", "round")
      .attr(
        "transform",
        `translate(${pathData.arrowPosition.x},${pathData.arrowPosition.y}) ` +
          `rotate(${(pathData.arrowPosition.angle * 180) / Math.PI})`
      )
      .style("pointer-events", "none"); // Make arrows non-interactive to avoid hover issues
  } catch (error) {
    console.error("Error creating arrow element:", error);
    // Return a dummy selection to avoid errors downstream
    return linkGroup;
  }
};
