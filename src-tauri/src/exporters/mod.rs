//! Font format exporters.
//!
//! Each exporter converts the internal `GtfDocument` to an external font format.
//! The `FontExporter` trait defines the common interface.
//!
//! ## Supported formats:
//! - **GTF Text** (.gtf) - Native format, fully implemented via `gtf::serialize`
//! - **DAT Text** (.dat) - VISE legacy text format (placeholder)
//! - **BFNT Binary** (.bfnt) - Binary bitmap font format (placeholder)
//! - **BMP Image** (.bmp) - Bitmap image export for individual glyphs (placeholder)

mod dat_text;
mod bfnt_binary;
mod bmp_image;

pub use dat_text::DatTextExporter;
pub use bfnt_binary::BfntBinaryExporter;
pub use bmp_image::BmpImageExporter;

use crate::gtf::types::GtfDocument;

/// Describes whether an exporter writes text or binary data.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum ExportMode
{
    Text,
    Binary,
}

/// Metadata about an exporter, suitable for UI display.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ExporterInfo
{
    pub name: String,
    pub extensions: Vec<String>,
    pub mode: ExportMode,
    pub description: String,
}

/// Common interface for all font format exporters.
pub trait FontExporter: Send + Sync
{
    /// Human-readable format name.
    fn name(&self) -> &str;

    /// Output file extensions (without dot, e.g. "dat").
    fn extensions(&self) -> &[&str];

    /// Whether this exporter writes text or binary data.
    fn mode(&self) -> ExportMode;

    /// Export the full document to a file.
    fn export_to_file(&self, document: &GtfDocument, path: &str) -> Result<(), String>;

    /// Export the full document to a text string (only for text-mode exporters).
    fn export_to_text(&self, _document: &GtfDocument) -> Result<String, String>
    {
        Err(format!("{}: export_to_text not supported", self.name()))
    }

    /// Export the full document to binary data (only for binary-mode exporters).
    fn export_to_bytes(&self, _document: &GtfDocument) -> Result<Vec<u8>, String>
    {
        Err(format!("{}: export_to_bytes not supported", self.name()))
    }

    /// Get metadata for UI display.
    fn info(&self) -> ExporterInfo
    {
        ExporterInfo {
            name: self.name().to_string(),
            extensions: self.extensions().iter().map(|s| s.to_string()).collect(),
            mode: self.mode(),
            description: format!("Export to {} format", self.name()),
        }
    }
}

/// Returns info about all registered exporters.
pub fn get_all_exporter_info() -> Vec<ExporterInfo>
{
    vec![
        ExporterInfo {
            name: "GTF Text".to_string(),
            extensions: vec!["gtf".to_string()],
            mode: ExportMode::Text,
            description: "Native GTF v2 text format (fully implemented)".to_string(),
        },
        DatTextExporter.info(),
        BfntBinaryExporter.info(),
        BmpImageExporter.info(),
    ]
}

/// Find the right exporter for a given format and run the export.
pub fn export_file(document: &GtfDocument, path: &str, format: &str) -> Result<(), String>
{
    match format.to_lowercase().as_str()
    {
        "gtf" =>
        {
            // Delegate to existing GTF serializer
            let content = crate::gtf::serialize_gtf_document(document)?;
            std::fs::write(path, content)
                .map_err(|e| format!("Failed to write file '{}': {}", path, e))
        }
        "dat" => DatTextExporter.export_to_file(document, path),
        "bfnt" => BfntBinaryExporter.export_to_file(document, path),
        "bmp" => BmpImageExporter.export_to_file(document, path),
        _ => Err(format!("Unknown export format: '{}'", format)),
    }
}
