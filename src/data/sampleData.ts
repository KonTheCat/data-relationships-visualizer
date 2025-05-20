import { DataAsset } from "../models/DataAsset";

export const sampleData: DataAsset[] = [
  {
    name: "Data Asset 1",
    description: "Description for Data Asset 1",
    relationships: [],
  },
  {
    name: "Data Asset 2",
    description: "Description for Data Asset 2",
    relationships: [{ name: "Data Asset 1", description: "" }],
  },
  {
    name: "Data Asset 3",
    description: "Description for Data Asset 3",
    relationships: [
      { name: "Data Asset 1", description: "" },
      { name: "Data Asset 2", description: "" },
    ],
  },
  {
    name: "Data Asset 4",
    description: "Description for Data Asset 4",
    relationships: [],
  },
  {
    name: "Data Asset 5",
    description: "Description for Data Asset 5",
    relationships: [{ name: "Data Asset 3", description: "" }],
  },
];
