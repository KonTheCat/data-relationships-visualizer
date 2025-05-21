import React, { useState, useEffect } from "react";
import { DataAsset } from "../models/DataAsset";

interface EditDataAssetFormProps {
  asset: DataAsset | null;
  onUpdateDataAsset: (dataAsset: DataAsset) => void;
  existingAssets: DataAsset[];
  onCancel: () => void;
}

const EditDataAssetForm: React.FC<EditDataAssetFormProps> = ({
  asset,
  onUpdateDataAsset,
  existingAssets,
  onCancel,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRelationships, setSelectedRelationships] = useState<string[]>(
    []
  );

  // Update form when the asset changes
  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setDescription(asset.description);
      setSelectedRelationships(
        asset.relationships?.map((rel) => rel.name) || []
      );
    }
  }, [asset]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!asset) return;

    const updatedDataAsset: DataAsset = {
      name,
      description,
      relationships: selectedRelationships.map((relName) => {
        const relatedAsset = existingAssets.find((a) => a.name === relName);
        return { name: relName, description: relatedAsset?.description || "" };
      }),
    };

    onUpdateDataAsset(updatedDataAsset);
    onCancel(); // Close the edit form after updating
  };

  const handleRelationshipChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const options = Array.from(e.target.selectedOptions);
    setSelectedRelationships(options.map((option) => option.value));
  };

  if (!asset) return null;

  // Filter out the current asset from possible relationships
  const availableRelationships = existingAssets.filter(
    (a) => a.name !== asset.name
  );

  return (
    <div className="form-container edit-form">
      <h2>Edit Data Asset</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-control"
            disabled // Prevent changing the asset name as it's used as an identifier
            required
          />
        </div>
        <div className="form-group">
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-control"
            rows={4}
            required
          />
        </div>
        <div className="form-group">
          <label>Uses Data From:</label>
          <select
            multiple
            value={selectedRelationships}
            onChange={handleRelationshipChange}
            className="form-control"
            size={Math.min(5, availableRelationships.length)}
          >
            {availableRelationships.map((asset) => (
              <option key={asset.name} value={asset.name}>
                {asset.name}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Hold Ctrl (or Cmd) to select multiple assets
          </small>
        </div>
        <div className="button-group">
          <button type="submit" className="button update-button">
            Update Data Asset
          </button>
          <button
            type="button"
            className="button cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditDataAssetForm;
