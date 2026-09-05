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

  // DOCX and PPTX are both ZIP archives (Office Open XML) — same outer
  // magic bytes (PK\x03\x04) — so telling them apart from an arbitrary
  // renamed file, and from each other, needs looking inside the archive,
  // not just the first 4 bytes.
  if (header[0] !== 0x50 || header[1] !== 0x4b) {
    return `This file is named as a ${claimedType.toUpperCase()} but its content does not match that format.`;
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
