use crate::gtf::types::GtfDocument;
use super::{FontImporter, ImportMode};

/// FNT Text Importer - Bitmap font text format.
///
/// Placeholder implementation. FNT is a text-based bitmap font format
/// commonly used in embedded systems and display devices.
pub struct FntTextImporter;

impl FontImporter for FntTextImporter
{
    fn name(&self) -> &str
    {
        "FNT Text"
    }

    fn extensions(&self) -> &[&str]
    {
        &["fnt"]
    }

    fn mode(&self) -> ImportMode
    {
        ImportMode::Text
    }

    fn import_from_file(&self, path: &str) -> Result<GtfDocument, String>
    {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read FNT file '{}': {}", path, e))?;
        self.import_from_text(&content)
    }

    fn import_from_text(&self, _content: &str) -> Result<GtfDocument, String>
    {
        // TODO: Implement FNT text parsing
        // Steps:
        //   1. Parse font info line (name, size, etc.)
        //   2. Parse character definitions
        //   3. Convert bitmap data to glyph format
        //   4. Build palette from color definitions
        Err("FNT text import not yet implemented".to_string())
    }

    fn validate_file(&self, path: &str) -> Result<bool, String>
    {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read file '{}': {}", path, e))?;
        // TODO: Add actual FNT format validation
        Ok(!content.is_empty())
    }
}
