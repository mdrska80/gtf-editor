//! Parsing logic for the GTF text format.
//!
//! Uses a small state machine to walk through HEADER/Glyph blocks
//! and collects warnings for lenient bitmap/palette issues.
//!
//! Submodules:
//! - `state_handlers` – logic for each parser state transition
//! - `helpers` – low-level line parsers and validators

mod helpers;
mod state_handlers;

use crate::gtf::types::{Glyph, GtfDocument};

#[derive(Debug, PartialEq, Clone, Copy)]
pub(crate) enum ParseState
{
    Searching,
    InHeader,
    InDefaultPalette,
    InGlyphDefinition,
    InPalette,
    ExpectingDataKeyword,
    InBitmap,
    ExpectingEndGlyph,
}

pub(crate) struct ParseContext
{
    pub document: GtfDocument,
    pub state: ParseState,
    pub current_glyph: Option<Glyph>,
    pub current_glyph_name: Option<String>,
    pub bitmap_lines_collected: u32,
    pub found_palette_block: bool,
}

impl ParseContext
{
    fn new() -> Self
    {
        Self {
            document: GtfDocument::default(),
            state: ParseState::Searching,
            current_glyph: None,
            current_glyph_name: None,
            bitmap_lines_collected: 0,
            found_palette_block: false,
        }
    }
}

pub fn parse_gtf_content(content: &str) -> Result<GtfDocument, String>
{
    let mut ctx = ParseContext::new();

    for (line_num, line) in content.lines().enumerate()
    {
        let trimmed = line.trim();
        let current_line_num = line_num + 1;

        if trimmed.is_empty()
        {
            continue;
        }

        match ctx.state
        {
            ParseState::Searching =>
                state_handlers::handle_searching(&mut ctx, trimmed, current_line_num)?,
            ParseState::InHeader =>
                state_handlers::handle_in_header(&mut ctx, trimmed, current_line_num)?,
            ParseState::InDefaultPalette =>
                state_handlers::handle_in_default_palette(&mut ctx, trimmed, current_line_num)?,
            ParseState::InGlyphDefinition =>
                state_handlers::handle_in_glyph_definition(&mut ctx, trimmed, line, current_line_num)?,
            ParseState::InPalette =>
                state_handlers::handle_in_palette(&mut ctx, trimmed, current_line_num)?,
            ParseState::InBitmap =>
                state_handlers::handle_in_bitmap(&mut ctx, trimmed, current_line_num)?,
            ParseState::ExpectingDataKeyword =>
                state_handlers::handle_expecting_data(&mut ctx, trimmed, current_line_num)?,
            ParseState::ExpectingEndGlyph =>
                state_handlers::handle_expecting_end_glyph(&mut ctx, trimmed, current_line_num)?,
        }
    }

    state_handlers::finalize(ctx)
}
