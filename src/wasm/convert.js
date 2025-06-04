import FITSConverter from './fits_converter.js';

let wasm = null;

export async function initWASM() {
  if (!wasm) {
    wasm = await FITSConverter();
  }
  return wasm;
}

export async function convertFloat32ToUint16(inputArray) {
  const module = await initWASM();
  const { _malloc, _free, _convertFloat32ToFloat16 } = module;

  const len = inputArray.length;

  // Allocate WASM memory
  const floatPtr = _malloc(len * 4); // 4 bytes per float32
  const outPtr = _malloc(len * 2);   // 2 bytes per uint16

  // ⚠️ HEAP views must be freshly created after malloc
  const heapF32 = new Float32Array(module.HEAPF32.buffer);
  const heapU16 = new Uint16Array(module.HEAPU16.buffer);

  // ✅ Safe write into WASM memory
  heapF32.set(inputArray, floatPtr / 4);

  _convertFloat32ToFloat16(floatPtr, outPtr, len);

  // ✅ Copy out safely
  const result = new Uint16Array(heapU16.buffer.slice(outPtr, outPtr + len * 2));

  _free(floatPtr);
  _free(outPtr);

  return result;
}
