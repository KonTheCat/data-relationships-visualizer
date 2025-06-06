import React from "react";
import { DataAsset } from "../models/DataAsset";

interface DataAssetListProps {
  dataAssets: DataAsset[];
  onSelectAsset: (asset: DataAsset) => void;
  onEditAsset: (asset: DataAsset) => void;
  selectedAsset?: DataAsset | null;
}

const DataAssetList: React.FC<DataAssetListProps> = ({
  dataAssets,
  onSelectAsset,
  onEditAsset,
  selectedAsset,
}) => {
  // Prevent event propagation when clicking the edit button
  // so that the asset doesn't get selected at the same time
  const handleEditClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    asset: DataAsset
  ) => {
    e.stopPropagation();
    onEditAsset(asset);
  };

  return (
    <div className="data-asset-list-container">
      <h2>Data Assets</h2>
      <ul className="data-asset-list">
        {dataAssets.map((asset) => (
          <li
            key={asset.name}
            className={`data-asset-item ${
              selectedAsset?.name === asset.name ? "selected" : ""
            }`}
            onClick={() => onSelectAsset(asset)}
          >
            <div className="asset-header">
              <strong>{asset.name}</strong>
              <button
                className="edit-button"
                onClick={(e) => handleEditClick(e, asset)}
              >
                Edit
              </button>
            </div>
            <div className="asset-description">{asset.description}</div>
            {asset.relationships && asset.relationships.length > 0 && (
              <div className="asset-relationships">
                <strong>Uses data from:</strong>
                <ul>
                  {asset.relationships.map((relationship, idx) => (
                    <li key={idx}>{relationship.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DataAssetList;
