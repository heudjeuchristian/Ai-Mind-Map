
import * as d3 from 'd3'; // Import d3 to make its types available

export interface MindMapNodeData {
  id?: string; // Optional unique ID for nodes
  name: string;
  children?: MindMapNodeData[];
  // _children?: MindMapNodeData[]; // Removed: D3 nodes will manage their own collapsed state
  // Optional: for styling or other metadata from Gemini if needed
  color?: string; 
  value?: number; // For node sizing if we go that route
  isCollapsed?: boolean; // To track collapsed state explicitly if needed (e.g., for initial state from data)
}

// Extend d3.HierarchyPointNode to include x0 and y0 for transitions, and _children for D3's expand/collapse
export interface ExtendedHierarchyPointNode extends d3.HierarchyPointNode<MindMapNodeData> {
  x0?: number;
  y0?: number;
  _children?: ExtendedHierarchyPointNode[]; // Used by D3 to store collapsed children (these are D3 nodes)
}

// This is what D3's hierarchy will add to our data.
// D3HierarchyNode is an alias for our extended type.
// d3.HierarchyPointNode itself includes properties like x, y, data, depth, height, parent, children,
// and methods like .each(), .links(), .descendants().
export type D3HierarchyNode = ExtendedHierarchyPointNode;
