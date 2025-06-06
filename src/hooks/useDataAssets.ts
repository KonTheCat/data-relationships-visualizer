import { useState } from "react";
import { DataAsset } from "../models/DataAsset";
import { sampleData } from "../data/sampleData";

const useDataAssets = () => {
  const [dataAssets, setDataAssets] = useState<DataAsset[]>(sampleData);

  const addDataAsset = (newAsset: DataAsset) => {
    setDataAssets((prevAssets) => [...prevAssets, newAsset]);
  };

  const updateDataAsset = (updatedAsset: DataAsset) => {
    setDataAssets((prevAssets) =>
      prevAssets.map((asset) =>
        asset.name === updatedAsset.name ? updatedAsset : asset
      )
    );
  };

  return {
    dataAssets,
    addDataAsset,
    updateDataAsset,
  };
};

export { useDataAssets };
