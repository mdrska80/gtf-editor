use crate::gtf::types::GtfDocument;
use super::{FontExporter, ExportMode};

/// DAT Text Exporter - VISE legacy text format.
///
/// Placeholder implementation. The actual serialization logic for the DAT
/// format needs to be implemented based on the VISE_Dat specification.
pub struct DatTextExporter;

impl FontExporter for DatTextExporter
{
    fn name(&self) -> &str
    {
        "DAT Text (VISE)"
    }

    fn extensions(&self) -> &[&str]
    {
        &["dat"]
    }

    fn mode(&self) -> ExportMode
    {
        ExportMode::Text
    }

    fn export_to_file(&self, document: &GtfDocument, path: &str) -> Result<(), String>
    {
        let content = self.export_to_text(document)?;
        std::fs::write(path, content)
            .map_err(|e| format!("Failed to write DAT file '{}': {}", path, e))
    }

    fn export_to_text(&self, _document: &GtfDocument) -> Result<String, String>
    {
        // TODO: Implement DAT text serialization
        // Steps:
        //   1. Write DAT header (font name, version, global settings)
        //   2. Write glyph definitions (character code, bitmap rows)
        //   3. Convert palette-based bitmap to DAT pixel values
        Err("DAT text export not yet implemented".to_string())
    }
}
