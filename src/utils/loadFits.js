// utils/loadFits.js
import { readFile } from 'jsfits';

export async function loadFitsFromFile(file) {
  if (!file) {
    throw new Error("No file provided.");
  }

  const buffer = await file.arrayBuffer();
  const result = await readFile(buffer);

  if (result.error) {
    throw new Error(`FITS parsing error: ${result.error}`);
  }

  const { header, data, wcs, width, height, error: dataError } = result.primaryHDU;

  if (dataError) {
    console.warn("Data read issue:", dataError);
  }

  return { header, data, wcs, width, height };
}
