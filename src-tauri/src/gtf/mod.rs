//! GTF module layout:
//! - `types`: Core data structures shared by parsing and serialization.
//! - `parse`: Stateful parser that converts text into `GtfDocument`.
//! - `serialize`: Writer that converts `GtfDocument` back to text.

mod parse;
mod serialize;
pub mod types;

pub use parse::parse_gtf_content;
pub use serialize::serialize_gtf_document;
pub use types::{Glyph, GtfDocument, GtfHeader, Palette, Size};
