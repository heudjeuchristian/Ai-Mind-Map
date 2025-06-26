
export const D3_NODE_COLORS = {
  root: 'fill-indigo-600', // Tailwind class for fill
  level1: 'fill-teal-500',
  level2: 'fill-amber-500',
  default: 'fill-slate-600',
  highlight: 'fill-pink-500', // For hovered node
  collapsedIndicator: 'stroke-sky-400', // Stroke color for collapsed node indicator
};

export const D3_TEXT_COLORS = {
  root: 'fill-white',
  level1: 'fill-white',
  level2: 'fill-slate-900', // Dark text on light amber
  default: 'fill-white',
  highlight: 'fill-white',
};

export const D3_LINK_COLOR = 'stroke-slate-500'; // Tailwind class for stroke
export const D3_LINK_HIGHLIGHT_COLOR = 'stroke-pink-400'; // For hovered links

export const NODE_DIMENSIONS = {
  height: 50, // Fixed height for nodes
  paddingX: 15, // Horizontal padding inside the node rect
  paddingY: 10, // Vertical padding (though height is fixed, useful for text alignment)
  cornerRadius: 8,
  minWidth: 100, // Minimum width for a node
  highlightStrokeWidth: 3,
  collapsedIndicatorStrokeWidth: 2,
};

export const LAYOUT_CONSTANTS = {
  nodeSeparationX: 220, // Horizontal separation between nodes
  nodeSeparationY: 70,  // Vertical separation between sibling nodes
  margin: { top: 50, right: 250, bottom: 50, left: 100 }, // SVG margins
  transitionDuration: 350, // ms for D3 transitions
};

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

export const TOOLTIP_STYLE = {
  backgroundColor: 'bg-slate-800',
  textColor: 'text-slate-200',
  padding: 'p-2',
  borderRadius: 'rounded-md',
  shadow: 'shadow-lg',
  border: 'border border-slate-700',
};