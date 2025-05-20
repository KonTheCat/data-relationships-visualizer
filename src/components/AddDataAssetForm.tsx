import React, { useState } from "react";
import { DataAsset } from "../models/DataAsset";

interface AddDataAssetFormProps {
  onAddDataAsset: (dataAsset: DataAsset) => void;
  existingAssets: DataAsset[];
}

const AddDataAssetForm: React.FC<AddDataAssetFormProps> = ({
  onAddDataAsset,
  existingAssets,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRelationships, setSelectedRelationships] = useState<string[]>(
    []
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const newDataAsset: DataAsset = {
      name,
      description,
      relationships: selectedRelationships.map((relName) => {
        const asset = existingAssets.find((a) => a.name === relName);
        return { name: relName, description: asset?.description || "" };
      }),
    };
    onAddDataAsset(newDataAsset);
    setName("");
    setDescription("");
    setSelectedRelationships([]);
  };

  const handleRelationshipChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const options = Array.from(e.target.selectedOptions);
    setSelectedRelationships(options.map((option) => option.value));
  };

  return (
    <div className="add-data-asset-form">
      <h2>Add New Data Asset</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="asset-name">Name:</label>
          <input
            id="asset-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label htmlFor="asset-description">Description:</label>
          <textarea
            id="asset-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="form-control"
            rows={3}
          />
        </div>
        <div className="form-group">
          <label htmlFor="asset-relationships">
            Used data from these assets:
          </label>
          <select
            id="asset-relationships"
            multiple
            value={selectedRelationships}
            onChange={handleRelationshipChange}
            className="form-control"
            size={Math.min(5, existingAssets.length)}
          >
            {existingAssets.map((asset) => (
              <option key={asset.name} value={asset.name}>
                {asset.name}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Hold Ctrl (or Cmd) to select multiple assets
          </small>
        </div>
        <button type="submit" className="button">
          Add Data Asset
        </button>
      </form>
    </div>
  );
};

export default AddDataAssetForm;
