import React, { useState } from "react";
import Header from "./components/Header";
import DataAssetList from "./components/DataAssetList";
import AddDataAssetForm from "./components/AddDataAssetForm";
import RelationshipVisualizer from "./components/RelationshipVisualizer";
import { DataAsset } from "./models/DataAsset";
import { sampleData } from "./data/sampleData";
import { useDataAssets } from "./hooks/useDataAssets";

const App: React.FC = () => {
  const { dataAssets, addDataAsset } = useDataAssets();
  const [selectedAsset, setSelectedAsset] = useState<DataAsset | null>(null);

  const handleSelectAsset = (asset: DataAsset) => {
    setSelectedAsset(asset);
    console.log("Selected asset:", asset);
  };

  return (
    <div className="container">
      <Header />
      <div className="main-content">
        <AddDataAssetForm
          onAddDataAsset={addDataAsset}
          existingAssets={dataAssets}
        />
        <DataAssetList
          dataAssets={dataAssets}
          onSelectAsset={handleSelectAsset}
          selectedAsset={selectedAsset}
        />
        <RelationshipVisualizer dataAssets={dataAssets} />
      </div>
    </div>
  );
};

export default App;
