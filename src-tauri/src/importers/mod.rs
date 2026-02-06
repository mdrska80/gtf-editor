//! Font format importers.
//!
//! Each importer converts an external font format into the internal `GtfDocument`.
//! The `FontImporter` trait defines the common interface.
//! 
//! ## Supported formats:
//! - **GTF Text** (.gtf) - Native format, fully implemented via `gtf::parse`
//! - **DAT Text** (.dat) - VISE legacy text format (placeholder)
//! - **FNT Text** (.fnt) - Bitmap font text format (placeholder)
//! - **BFNT Binary** (.bfnt) - Binary bitmap font format (placeholder)

mod dat_text;
mod fnt_text;
mod bfnt_binary;

pub use dat_text::DatTextImporter;
pub use fnt_text::FntTextImporter;
pub use bfnt_binary::BfntBinaryImporter;

use crate::gtf::types::GtfDocument;

/// Describes whether an importer works with text or binary data.
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum ImportMode
{
    Text,
    Binary,
}

/// Metadata about an importer, suitable for UI display.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImporterInfo
{
    pub name: String,
    pub extensions: Vec<String>,
    pub mode: ImportMode,
    pub description: String,
}

/// Common interface for all font format importers.
pub trait FontImporter: Send + Sync
{
    /// Human-readable format name.
    fn name(&self) -> &str;

    /// Supported file extensions (without dot, e.g. "dat").
    fn extensions(&self) -> &[&str];

    /// Whether this importer handles text or binary data.
    fn mode(&self) -> ImportMode;

    /// Import from a file path. Reads the file and parses it.
    fn import_from_file(&self, path: &str) -> Result<GtfDocument, String>;

    /// Import from raw text content (only for text-mode importers).
    fn import_from_text(&self, _content: &str) -> Result<GtfDocument, String>
    {
        Err(format!("{}: import_from_text not supported", self.name()))
    }

    /// Import from raw binary content (only for binary-mode importers).
    fn import_from_bytes(&self, _content: &[u8]) -> Result<GtfDocument, String>
    {
        Err(format!("{}: import_from_bytes not supported", self.name()))
    }

    /// Quick validation without full parsing.
    fn validate_file(&self, path: &str) -> Result<bool, String>;

    /// Get metadata for UI display.
    fn info(&self) -> ImporterInfo
    {
        ImporterInfo {
            name: self.name().to_string(),
            extensions: self.extensions().iter().map(|s| s.to_string()).collect(),
            mode: self.mode(),
            description: format!("Import from {} format", self.name()),
        }
    }
}

/// Returns info about all registered importers.
pub fn get_all_importer_info() -> Vec<ImporterInfo>
{
    vec![
        ImporterInfo {
            name: "GTF Text".to_string(),
            extensions: vec!["gtf".to_string()],
            mode: ImportMode::Text,
            description: "Native GTF v2 text format (fully implemented)".to_string(),
        },
        DatTextImporter.info(),
        FntTextImporter.info(),
        BfntBinaryImporter.info(),
    ]
}

/// Find the right importer for a given file extension and run the import.
pub fn import_file(path: &str, format: &str) -> Result<GtfDocument, String>
{
    match format.to_lowercase().as_str()
    {
        "gtf" =>
        {
            // Delegate to existing GTF parser
            let content = std::fs::read_to_string(path)
                .map_err(|e| format!("Failed to read file '{}': {}", path, e))?;
            crate::gtf::parse_gtf_content(&content)
        }
        "dat" => DatTextImporter.import_from_file(path),
        "fnt" => FntTextImporter.import_from_file(path),
        "bfnt" => BfntBinaryImporter.import_from_file(path),
        _ => Err(format!("Unknown import format: '{}'", format)),
    }
}
