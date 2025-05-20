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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [matchingNodes, setMatchingNodes] = useState<string[]>([]);

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

  // Effect to find matching nodes when search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setMatchingNodes([]);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const matches = dataAssets
      .filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchTermLower) ||
          asset.description.toLowerCase().includes(searchTermLower)
      )
      .map((asset) => asset.name);

    setMatchingNodes(matches);
  }, [searchTerm, dataAssets]);

  useEffect(() => {
    if (svgRef.current && dataAssets.length > 0) {
      // Pass both the selected node ID and search matches to the visualization function
      createD3ForceGraph(
        svgRef.current,
        dataAssets,
        dimensions,
        selectedNodeId,
        searchTerm ? matchingNodes : null
      );

      // Add event listeners for node selection and reset
      const handleNodeClick = (event: CustomEvent) => {
        const nodeId = event.detail.nodeId;
        setSelectedNodeId((current) => (current === nodeId ? null : nodeId));
        // Clear search when selecting a node
        setSearchTerm("");
      };

      const handleResetFiltering = () => {
        setSelectedNodeId(null);
        setSearchTerm("");
      };

      const svgElement = svgRef.current;
      svgElement.addEventListener(
        "nodeClick",
        handleNodeClick as EventListener
      );
      svgElement.addEventListener("resetFiltering", handleResetFiltering);

      return () => {
        svgElement.removeEventListener(
          "nodeClick",
          handleNodeClick as EventListener
        );
        svgElement.removeEventListener("resetFiltering", handleResetFiltering);
      };
    }
  }, [dataAssets, dimensions, selectedNodeId, searchTerm, matchingNodes]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Clear selected node when searching
    if (e.target.value.trim() !== "") {
      setSelectedNodeId(null);
    }
  };

  const resetSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="relationship-visualizer">
      <h2>Data Asset Relationships</h2>
      <div className="search-container">
        <input
          type="text"
          placeholder="Search data assets..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        {searchTerm && (
          <button className="reset-button search-reset" onClick={resetSearch}>
            Clear
          </button>
        )}
      </div>
      <p className="relationship-legend">
        <strong>Note:</strong> In the visualization,
        <span className="arrow-description">
          arrows point toward the data assets that use data from other assets
        </span>
      </p>
      {selectedNodeId && (
        <div className="filtering-info">
          <p>
            Showing <strong>{selectedNodeId}</strong> and related assets.{" "}
            <button
              className="reset-button"
              onClick={() => setSelectedNodeId(null)}
            >
              Reset view
            </button>
          </p>
        </div>
      )}
      {searchTerm && matchingNodes.length > 0 && (
        <div className="filtering-info search-info">
          <p>
            Showing <strong>{matchingNodes.length}</strong> matching assets and
            their relationships.{" "}
            <button className="reset-button" onClick={resetSearch}>
              Reset search
            </button>
          </p>
        </div>
      )}
      {searchTerm && matchingNodes.length === 0 && (
        <div className="filtering-info search-info no-results">
          <p>
            No matching assets found for "<strong>{searchTerm}</strong>".{" "}
            <button className="reset-button" onClick={resetSearch}>
              Reset search
            </button>
          </p>
        </div>
      )}
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
