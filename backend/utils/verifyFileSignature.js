const fs = require("fs");
const JSZip = require("jszip");

/**
 * Confirms an uploaded file's actual bytes match its claimed extension,
 * instead of trusting the client-supplied filename alone (uploadMiddleware's
 * `fileFilter` only checks the extension string — a renamed file sails
 * straight through it). Returns a human-readable rejection reason, or null
 * if the content matches.
 */
async function verifyFileSignature(filePath, claimedType) {
  const header = Buffer.alloc(4);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, header, 0, 4, 0);
  fs.closeSync(fd);

  if (claimedType === "pdf") {
    if (header.toString("ascii", 0, 4) !== "%PDF") {
      return "This file is named as a PDF but its content does not match the PDF format.";
    }
    return null;
  }

  if (claimedType === "jpg" || claimedType === "jpeg") {
    if (header[0] !== 0xff || header[1] !== 0xd8 || header[2] !== 0xff) {
      return "This file is named as a JPEG but its content does not match the JPEG format.";
    }
    return null;
  }

  if (claimedType === "png") {
    if (header[0] !== 0x89 || header[1] !== 0x50 || header[2] !== 0x4e || header[3] !== 0x47) {
      return "This file is named as a PNG but its content does not match the PNG format.";
    }
    return null;
  }

  // Plain text has no fixed magic bytes, so this checks for the thing a
  // renamed binary file would actually give away instead: a null byte.
  // Genuine ASCII/UTF-8 text essentially never contains one; every common
  // binary format (images, archives, executables) does within the first
  // few KB — a lightweight, reliable-enough heuristic without a full
  // encoding validator.
  if (claimedType === "txt") {
    const sampleSize = 8000;
    const sample = Buffer.alloc(sampleSize);
    const fdTxt = fs.openSync(filePath, "r");
    const bytesRead = fs.readSync(fdTxt, sample, 0, sampleSize, 0);
    fs.closeSync(fdTxt);
    if (sample.subarray(0, bytesRead).includes(0x00)) {
      return "This file is named as a TXT but contains binary data, not plain text.";
    }
    return null;
  }

  // DOCX, PPTX, and a plain ZIP are all ZIP archives — same outer magic
  // bytes (PK\x03\x04) — so telling DOCX/PPTX apart from an arbitrary
  // renamed file, and from each other, needs looking inside the archive,
  // not just the first 4 bytes. A plain ZIP has no such inner-structure
  // requirement — any valid zip is accepted, since it's meant to hold
  // arbitrary content (e.g. a code submission), not a specific document type.
  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    return `This file is named as a ${claimedType.toUpperCase()} but its content does not match that format.`;
  }

  if (claimedType === "zip") {
    return null;
  }

  try {
    const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
    if (claimedType === "docx" && !zip.files["word/document.xml"]) {
      return "This file is named as a DOCX but does not contain a Word document structure.";
    }
    if (claimedType === "pptx" && !Object.keys(zip.files).some((name) => name.startsWith("ppt/"))) {
      return "This file is named as a PPTX but does not contain a PowerPoint structure.";
    }
    return null;
  } catch (err) {
    return `This file could not be verified as a valid ${claimedType.toUpperCase()} file.`;
  }
}

module.exports = { verifyFileSignature };
