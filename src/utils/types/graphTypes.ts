import * as d3 from "d3";
import { DataAsset } from "../../models/DataAsset";

/**
 * Extends D3's SimulationNodeDatum with our custom properties
 */
export interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  description: string;
  radius: number;
}

/**
 * Extends D3's SimulationLinkDatum with our custom properties
 */
export interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | string | number;
  target: D3Node | string | number;
}

/**
 * Defines the possible relationship types between nodes
 */
export type RelationshipType =
  | "selected"
  | "directDependency"
  | "directUser"
  | "indirectlyRelated"
  | "unrelated";

/**
 * Path calculation result including the SVG path string and arrow positioning data
 */
export interface PathCalculationResult {
  path: string;
  arrowPosition: {
    x: number;
    y: number;
    angle: number;
  };
}
