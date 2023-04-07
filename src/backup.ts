// import { Tensor, InferenceSession } from "onnxruntime-web";

// chrome.runtime.onInstalled.addListener(function () {
//   chrome.contextMenus.create({
//     title: "Copy without background",
//     id: "copy",
//     contexts: ["image"],
//   });
// });

// function processImage(img: ImageBitmap) {
//   const canvas = new OffscreenCanvas(1024, 1024),
//     ctx = canvas.getContext("2d");
//   if (ctx === null) throw new Error("Could not get context");
//   ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
//   return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
// }

// function processUnscaled(img: ImageBitmap) {
//   const canvas = new OffscreenCanvas(img.width, img.height),
//     ctx = canvas.getContext("2d");
//   if (ctx === null) throw new Error("Could not get context");
//   ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
//   return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
// }

// function imageDataToTensor(data: Uint8ClampedArray, dims: number[]) {
//   // 1a. Extract the R, G, and B channels from the data
//   const [R, G, B]: [number[], number[], number[]] = [[], [], []];
//   for (let i = 0; i < data.length; i += 4) {
//     R.push(data[i]);
//     G.push(data[i + 1]);
//     B.push(data[i + 2]);
//     // 2. skip data[i + 3] thus filtering out the alpha channel
//   }
//   // 1b. concatenate RGB ~= transpose [224, 224, 3] -> [3, 224, 224]
//   const transposedData = R.concat(G).concat(B);

//   // 3. convert to float32
//   let i,
//     l = transposedData.length; // length, we need this for the loop
//   const float32Data = new Float32Array(3 * 1024 * 1024); // create the Float32Array for output
//   for (i = 0; i < l; i++) {
//     float32Data[i] = transposedData[i] / 255.0; // convert to float
//   }

//   const inputTensor = new Tensor("float32", float32Data, dims);
//   return inputTensor;
// }

// function maskImage(
//   img: Uint8ClampedArray,
//   imgWidth: number,
//   imgHeight: number,
//   mask: Uint8ClampedArray
// ) {
//   const data = [];
//   // zip mask and image together
//   for (let row = 0; row < imgHeight; row++) {
//     for (let col = 0; col < imgWidth; col++) {
//       const i = col + row * imgWidth;
//       data.push(img[4 * i]);
//       data.push(img[4 * i + 1]);
//       data.push(img[4 * i + 2]);
//       //   const maskCol = Math.floor((1024 * col) / imgWidth);
//       //   const maskRow = Math.floor((1024 * row) / imgHeight);
//       //   const maskIndex = maskCol + maskRow * 1024;
//       //   data.push(mask[maskIndex] * 255);
//       data.push(mask[4 * i + 3]);
//     }
//   }
//   return new ImageData(new Uint8ClampedArray(data), imgWidth, imgHeight);
// }

// function rescaleToImageMask(
//   mask: Float32Array,
//   imgWidth: number,
//   imgHeight: number
// ) {
//   const data = [];
//   for (let i = 0; i < mask.length; i++) {
//     data.push(mask[i] * 255);
//     data.push(mask[i] * 255);
//     data.push(mask[i] * 255);
//     data.push(mask[i] * 255);
//   }
//   const unscaledData = new ImageData(new Uint8ClampedArray(data), 1024, 1024);
//   const unscaledCanvas = document.createElement("canvas"),
//     unscaledCtx = unscaledCanvas.getContext("2d");
//   if (unscaledCtx === null) throw new Error("Could not get context");
//   unscaledCanvas.width = 1024;
//   unscaledCanvas.height = 1024;
//   unscaledCtx.putImageData(unscaledData, 0, 0);
//   const scaledCanvas = document.createElement("canvas"),
//     scaledCtx = scaledCanvas.getContext("2d");
//   if (scaledCtx === null) throw new Error("Could not get context");
//   scaledCanvas.width = imgWidth;
//   scaledCanvas.height = imgHeight;

//   scaledCtx.drawImage(unscaledCanvas, 0, 0, imgWidth, imgHeight);
//   return scaledCtx.getImageData(0, 0, imgWidth, imgHeight).data;
// }

// async function handleImage(img: ImageBitmap) {
//   const resizedImageData = processImage(img);
//   const inputTensor = imageDataToTensor(resizedImageData, [1, 3, 1024, 1024]);
//   console.log(inputTensor);
//   const session = await InferenceSession.create("../isnet.onnx");

//   const results = await session.run({ input: inputTensor });

//   console.log(results["output"]);

//   const data = results["output"].data;

//   if (!(data instanceof Float32Array)) {
//     throw new Error("Expected output to be a Uint8Array");
//   }

//   const imageData = maskImage(
//     processUnscaled(img),
//     img.width,
//     img.height,
//     rescaleToImageMask(data, img.width, img.height)
//   );

//   // const mask = document.getElementById("mask");
//   // // write to mask canvas
//   // mask.width = img.width;
//   // mask.height = img.height;
//   // const ctx = mask.getContext("2d");
//   // ctx.putImageData(imageData, 0, 0);
//   console.log(imageData);
// }

// chrome.contextMenus.onClicked.addListener(async function (info, tab) {
//   if (info.srcUrl === undefined) return;

//   const response = await fetch(info.srcUrl);
//   const blob = await response.blob();
//   const bitmap = await createImageBitmap(blob);
//   handleImage(bitmap);
// });
