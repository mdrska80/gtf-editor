use crate::gtf::types::GtfDocument;
use super::{FontExporter, ExportMode};

/// BFNT Binary Exporter - Binary bitmap font format.
///
/// Placeholder implementation. BFNT is a binary format where glyph
/// bitmaps are stored as packed pixel data. Used in embedded display systems.
pub struct BfntBinaryExporter;

impl FontExporter for BfntBinaryExporter
{
    fn name(&self) -> &str
    {
        "BFNT Binary"
    }

    fn extensions(&self) -> &[&str]
    {
        &["bfnt"]
    }

    fn mode(&self) -> ExportMode
    {
        ExportMode::Binary
    }

    fn export_to_file(&self, document: &GtfDocument, path: &str) -> Result<(), String>
    {
        let bytes = self.export_to_bytes(document)?;
        std::fs::write(path, bytes)
            .map_err(|e| format!("Failed to write BFNT file '{}': {}", path, e))
    }

    fn export_to_bytes(&self, _document: &GtfDocument) -> Result<Vec<u8>, String>
    {
        // TODO: Implement BFNT binary serialization
        // Steps:
        //   1. Build binary header (magic bytes, version, glyph count)
        //   2. Build glyph table (character codes, offsets, sizes)
        //   3. Pack bitmap data into binary pixel arrays
        //   4. Concatenate header + table + bitmap data
        Err("BFNT binary export not yet implemented".to_string())
    }
}
