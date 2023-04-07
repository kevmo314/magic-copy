/**
 * Custom mask tracing algorithm
 *  1. Find the "breakpoints" (endpoints of every filled block) of every line in the image
 *  2. For each pair of lines, greedily connect every pair of endpoints ordered from top to bottom
 *       - Connect short horizontal segments into long ones where possible
 *       - Convert diagonal segments into horizontal/vertical segment pairs to make right angles where reasonable
 *       - Add segments to close polygons
 *  3. Repeatedly choose vertices and follow adjacent ones to create joined SVG path data strings.
 *       - Choose the next unused point (in sorted order by x, y)
 *       - Repeatedly choose adjacent vertices until the path is closed
 *           - The vertices are necessarily sorted in counter-clockwise order
 *             due how the edges were generated in step 2
 *       - Check how many existing paths this point is inside, and reverse the order of points if necessary
 *       - Convert path to an SVG string and add to final output
 */

/**
 * Helper function
 * Converts string representation of point (used as Map key) back into [x, y] array
 * @param {str} point "x y"
 * @returns {Array<number>} [x, y]
 */
const splitPointKey = (point: string) => {
  return point.split(" ").map((a: string) => parseInt(a));
};

/**
 * Used in generatePolygonSegments
 * ------
 * Step 1
 * ------
 * Converts a mask encoded with RLE and converts it into an array of breakpoints per column of the mask.
 *     - Each line starts as 0 by default, and at each breakpoint the bit is flipped
 *     - If a line doesn't exist in the return array, this line is all 0.
 *
 * @param {Array<number>} rleMask
 * @param {number} height (of mask)
 * @returns {Array<Object>} each item is a JS object describing the breakpoints for a line:
 *    {
 *        line {number}: index of line this object describes,
 *        points {Array<number>}: list of pixel indices along line at which bit goes from 0 -> 1 or vice versa
 *    }
 */
const getLineBreakpoints = (rleMask: string | any[], height: number) => {
  const breakpoints = [];
  const currentLine: { line: number; points: any } = { line: -1, points: [] };
  let sum = 0; // sum of pixels seen so far, used to compute breakpoints

  // Helper function to push currentLine data to breakpoints
  const addCurrentLineToBreakpoints = () => {
    if (currentLine.points.length > 0) {
      breakpoints.push({ line: currentLine.line, points: currentLine.points });
      currentLine.points = [];
    }
  };

  // Iterate through every pair of values in rleMask
  for (let i = 1; i < rleMask.length; i += 2) {
    // Get coords of start/end pixels of the filled block
    sum += rleMask[i - 1];
    const y1 = sum % height;
    const x1 = Math.floor(sum / height);

    sum += rleMask[i];
    const y2 = sum % height;
    const x2 = Math.floor(sum / height);

    if (currentLine.line !== x1) {
      addCurrentLineToBreakpoints();
      currentLine.line = x1;
    }
    // Case if the block is just one line
    if (x1 === x2) {
      currentLine.points.push(y1, y2);
      continue;
    }
    // Otherwise, first handle the first line of the block
    currentLine.points.push(y1, height);
    addCurrentLineToBreakpoints();
    currentLine.line = x2;
    // Then handle in-between lines, which are all filled
    for (let x0 = x1 + 1; x0 < x2; x0++) {
      breakpoints.push({ line: x0, points: [0, height] });
    }
    // Lastly, handle the last line of the block
    if (y2 > 0) {
      currentLine.points.push(0, y2);
    }
  }
  // Push any remaining data in currentLine to breakpoints
  addCurrentLineToBreakpoints();

  return breakpoints;
};

/**
 * ------
 * Step 2
 * ------
 * Generates a Map of segments that collectively trace all EDGES within a mask.
 *
 * @param {Array<number>} rleMask
 * @param {number} height (of mask)
 * @returns {Map<string, Set<string>>} Map of all vertices to its adjacent vertices
 *    - key: "x y" string-formatted point
 *    - value: Set of string-formatted points adjacent to key
 */
export const generatePolygonSegments = (rleMask: any, height: any) => {
  const breakpoints = getLineBreakpoints(rleMask, height);

  // If mask is actually an empty mask, return nothing since there are no edges
  if (breakpoints.length === 0) return new Map();

  // Now, generate the outline as a set of lines using the breakpoints
  const polySegments = new Map(); // maps str points to set of target points
  let lastLine = -1;
  let lastPoints: string | any[] = [];

  // This is a solution optimization that caches horizontal segments so that consecutive
  // straight horizontal segments can be joined into one long segment
  const horizontalSegments = new Map(); // maps y to starting x

  // ------------------
  //  Helper functions
  // ------------------

  // Given two points, format each into a string and add the bidirectional segment to polySegments
  const addToPolySegments = (
    p1: { x: any; y: any },
    p2: { x: any; y: any }
  ) => {
    const p1Str = `${p1.x} ${p1.y}`,
      p2Str = `${p2.x} ${p2.y}`;
    if (!polySegments.has(p1Str)) polySegments.set(p1Str, new Set());
    polySegments.get(p1Str).add(p2Str);
    if (!polySegments.has(p2Str)) polySegments.set(p2Str, new Set());
    polySegments.get(p2Str).add(p1Str);
  };

  // For the horizontal segment optimization:
  //    A horizontal segment can no longer be extended because the end vertex has been connected in a different direction,
  //    so given y and the designated ending x, add the segment to polySegments and remove it from horizontalSegments
  const closeHorizontalSegment = (y: any, x2: number) => {
    // Don't close if x2 is the start vertex, because the segment can still be extended the other way
    if (x2 !== horizontalSegments.get(y)) {
      addToPolySegments({ x: horizontalSegments.get(y), y }, { x: x2, y });
      horizontalSegments.delete(y);
    }
  };

  // Process a segment from (x1, y1) to (x2, y2), handling possible horizontal segment and straightening optimizations
  const addSegment = (x1: number, y1: any, x2: number, y2: any) => {
    // If the segment is horizontal, add it to the intermediate horizontalSegments map instead
    if (y1 === y2) {
      if (!horizontalSegments.has(y1)) horizontalSegments.set(y1, x1);
      return;
    }

    // Otherwise, we check both vertices to see if they connect to any horizontal segments, and if so we close them
    // "Straightening" solution optimization:
    //    In the case where both of the following are true:
    //        - this segment (x1, y1) to (x2, y2) is diagonal (note |x1 - x2| <= 1)
    //        - it closes at least one horizontal segment
    //    Then we should adjust one x coordinate by 1 pixel to make sure right angles are correctly drawn
    let canStraighten = false;
    const maxX = Math.max(x1, x2); // If we do straighten, align both vertices to the right
    if (horizontalSegments.has(y1)) {
      closeHorizontalSegment(y1, maxX);
      canStraighten = true;
    }
    if (horizontalSegments.has(y2)) {
      closeHorizontalSegment(y2, maxX);
      canStraighten = true;
    }
    // Add line, setting x to maxX if a horizontal segment has been closed
    if (canStraighten)
      addToPolySegments({ x: maxX, y: y1 }, { x: maxX, y: y2 });
    else addToPolySegments({ x: x1, y: y1 }, { x: x2, y: y2 });
  };

  // This function handles the case where a line with a nonzero number of pixels is followed by an empty line,
  //    so we can add edges to close any incomplete polygons.
  // We trace the right edge of the pixel (prevLine + 1) instead of left to ensure the area of the polygon is nonzero
  const closePreviousLine = (prevLine: number, prevPoints: string | any[]) => {
    // For every breakpoint in the previous line, add a horizontal segment up to the right edge of the line
    for (const y of prevPoints) addSegment(prevLine, y, prevLine + 1, y);
    // Then connect every pair of breakpoints along the current line to close polygons
    for (let i = 1; i < prevPoints.length; i += 2) {
      addSegment(prevLine + 1, prevPoints[i - 1], prevLine + 1, prevPoints[i]);
    }
  };

  // -----------
  //  Main loop
  // -----------
  // Iterate through each line of the breakpoints array and connect breakpoints as necessary to generate segments

  for (const { line, points } of breakpoints) {
    // If the new line isn't the one directly after the previous one, close existing polygons and reset state
    if (line !== lastLine + 1) {
      closePreviousLine(lastLine, lastPoints);
      lastLine = line - 1;
      lastPoints = [];
    }
    // We want to iterate through breakpoints in both lines in order of increasing y value
    // Find the first breakpoint
    let x1 = lastPoints.length && lastPoints[0] <= points[0] ? lastLine : line;
    let y1 = x1 === lastLine ? lastPoints[0] : points[0];
    // Keep a pointer for each line
    let lastLineIndex = x1 === lastLine ? 1 : 0;
    let newLineIndex = x1 === lastLine ? 0 : 1;
    // Flag to track if this is an odd or even breakpoint (we want to handle breakpoints two at a time)
    let odd = true;
    while (lastLineIndex < lastPoints.length || newLineIndex < points.length) {
      // Get next breakpoint by comparing values at pointer for both lines
      let x2, y2;
      if (
        lastLineIndex === lastPoints.length ||
        points[newLineIndex] < lastPoints[lastLineIndex]
      ) {
        x2 = line;
        y2 = points[newLineIndex];
        newLineIndex++;
      } else {
        x2 = lastLine;
        y2 = lastPoints[lastLineIndex];
        lastLineIndex++;
      }
      // If previous breakpoint was odd, then we now have a pair and should connect them
      if (odd) {
        if (x1 === lastLine && x2 === lastLine) {
          // If both breakpoints are on the previous line, we are closing a polygon and should
          // do so on the right-most edge to guarantee a non-zero area (see closePreviousLine)
          addSegment(lastLine, y1, line, y1);
          addSegment(lastLine, y2, line, y2);
          addSegment(line, y1, line, y2);
        } else {
          // Otherwise just connect the two points with a segment
          addSegment(x1, y1, x2, y2);
        }
      }
      odd = !odd;
      x1 = x2;
      y1 = y2;
    }

    // Update last line and points
    lastLine = line;
    lastPoints = points;
  }
  // Close any remaining polygons after the last line
  closePreviousLine(lastLine, lastPoints);

  // Reinitialize the map with keys in sorted order by (x, y)
  const sortedSegments = new Map(
    [...polySegments].sort((a, b) => {
      const [x1, y1] = splitPointKey(a[0]);
      const [x2, y2] = splitPointKey(b[0]);
      if (x1 === x2) return y1 - y2;
      return x1 - x2;
    })
  );

  return sortedSegments;
};

/**
 * ------
 * Step 3
 * ------
 * Converts Map of segments from generatePolygonSegments into closed SVG paths combined into one string,
 * where nested paths alternate direction so holes are correctly rendered using the nonzero fill rule.
 * @param {Map<string, Set<string>>} polySegments output of generatePolygonSegments
 * @returns {string} SVG data string for display
 */
export const convertSegmentsToSVG = (polySegments: any) => {
  // 1. Generate the closed polygon paths (as lists of points) in order from outermost to innermost
  const paths = [];
  while (polySegments.size) {
    // Pick the outermost vertex from the remaining set (smallest (x, y))
    let [point, targets] = polySegments.entries().next().value;
    const firstPoint = point;
    const path = [splitPointKey(firstPoint)];
    // Repeatedly pick the next adjacent vertex and add it to the path until the path is closed
    let nextPoint = null;
    while (nextPoint !== firstPoint) {
      nextPoint = targets.values().next().value;
      path.push(splitPointKey(nextPoint));
      // Remove used edges and delete the point from polySegments entirely if it has no more edges left
      targets.delete(nextPoint);
      if (targets.size === 0) polySegments.delete(point);
      // Do the same for the bidirectional edge
      const nextPointTargets = polySegments.get(nextPoint);
      nextPointTargets.delete(point);
      // Move to the next set of edges, unless it is empty in which case break since we've completed a loop
      if (nextPointTargets.size === 0) {
        polySegments.delete(nextPoint);
        break;
      } else {
        point = nextPoint;
        targets = nextPointTargets;
      }
    }
    paths.push(path);
  }

  // 2. Compute desired direction for each path, flip if necessary, then convert to SVG string
  const renderedPaths = [];
  const svgStrings = [];

  // We use a canvas element to draw the paths and check isPointInPath to determine wanted direction
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  for (const path of paths) {
    // Count how many other paths a point contained inside this path is contained within
    //  if odd number: should be clockwise, even number: should be counter-clockwise
    let shouldBeClockwise = false;
    const [sampleX, sampleY] = path[0];
    for (const otherPath of renderedPaths) {
      if (ctx!.isPointInPath(otherPath, sampleX + 0.5, sampleY + 0.5))
        shouldBeClockwise = !shouldBeClockwise;
    }
    // All paths are default counter-clockwise based on how the segments were generated,
    //    so reverse the points in the path if it is supposed to be clockwise
    if (shouldBeClockwise) path.reverse();

    // Build the SVG data string for this path
    const stringPoints = path
      .slice(1)
      .map(([x, y]) => `${x} ${y}`)
      .join(" ");
    const svgStr = `M${path[0][0]} ${path[0][1]} L` + stringPoints;
    svgStrings.push(svgStr); // Add to final SVG string return value

    // Add a new Path2D to the canvas to be able to call isPointInPath for the remaining paths
    const pathObj = new Path2D(svgStr);
    ctx!.fill(pathObj);
    renderedPaths.push(pathObj);
  }

  return svgStrings;
};
