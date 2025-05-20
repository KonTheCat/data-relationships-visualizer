import React, { useRef, useEffect, useState } from "react";
import { DataAsset } from "../models/DataAsset";
import { createD3ForceGraph } from "../utils/visualizationHelpers";

interface RelationshipVisualizerProps {
  dataAssets: DataAsset[];
}

const RelationshipVisualizer: React.FC<RelationshipVisualizerProps> = ({
  dataAssets,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (svgRef.current) {
      const updateDimensions = () => {
        const container = svgRef.current?.parentElement;
        if (container) {
          setDimensions({
            width: container.clientWidth,
            height: Math.max(400, container.clientWidth * 0.6),
          });
        }
      };

      updateDimensions();
      window.addEventListener("resize", updateDimensions);

      return () => {
        window.removeEventListener("resize", updateDimensions);
      };
    }
  }, []);

  useEffect(() => {
    if (svgRef.current && dataAssets.length > 0) {
      createD3ForceGraph(svgRef.current, dataAssets, dimensions);
    }
  }, [dataAssets, dimensions]);

  return (
    <div className="relationship-visualizer">
      <h2>Data Asset Relationships</h2>
      <p className="relationship-legend">
        <strong>Note:</strong> In the visualization,
        <span className="arrow-description">
          arrows point toward the data assets that use data from other assets
        </span>
      </p>
      <div className="visualization-container">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="data-relationship-graph"
        />
      </div>
    </div>
  );
};

export default RelationshipVisualizer;
