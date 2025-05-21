import React, { useState } from "react";
import Header from "./components/Header";
import DataAssetList from "./components/DataAssetList";
import AddDataAssetForm from "./components/AddDataAssetForm";
import EditDataAssetForm from "./components/EditDataAssetForm";
import RelationshipVisualizer from "./components/RelationshipVisualizer";
import { DataAsset } from "./models/DataAsset";
import { useDataAssets } from "./hooks/useDataAssets";

const App: React.FC = () => {
  const { dataAssets, addDataAsset, updateDataAsset } = useDataAssets();
  const [selectedAsset, setSelectedAsset] = useState<DataAsset | null>(null);
  const [assetToEdit, setAssetToEdit] = useState<DataAsset | null>(null);

  const handleSelectAsset = (asset: DataAsset) => {
    setSelectedAsset(asset);
    console.log("Selected asset:", asset);
  };

  const handleEditAsset = (asset: DataAsset) => {
    setAssetToEdit(asset);
  };

  const handleCancelEdit = () => {
    setAssetToEdit(null);
  };

  return (
    <div className="container">
      <Header />
      <div className="main-content">
        {assetToEdit ? (
          <EditDataAssetForm
            asset={assetToEdit}
            onUpdateDataAsset={updateDataAsset}
            existingAssets={dataAssets}
            onCancel={handleCancelEdit}
          />
        ) : (
          <AddDataAssetForm
            onAddDataAsset={addDataAsset}
            existingAssets={dataAssets}
          />
        )}
        <DataAssetList
          dataAssets={dataAssets}
          onSelectAsset={handleSelectAsset}
          onEditAsset={handleEditAsset}
          selectedAsset={selectedAsset}
        />
        <RelationshipVisualizer dataAssets={dataAssets} />
      </div>
    </div>
  );
};

export default App;
