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

  const sourceRadius = (source.radius || 30) + 5; // Less padding for source to prevent gap
  const targetRadius = (target.radius || 30) + 3; // Adjusted padding for precise arrow alignment
  
  // Calculate the angle between source and target
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const angle = Math.atan2(dy, dx);
  
  // Calculate the distance between the nodes
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Calculate where the line should start (outside source node)
  const startX = source.x + Math.cos(angle) * sourceRadius;
  const startY = source.y + Math.sin(angle) * sourceRadius;
  
  // Calculate where the line should end (exactly at target node edge)
  // The arrow marker will be positioned at this point and extend outward
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
