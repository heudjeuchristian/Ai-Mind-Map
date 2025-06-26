
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3';
import { MindMapNodeData, D3HierarchyNode } from '../types';
import { 
    D3_NODE_COLORS, D3_TEXT_COLORS, D3_LINK_COLOR, D3_LINK_HIGHLIGHT_COLOR,
    NODE_DIMENSIONS, LAYOUT_CONSTANTS, TOOLTIP_STYLE 
} from '../constants';

interface MindMapDisplayProps {
  data: MindMapNodeData;
  width?: number;
  height?: number;
}

export interface MindMapDisplayHandle {
  exportSVG: () => void;
}

// Helper to generate unique IDs if not provided
let nodeIdCounter = 0;
const assignIds = (node: MindMapNodeData) => {
  if (!node.id) {
    node.id = `node-${nodeIdCounter++}`;
  }
  if (node.children) {
    node.children.forEach(assignIds);
  }
  // Removed iteration over node._children as it's no longer on MindMapNodeData
};

const measureText = (text: string, fontSize = "14px", fontFamily = "sans-serif"): number => {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) return text.length * 8; // Fallback
    context.font = `${fontSize} ${fontFamily}`;
    return context.measureText(text).width;
};

export const MindMapDisplay = forwardRef<MindMapDisplayHandle, MindMapDisplayProps>(({ data, width = 1200, height = 800 }, ref) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null); // To store the main <g> element for zoom/pan
  const currentRootRef = useRef<D3HierarchyNode | null>(null); // To store the current root for updates

  // Expose exportSVG function via ref
  useImperativeHandle(ref, () => ({
    exportSVG: () => {
      if (!svgRef.current) return;
      const svgData = new XMLSerializer().serializeToString(svgRef.current);
      const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${data.name || 'mindmap'}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }));

  useEffect(() => {
    if (!data || !svgRef.current) return;

    nodeIdCounter = 0; // Reset counter for each new map
    assignIds(data); // Ensure all nodes have IDs

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous rendering

    // Tooltip setup
    if (!tooltipRef.current) {
        tooltipRef.current = d3.select("body").append("div")
            .attr("class", `absolute ${TOOLTIP_STYLE.backgroundColor} ${TOOLTIP_STYLE.textColor} ${TOOLTIP_STYLE.padding} ${TOOLTIP_STYLE.borderRadius} ${TOOLTIP_STYLE.shadow} ${TOOLTIP_STYLE.border} pointer-events-none opacity-0 transition-opacity duration-200 z-50`)
            .style("max-width", "250px")
            .node() as HTMLDivElement;
    }
    const tooltip = d3.select(tooltipRef.current);

    const rootNode = d3.hierarchy(data, d => d.children) as D3HierarchyNode;
    currentRootRef.current = rootNode; // Store the initial root

    // Collapse all nodes beyond depth 1 initially, except for the root's direct children
    rootNode.descendants().forEach(d => {
        if (d.depth > 1 && d.children) {
            d._children = d.children; // Store D3 child nodes in _children property of the D3 node
            d.children = undefined;   // Remove from D3 node's children to collapse
        }
    });
    
    const g = svg.append("g");
    gRef.current = g.node() as SVGGElement;

    // Define and initialize zoom behavior EARLY
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 3]) 
        .on("zoom", (event) => {
            if (gRef.current) {
                d3.select(gRef.current).attr("transform", event.transform.toString());
            }
        });
    svg.call(zoomBehavior as any);


    const treeLayout = d3.tree<MindMapNodeData>()
        .nodeSize([LAYOUT_CONSTANTS.nodeSeparationY, LAYOUT_CONSTANTS.nodeSeparationX])
        .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.5));

    function getNodeWidth(d: D3HierarchyNode) {
        return Math.max(NODE_DIMENSIONS.minWidth, measureText(d.data.name, '14px') + NODE_DIMENSIONS.paddingX * 2);
    }

    function update(source: D3HierarchyNode) {
        if (!currentRootRef.current || !gRef.current) return;

        const treeData = treeLayout(currentRootRef.current);
        const nodes = treeData.descendants() as D3HierarchyNode[];
        const links = treeData.links() as d3.HierarchyPointLink<MindMapNodeData>[];

        const gElement = d3.select(gRef.current);

        const node = gElement.selectAll<SVGGElement, D3HierarchyNode>("g.node")
            .data(nodes, d => d.data.id!); 

        const nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", `translate(${source.y0 || source.y},${source.x0 || source.x})`)
            .on("click", (event, d) => toggleChildren(d))
            .on("mouseover", handleMouseOver)
            .on("mousemove", handleMouseMove)
            .on("mouseout", handleMouseOut)
            .style("cursor", d => (d.children || d._children) ? "pointer" : "default"); // Updated condition

        nodeEnter.append("rect")
            .attr("width", getNodeWidth)
            .attr("height", NODE_DIMENSIONS.height)
            .attr("rx", NODE_DIMENSIONS.cornerRadius)
            .attr("ry", NODE_DIMENSIONS.cornerRadius)
            .attr("class", d => getNodeFillClass(d))
            .attr("stroke", "rgba(255,255,255,0.1)")
            .attr("stroke-width", 1);
        
        nodeEnter.filter(d => !!d._children || !!d.children) // Updated condition: Show indicator if can be toggled
            .append("circle")
            .attr("class", `collapsed-indicator ${D3_NODE_COLORS.collapsedIndicator}`)
            .attr("r", 5)
            .attr("cx", d => getNodeWidth(d) - 10)
            .attr("cy", NODE_DIMENSIONS.height / 2)
            .attr("fill", "none") 
            .attr("stroke-width", NODE_DIMENSIONS.collapsedIndicatorStrokeWidth);


        nodeEnter.append("text")
            .attr("dy", "0.31em")
            .attr("x", d => getNodeWidth(d) / 2)
            .attr("y", NODE_DIMENSIONS.height / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", d => d.depth === 0 ? "bold" : "normal")
            .attr("class", d => getNodeTextClass(d))
            .text(d => d.data.name);

        const nodeUpdate = nodeEnter.merge(node)
            .transition()
            .duration(LAYOUT_CONSTANTS.transitionDuration)
            .attr("transform", d => `translate(${d.y},${d.x - NODE_DIMENSIONS.height / 2})`);

        nodeUpdate.select<SVGRectElement>("rect")
            .attr("width", getNodeWidth)
            .attr("class", d => getNodeFillClass(d)); 

        nodeUpdate.select<SVGCircleElement>(".collapsed-indicator")
            .attr("cx", d => getNodeWidth(d) -10)
            .attr("class", d => `collapsed-indicator ${D3_NODE_COLORS.collapsedIndicator}`) // Ensure class is maintained for selection
            .style("display", d => d._children || d.children ? "block" : "none"); // Updated condition


        nodeUpdate.select<SVGTextElement>("text")
            .attr("x", d => getNodeWidth(d) / 2);

        node.exit().transition()
            .duration(LAYOUT_CONSTANTS.transitionDuration)
            .attr("transform", `translate(${source.y},${source.x})`)
            .style("opacity", 0)
            .remove();

        const link = gElement.selectAll<SVGPathElement, d3.HierarchyPointLink<MindMapNodeData>>("path.link")
            .data(links, d => d.target.data.id!);

        const linkEnter = link.enter().insert("path", "g") 
            .attr("class", `link ${D3_LINK_COLOR}`)
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .attr("d", d3.linkHorizontal<any, D3HierarchyNode>() 
                .x(n => n.y + getNodeWidth(n)/2)
                .y(n => n.x) ({
                    source: { ...source, x0: source.x0, y0: source.y0 } as any, 
                    target: { ...source, x0: source.x0, y0: source.y0 } as any 
                })
            );


        linkEnter.merge(link)
            .transition()
            .duration(LAYOUT_CONSTANTS.transitionDuration)
            .attr("d", d3.linkHorizontal<d3.HierarchyPointLink<MindMapNodeData>, D3HierarchyNode>()
                .x(n => {
                    const halfNodeWidth = getNodeWidth(n) / 2;
                    // If node is expanded or has collapsable children, link to its center.
                    // Otherwise (if it's a leaf for drawing purposes), adjust link endpoint.
                    const adjustment = (n.children || n._children) 
                                       ? 0 
                                       : halfNodeWidth - NODE_DIMENSIONS.paddingX + 5;
                    return n.y + halfNodeWidth - adjustment;
                })
                .y(n => n.x)
            );

        link.exit().transition()
            .duration(LAYOUT_CONSTANTS.transitionDuration)
            .attr("d", d3.linkHorizontal<any, D3HierarchyNode>()
                .x(n => n.y + getNodeWidth(n)/2)
                .y(n => n.x) ({
                    source: { ...source, x0: source.x0, y0: source.y0 } as any,
                    target: { ...source, x0: source.x0, y0: source.y0 } as any
                })
            )
            .remove();

        nodes.forEach((d: D3HierarchyNode) => { 
            d.x0 = d.x;
            d.y0 = d.y;
        });
        
        if (nodes.length > 0) {
            const currentGElement = gRef.current as SVGGElement;
            const bounds = currentGElement.getBBox();
            const parentWidth = (svgRef.current?.parentElement?.clientWidth || width);
            const parentHeight = (svgRef.current?.parentElement?.clientHeight || height);

            const fullWidth = bounds.width + LAYOUT_CONSTANTS.margin.left + LAYOUT_CONSTANTS.margin.right;
            const fullHeight = bounds.height + LAYOUT_CONSTANTS.margin.top + LAYOUT_CONSTANTS.margin.bottom;
            
            const effectiveWidth = parentWidth - LAYOUT_CONSTANTS.margin.left - LAYOUT_CONSTANTS.margin.right;
            const effectiveHeight = parentHeight - LAYOUT_CONSTANTS.margin.top - LAYOUT_CONSTANTS.margin.bottom;

            let scale = 1;
            if (bounds.width > 0 && bounds.height > 0) { 
              const scaleX = effectiveWidth / bounds.width;
              const scaleY = effectiveHeight / bounds.height;
              scale = Math.min(scaleX, scaleY, 1.5); 
            } else if (bounds.width > 0) {
              scale = Math.min(effectiveWidth / bounds.width, 1.5);
            } else if (bounds.height > 0) {
              scale = Math.min(effectiveHeight / bounds.height, 1.5);
            }


            const translateX = (parentWidth - bounds.width * scale) / 2 - bounds.x * scale;
            const translateY = (parentHeight - bounds.height * scale) / 2 - bounds.y * scale;
            
            // Now zoomBehavior is defined and initialized on svg, so this call is safe.
            svg.transition().duration(LAYOUT_CONSTANTS.transitionDuration)
              .call(zoomBehavior.transform as any, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
        }

    }
    
    rootNode.x0 = height / 2;
    rootNode.y0 = 0;
    update(rootNode);


    function toggleChildren(d: D3HierarchyNode) {
        if (d.children) { // If node is expanded
            d._children = d.children; // Store children in _children
            d.children = undefined;   // Set children to undefined (collapse)
        } else if (d._children) { // If node is collapsed and has _children
            d.children = d._children; // Restore children from _children
            d._children = undefined;  // Clear _children
        }
        update(d); 
    }

    function getNodeFillClass(d: D3HierarchyNode): string {
        if (d.depth === 0) return D3_NODE_COLORS.root;
        if (d.depth === 1) return D3_NODE_COLORS.level1;
        if (d.depth === 2) return D3_NODE_COLORS.level2;
        return D3_NODE_COLORS.default;
    }

    function getNodeTextClass(d: D3HierarchyNode): string {
        if (d.depth === 0) return D3_TEXT_COLORS.root;
        if (d.depth === 1) return D3_TEXT_COLORS.level1;
        if (d.depth === 2) return D3_TEXT_COLORS.level2;
        return D3_TEXT_COLORS.default;
    }
    
    function handleMouseOver(event: MouseEvent, d: D3HierarchyNode) {
        if (!gRef.current) return;
        const gElement = d3.select(gRef.current);

        gElement.selectAll<SVGGElement, D3HierarchyNode>('g.node')
            .filter(n => n.data.id === d.data.id)
            .select('rect')
            .attr('class', D3_NODE_COLORS.highlight)
            .attr('stroke-width', NODE_DIMENSIONS.highlightStrokeWidth);
         gElement.selectAll<SVGGElement, D3HierarchyNode>('g.node')
            .filter(n => n.data.id === d.data.id)
            .select('text')
            .attr('class', D3_TEXT_COLORS.highlight);

        gElement.selectAll<SVGPathElement, d3.HierarchyPointLink<MindMapNodeData>>('path.link')
            .filter(l => {
              const sourceNode = l.source as D3HierarchyNode;
              const targetNode = l.target as D3HierarchyNode;
              return (sourceNode.data.id === d.data.id && targetNode.parent?.data.id === d.data.id) || 
                     (targetNode.data.id === d.data.id && d.parent?.data.id === sourceNode.data.id);
            })
            .attr('class', `link ${D3_LINK_HIGHLIGHT_COLOR}`)
            .attr('stroke-width', 2.5);
        
        tooltip.style("opacity", 1)
               .html(d.data.name);
    }

    function handleMouseMove(event: MouseEvent, d: D3HierarchyNode) {
        tooltip.style("left", (event.pageX + 15) + "px")
               .style("top", (event.pageY - 10) + "px");
    }

    function handleMouseOut(event: MouseEvent, d: D3HierarchyNode) {
        if (!gRef.current) return;
        const gElement = d3.select(gRef.current);

         gElement.selectAll<SVGGElement, D3HierarchyNode>('g.node')
            .filter(n => n.data.id === d.data.id)
            .select('rect')
            .attr('class', getNodeFillClass(d))
            .attr('stroke-width', 1); 
         gElement.selectAll<SVGGElement, D3HierarchyNode>('g.node')
            .filter(n => n.data.id === d.data.id)
            .select('text')
            .attr('class', getNodeTextClass(d));

        gElement.selectAll<SVGPathElement, d3.HierarchyPointLink<MindMapNodeData>>('path.link')
            .attr('class', `link ${D3_LINK_COLOR}`)
            .attr('stroke-width', 1.5);
        
        tooltip.style("opacity", 0);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, height]); 

  return (
    <svg ref={svgRef} width={width} height={height} className="rounded-lg bg-slate-800 shadow-inner select-none" aria-labelledby="mindmapTitle" role="graphics-document">
      <title id="mindmapTitle">{data ? data.name : "Mind Map"}</title>
    </svg>
  );
});
