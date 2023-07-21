function getBoundingBox(
  data: Uint8ClampedArray,
  width: number,
  height: number
) {
  const bound = {
    top: height,
    left: width,
    right: 0,
    bottom: 0,
  };

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      if (data[i] === 0) {
        continue;
      }
      if (y < bound.top) {
        bound.top = y;
      }
      if (x < bound.left) {
        bound.left = x;
      }
      if (x > bound.right) {
        bound.right = x;
      }
      if (y > bound.bottom) {
        bound.bottom = y;
      }
    }
  }

  const trimHeight = bound.bottom - bound.top + 1,
    trimWidth = bound.right - bound.left + 1;
  if (trimWidth <= 0 || trimHeight <= 0) {
    return null;
  }
  return {
    minX: bound.left,
    minY: bound.top,
    maxX: bound.right,
    maxY: bound.bottom,
  };
}

export async function pairwiseImageCrop(
  original: Blob,
  mask: Blob,
  startingDimensions: { width: number; height: number },
  endingDimensions: { width: number; height: number }
) {
  // draw the mask to a canvas
  const maskCanvas = new OffscreenCanvas(
    startingDimensions.width,
    startingDimensions.height
  );
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) {
    return;
  }
  const maskBitmap = await createImageBitmap(mask);
  maskCtx.drawImage(maskBitmap, 0, 0);

  // compute the bounding box of the mask
  const maskData = maskCtx.getImageData(
    0,
    0,
    maskCanvas.width,
    maskCanvas.height
  );
  const maskBounds = getBoundingBox(
    maskData.data,
    maskCanvas.width,
    maskCanvas.height
  );
  if (!maskBounds) {
    return;
  }
  const maskWidth = maskBounds.maxX - maskBounds.minX;
  const maskHeight = maskBounds.maxY - maskBounds.minY;
  const maskCenterX = maskBounds.minX + maskWidth / 2;
  const maskCenterY = maskBounds.minY + maskHeight / 2;

  if (
    maskWidth > endingDimensions.width ||
    maskHeight > endingDimensions.height
  ) {
    // mask can't be cropped
    return;
  }

  // crop the mask
  const croppedMaskCanvas = new OffscreenCanvas(
    endingDimensions.width,
    endingDimensions.height
  );
  const croppedMaskCtx = croppedMaskCanvas.getContext("2d");
  if (!croppedMaskCtx) {
    return;
  }

  const startX = Math.max(0, Math.min(maskCenterX - endingDimensions.width / 2, startingDimensions.width - endingDimensions.width));
  const startY = Math.max(0, Math.min(maskCenterY - endingDimensions.height / 2, startingDimensions.height - endingDimensions.height));

  croppedMaskCtx.drawImage(
    maskCanvas,
    startX,
    startY,
    endingDimensions.width,
    endingDimensions.height,
    0,
    0,
    endingDimensions.width,
    endingDimensions.height
  );
  const croppedMask = await croppedMaskCanvas.convertToBlob();

  // crop the original
  const croppedOriginalCanvas = new OffscreenCanvas(
    endingDimensions.width,
    endingDimensions.height
  );
  const croppedOriginalCtx = croppedOriginalCanvas.getContext("2d");
  if (!croppedOriginalCtx) {
    return;
  }

  const originalBitmap = await createImageBitmap(original);
  croppedOriginalCtx.drawImage(
    originalBitmap,
    startX,
    startY,
    endingDimensions.width,
    endingDimensions.height,
    0,
    0,
    endingDimensions.width,
    endingDimensions.height
  );
  const croppedOriginal = await croppedOriginalCanvas.convertToBlob();

  return {
    mask: croppedMask,
    original: croppedOriginal,
    startX, startY,
  };
}
