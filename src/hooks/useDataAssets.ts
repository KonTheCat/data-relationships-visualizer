import { useState } from "react";
import { DataAsset } from "../models/DataAsset";
import { sampleData } from "../data/sampleData";

const useDataAssets = () => {
  const [dataAssets, setDataAssets] = useState<DataAsset[]>(sampleData);

  const addDataAsset = (newAsset: DataAsset) => {
    setDataAssets((prevAssets) => [...prevAssets, newAsset]);
  };

  return {
    dataAssets,
    addDataAsset,
  };
};

export { useDataAssets };
