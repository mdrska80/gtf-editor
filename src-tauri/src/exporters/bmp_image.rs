use crate::gtf::types::GtfDocument;
use super::{FontExporter, ExportMode};

/// BMP Image Exporter - Exports glyphs as bitmap images.
///
/// Placeholder implementation. Generates BMP image files from glyph
/// bitmap data using the palette colors.
pub struct BmpImageExporter;

impl FontExporter for BmpImageExporter
{
    fn name(&self) -> &str
    {
        "BMP Image"
    }

    fn extensions(&self) -> &[&str]
    {
        &["bmp"]
    }

    fn mode(&self) -> ExportMode
    {
        ExportMode::Binary
    }

    fn export_to_file(&self, document: &GtfDocument, path: &str) -> Result<(), String>
    {
        let bytes = self.export_to_bytes(document)?;
        std::fs::write(path, bytes)
            .map_err(|e| format!("Failed to write BMP file '{}': {}", path, e))
    }

    fn export_to_bytes(&self, _document: &GtfDocument) -> Result<Vec<u8>, String>
    {
        // TODO: Implement BMP image generation
        // Steps:
        //   1. For each glyph, create a pixel buffer (width * height * 4 bytes RGBA)
        //   2. Map palette characters to RGB colors
        //   3. Fill pixel buffer with colors from bitmap
        //   4. Write BMP file header + pixel data
        //   OR: Generate a font atlas with all glyphs in a single image
        Err("BMP image export not yet implemented".to_string())
    }
}
