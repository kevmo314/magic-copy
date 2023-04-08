import { env, InferenceSession } from "onnxruntime-web";

window.addEventListener("message", async function (event) {
  env.wasm.wasmPaths = {
    "ort-wasm-simd-threaded.wasm": "/ort-wasm-simd-threaded.wasm",
    "ort-wasm-simd.wasm": "/ort-wasm-simd.wasm",
    "ort-wasm-threaded.wasm": "/ort-wasm-threaded.wasm",
    "ort-wasm.wasm": "/ort-wasm.wasm",
  };
  const model = await InferenceSession.create(
    "/interactive_module_quantized_592547_2023_03_19_sam6_long_uncertain.onnx"
  );
  const results = await model.run(event.data);

  event.source?.postMessage(results, { targetOrigin: event.origin });
});
