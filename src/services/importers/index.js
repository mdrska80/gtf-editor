/**
 * Font Import Service - Thin wrapper around Rust backend importers.
 *
 * All actual parsing logic lives in the Rust backend.
 * This module provides a clean JS API for the Vue frontend.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Import a font file using the backend importer for the given format.
 * Format is auto-detected from file extension if not specified.
 *
 * @param {string} filePath - Absolute path to the font file
 * @param {string} [format] - Format override (e.g. 'gtf', 'dat', 'fnt', 'bfnt')
 * @returns {Promise<import('../../types/gtf').GtfDocument>}
 */
export async function importFontFile(filePath, format = null)
{
  return await invoke('import_font_file', { path: filePath, format });
}

/**
 * Get info about all available importers from the backend.
 * Useful for building file dialog filters and UI.
 *
 * @returns {Promise<Array<{ name: string, extensions: string[], mode: string, description: string }>>}
 */
export async function getImporters()
{
  return await invoke('get_importers');
}
