
// Automatically reads a QR code from an uploaded PDF buffer.
// PDF pages are rendered with PDF.js + @napi-rs/canvas; jsQR decodes pixels.
// PDF.js text extraction is also used to compare certificate details.

const sharp = require("sharp");
const jsQR = require("jsqr");

const MAX_IMAGE_DIMENSION = 2600;
const MAX_PDF_PAGES_TO_SCAN = 40;

async function decodeRasterBuffer(inputBuffer) {
  const pipelines = [
    sharp(inputBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
      })
      .toColourspace("srgb")
      .ensureAlpha()
      .raw(),

    sharp(inputBuffer, { failOn: "none" })
      .rotate()
      .greyscale()
      .normalise()
      .sharpen()
      .resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
      })
      .toColourspace("srgb")
      .ensureAlpha()
      .raw(),
  ];

  for (const pipeline of pipelines) {
    const { data, info } = await pipeline.toBuffer({
      resolveWithObject: true,
    });

    const pixels = new Uint8ClampedArray(
      data.buffer,
      data.byteOffset,
      data.byteLength
    );

    const decoded = jsQR(
      pixels,
      info.width,
      info.height,
      {
        inversionAttempts: "attemptBoth",
      }
    );

    if (
      decoded &&
      typeof decoded.data === "string" &&
      decoded.data.trim()
    ) {
      return decoded.data.trim();
    }
  }

  return null;
}

async function getPdfJs() {
  const canvasModule = require("@napi-rs/canvas");

  if (!globalThis.DOMMatrix && canvasModule.DOMMatrix) {
    globalThis.DOMMatrix = canvasModule.DOMMatrix;
  }

  if (!globalThis.ImageData && canvasModule.ImageData) {
    globalThis.ImageData = canvasModule.ImageData;
  }

  if (!globalThis.Path2D && canvasModule.Path2D) {
    globalThis.Path2D = canvasModule.Path2D;
  }

  const pdfjs = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  return {
    pdfjs,
    canvasModule,
  };
}

async function openPdfDocument(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("The uploaded PDF is empty or unreadable.");
  }

  const { pdfjs, canvasModule } = await getPdfJs();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
  });

  try {
    const pdf = await loadingTask.promise;

    return {
      pdf,
      loadingTask,
      canvasModule,
    };
  } catch (error) {
    await loadingTask.destroy();
    throw error;
  }
}

async function scanPdfBuffer(buffer) {
  const {
    pdf,
    loadingTask,
    canvasModule,
  } = await openPdfDocument(buffer);

  try {
    if (pdf.numPages > MAX_PDF_PAGES_TO_SCAN) {
      throw new Error(
        `This PDF has ${pdf.numPages} pages. Please upload a PDF with ${MAX_PDF_PAGES_TO_SCAN} pages or fewer.`
      );
    }

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber += 1
    ) {
      const page = await pdf.getPage(pageNumber);

      try {
        const baseViewport = page.getViewport({
          scale: 1,
        });

        const scale = Math.min(
          3,
          Math.max(
            0.6,
            MAX_IMAGE_DIMENSION /
              Math.max(
                baseViewport.width,
                baseViewport.height
              )
          )
        );

        const viewport = page.getViewport({
          scale,
        });

        const width = Math.ceil(viewport.width);
        const height = Math.ceil(viewport.height);

        const canvas = canvasModule.createCanvas(
          width,
          height
        );

        const context = canvas.getContext("2d");

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        const pngBuffer = canvas.toBuffer("image/png");

        const qrPayload = await decodeRasterBuffer(
          pngBuffer
        );

        if (qrPayload) {
          return qrPayload;
        }
      } finally {
        page.cleanup();
      }
    }

    return null;
  } finally {
    await loadingTask.destroy();
  }
}

async function extractPdfTextFromBuffer(buffer) {
  const {
    pdf,
    loadingTask,
  } = await openPdfDocument(buffer);

  try {
    if (pdf.numPages > MAX_PDF_PAGES_TO_SCAN) {
      throw new Error(
        `This PDF has ${pdf.numPages} pages. Please upload a PDF with ${MAX_PDF_PAGES_TO_SCAN} pages or fewer.`
      );
    }

    const pageTexts = [];

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber += 1
    ) {
      const page = await pdf.getPage(pageNumber);

      try {
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item) =>
            typeof item.str === "string"
              ? item.str
              : ""
          )
          .filter(Boolean)
          .join(" ");

        if (pageText.trim()) {
          pageTexts.push(pageText);
        }
      } finally {
        page.cleanup();
      }
    }

    return pageTexts.join("\n").trim();
  } finally {
    await loadingTask.destroy();
  }
}

async function scanQrFromBuffer(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("The uploaded PDF is empty or unreadable.");
  }

  if (mimetype !== "application/pdf") {
    throw new Error("Only PDF certificate files are allowed.");
  }

  return scanPdfBuffer(buffer);
}

module.exports = {
  scanQrFromBuffer,
  extractPdfTextFromBuffer,
};
