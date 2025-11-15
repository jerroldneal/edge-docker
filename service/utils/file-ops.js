// file-ops.js - File operation utilities

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

/**
 * Copy file from Docker container to host
 * @param {string} containerName - Name of the container
 * @param {string} containerPath - Path inside container
 * @param {string} hostPath - Destination path on host
 * @returns {Promise<void>}
 */
async function copyFromContainer(containerName, containerPath, hostPath) {
  await execAsync(`docker cp ${containerName}:${containerPath} "${hostPath}"`);
}

/**
 * Read text from file and optionally delete it
 * @param {string} filePath - Path to the file
 * @param {boolean} deleteAfter - Whether to delete file after reading
 * @returns {Promise<string>} File contents
 */
async function readAndOptionallyDelete(filePath, deleteAfter = false) {
  const text = await fs.readFile(filePath, 'utf-8');

  if (deleteAfter) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      // Ignore errors deleting temp file
    }
  }

  return text;
}

/**
 * Generate unique filename with timestamp
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension (with dot)
 * @returns {string} Unique filename
 */
function generateUniqueFilename(prefix, extension) {
  return `${prefix}-${Date.now()}${extension}`;
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 * @returns {Promise<void>}
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (err) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

module.exports = {
  copyFromContainer,
  readAndOptionallyDelete,
  generateUniqueFilename,
  ensureDirectory
};
