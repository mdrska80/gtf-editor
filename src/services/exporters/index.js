/**
 * Font Export Service - Thin wrapper around Rust backend exporters.
 *
 * All actual serialization logic lives in the Rust backend.
 * This module provides a clean JS API for the Vue frontend.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Export a font document to a file using the backend exporter for the given format.
 *
 * @param {string} filePath - Absolute path for the output file
 * @param {string} format - Export format (e.g. 'gtf', 'dat', 'bfnt', 'bmp')
 * @param {import('../../types/gtf').GtfDocument} document - The document to export
 * @returns {Promise<void>}
 */
export async function exportFontFile(filePath, format, document)
{
  return await invoke('export_font_file', { path: filePath, format, document });
}

/**
 * Get info about all available exporters from the backend.
 * Useful for building file dialog filters and UI.
 *
 * @returns {Promise<Array<{ name: string, extensions: string[], mode: string, description: string }>>}
 */
export async function getExporters()
{
  return await invoke('get_exporters');
}
