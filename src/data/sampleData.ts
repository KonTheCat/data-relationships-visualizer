import { DataAsset } from "../models/DataAsset";

export const sampleData: DataAsset[] = [
  {
    name: "Market Data Feed",
    description:
      "Real-time market data including prices, volumes, and trading activity from US and global exchanges",
    relationships: [],
  },
  {
    name: "Financial Statements Database",
    description:
      "Historical financial statements and fundamental data for companies in US and global markets",
    relationships: [],
  },
  {
    name: "Economic Indicators",
    description:
      "Macroeconomic indicators including GDP, inflation, employment, and interest rates across global markets",
    relationships: [],
  },
  {
    name: "Analyst Reports",
    description:
      "Research reports and earnings estimates from sell-side analysts covering US and global equities",
    relationships: [],
  },
  {
    name: "Company Analysis Model",
    description:
      "Proprietary model for analyzing company financials and valuation metrics",
    relationships: [
      { name: "Financial Statements Database", description: "" },
      { name: "Market Data Feed", description: "" },
      { name: "Analyst Reports", description: "" },
    ],
  },
  {
    name: "Market Risk Assessment",
    description:
      "Model for assessing market risk factors and their impact on portfolio holdings",
    relationships: [
      { name: "Market Data Feed", description: "" },
      { name: "Economic Indicators", description: "" },
    ],
  },
  {
    name: "Portfolio Construction Engine",
    description:
      "Sophisticated algorithm for constructing optimal portfolios based on risk/return parameters",
    relationships: [
      { name: "Company Analysis Model", description: "" },
      { name: "Market Risk Assessment", description: "" },
    ],
  },
  {
    name: "Trade Execution System",
    description:
      "System for executing trades across multiple venues to minimize market impact and transaction costs",
    relationships: [
      { name: "Portfolio Construction Engine", description: "" },
      { name: "Market Data Feed", description: "" },
    ],
  },
  {
    name: "Performance Attribution",
    description:
      "Analysis of portfolio performance, attributing returns to various factors and decisions",
    relationships: [
      { name: "Portfolio Construction Engine", description: "" },
      { name: "Trade Execution System", description: "" },
      { name: "Market Data Feed", description: "" },
    ],
  },
  {
    name: "Client Reporting Dashboard",
    description:
      "Interactive dashboard providing clients with portfolio performance, holdings, and risk metrics",
    relationships: [
      { name: "Performance Attribution", description: "" },
      { name: "Portfolio Construction Engine", description: "" },
    ],
  },
];
