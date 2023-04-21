import { Tensor } from "onnxruntime-web";

export type Path = [number, number][];
export type Mask = number[][];

interface modelInputProps {
  x: number;
  y: number;
  width: null | number;
  height: null | number;
  clickType: number;
}
interface modelScaleProps {
  onnxScale: number;
  maskWidth: number;
  maskHeight: number;
  scale: number;
  uploadScale: number;
  width: number;
  height: number;
}

interface modeDataProps {
  clicks?: Array<modelInputProps>;
  tensor: Tensor;
  modelScale: modelScaleProps;
  best_box?: number[];
  point_coords?: Array<number[]>;
  point_labels?: number[];
  last_pred_mask: Tensor | null;
}

const getPointsFromBox = (box: modelInputProps) => {
  if (box.width === null || box.height === null) return;
  const upperLeft = { x: box.x, y: box.y };
  const bottomRight = { x: box.width, y: box.height };
  return { upperLeft, bottomRight };
};

const isFirstClick = (clicks: Array<modelInputProps>) => {
  return (
    (clicks.length === 1 &&
      (clicks[0].clickType === 1 || clicks[0].clickType === 0)) ||
    (clicks.length === 2 &&
      clicks.every((c) => c.clickType === 2 || c.clickType === 3))
  );
};

export function modelData({
  clicks,
  tensor,
  modelScale,
  point_coords,
  point_labels,
  last_pred_mask,
}: modeDataProps) {
  const lowResTensor = tensor;
  let pointCoords;
  let pointLabels;
  let pointCoordsTensor;
  let pointLabelsTensor;
  // point_coords, point_labels params below are only truthy in text model
  // if (point_coords && point_labels) {
  //   pointCoords = new Float32Array(4);
  //   pointLabels = new Float32Array(2);
  //   pointCoords[0] = point_coords[0][0];
  //   pointCoords[1] = point_coords[0][1];
  //   pointLabels[0] = point_labels[0]; // UPPER_LEFT
  //   pointCoords[2] = point_coords[1][0];
  //   pointCoords[3] = point_coords[1][1];
  //   pointLabels[1] = point_labels[1]; // BOTTOM_RIGHT
  //   pointCoordsTensor = new Tensor("float32", pointCoords, [1, 2, 2]);
  //   pointLabelsTensor = new Tensor("float32", pointLabels, [1, 2]);
  // }
  // point click model check
  if (clicks) {
    let n = clicks.length;
    const clicksFromBox = clicks[0].clickType === 2 ? 2 : 0;

    // For click only input (no box) need to add an extra
    // negative point and label
    pointCoords = new Float32Array(2 * (n + 1));
    pointLabels = new Float32Array(n + 1);

    // Check if there is a box input
    if (clicksFromBox) {
      // For box model need to include the box clicks in the point
      // coordinates and also don't need to include the extra
      // negative point
      pointCoords = new Float32Array(2 * (n + clicksFromBox));
      pointLabels = new Float32Array(n + clicksFromBox);
      const {
        upperLeft,
        bottomRight,
      }: {
        upperLeft: { x: number; y: number };
        bottomRight: { x: number; y: number };
      } = getPointsFromBox(clicks[0])!;
      pointCoords = new Float32Array(2 * (n + clicksFromBox));
      pointLabels = new Float32Array(n + clicksFromBox);
      pointCoords[0] = upperLeft.x / modelScale.onnxScale;
      pointCoords[1] = upperLeft.y / modelScale.onnxScale;
      pointLabels[0] = 2.0; // UPPER_LEFT
      pointCoords[2] = bottomRight.x / modelScale.onnxScale;
      pointCoords[3] = bottomRight.y / modelScale.onnxScale;
      pointLabels[1] = 3.0; // BOTTOM_RIGHT

      last_pred_mask = null;
    }

    // Add regular clicks
    for (let i = 0; i < n; i++) {
      pointCoords[2 * (i + clicksFromBox)] = clicks[i].x / modelScale.onnxScale;
      pointCoords[2 * (i + clicksFromBox) + 1] =
        clicks[i].y / modelScale.onnxScale;
      pointLabels[i + clicksFromBox] = clicks[i].clickType;
    }

    // Add in the extra point/label when only clicks and no box
    // The extra point is at (0, 0) with label -1
    if (!clicksFromBox) {
      pointCoords[2 * n] = 0.0;
      pointCoords[2 * n + 1] = 0.0;
      pointLabels[n] = -1.0;
      // update n for creating the tensor
      n = n + 1;
    }

    // Create the tensor
    pointCoordsTensor = new Tensor("float32", pointCoords, [
      1,
      n + clicksFromBox,
      2,
    ]);
    pointLabelsTensor = new Tensor("float32", pointLabels, [
      1,
      n + clicksFromBox,
    ]);
  }
  const imageSizeTensor = new Tensor("float32", [
    modelScale.maskHeight,
    modelScale.maskWidth,
  ]);
  if (pointCoordsTensor === undefined || pointLabelsTensor === undefined)
    return;

  // if there is a previous tensor, use it, otherwise we default to an empty tensor
  const lastPredMaskTensor =
    last_pred_mask && clicks && !isFirstClick(clicks)
      ? last_pred_mask
      : new Tensor("float32", new Float32Array(256 * 256), [1, 1, 256, 256]);

  // +!! is javascript shorthand to convert truthy value to 1, falsey value to 0
  const hasLastPredTensor = new Tensor("float32", [
    +!!(last_pred_mask && clicks && !isFirstClick(clicks)),
  ]);

  return {
    low_res_embedding: lowResTensor,
    point_coords: pointCoordsTensor,
    point_labels: pointLabelsTensor,
    image_size: imageSizeTensor,
    last_pred_mask: lastPredMaskTensor,
    has_last_pred: hasLastPredTensor,
  };
}
