use super::RenderRequest;
use crate::gtf::types::Glyph;
use image::{Rgba, RgbaImage};
use std::collections::HashMap;

pub fn render_board(req: &RenderRequest) -> Result<Vec<u8>, String> {
    let scale = req.pixel_scale;
    let mut img = RgbaImage::new(req.display_width * scale, req.display_height * scale);

    // Fill background black
    for pixel in img.pixels_mut() {
        *pixel = Rgba([0, 0, 0, 255]);
    }

    // Grid (optional)
    if req.show_grid && scale > 1 {
        let grid_color = Rgba([80, 80, 80, 255]);
        for x in (0..img.width()).step_by(scale as usize) {
            for y in 0..img.height() {
                img.put_pixel(x, y, grid_color);
            }
        }
        for y in (0..img.height()).step_by(scale as usize) {
            for x in 0..img.width() {
                img.put_pixel(x, y, grid_color);
            }
        }
    }

    // Map character representations to glyph names for lookups
    let mut char_map: HashMap<String, &Glyph> = HashMap::new();
    for glyph in &req.gtf_data.glyphs {
        if let Some(ref char_repr) = glyph.char_repr {
            char_map.insert(char_repr.to_string(), glyph);
        }
        // Also map name as fallback
        char_map.insert(glyph.name.clone(), glyph);
    }

    let glyph_height = req
        .gtf_data
        .glyphs
        .first()
        .and_then(|g| g.size.as_ref())
        .map(|s| s.height)
        .unwrap_or(8) as i32;

    let row_spacing = glyph_height + 1;
    let mut current_y = 1;

    // --- Render Header ---
    if req.show_header {
        for h_line in &req.header_lines {
            if h_line.text.is_empty() {
                continue;
            }
            if current_y + glyph_height > req.display_height as i32 {
                break;
            }

            render_text(
                &mut img,
                &h_line.text,
                1,
                current_y,
                Some(&h_line.color),
                &char_map,
                scale,
            );
            current_y += row_spacing;
        }

        // Draw separator
        let sep_y = (current_y * scale as i32) as u32;
        if sep_y < img.height() {
            let sep_color = Rgba([128, 128, 128, 150]);
            let h = (scale as f32 * 0.5).max(1.0) as u32;
            for y in sep_y..std::cmp::min(sep_y + h, img.height()) {
                for x in 0..img.width() {
                    img.put_pixel(x, y, sep_color);
                }
            }
        }
        current_y += 1;
    }

    // --- Render Rows ---
    let footer_reserved = if req.show_footer { row_spacing + 2 } else { 0 };

    for row in &req.rows {
        if current_y + glyph_height > (req.display_height as i32 - footer_reserved) {
            break;
        }

        for (ci, col) in req.columns.iter().enumerate() {
            if ci >= row.cells.len() {
                break;
            }
            let cell_text = &row.cells[ci];
            if cell_text.is_empty() {
                continue;
            }

            render_text_in_column(
                &mut img,
                cell_text,
                col.x,
                col.width,
                current_y,
                &col.align,
                Some(&col.color),
                &char_map,
                scale,
            );
        }
        current_y += row_spacing;
    }

    // --- Render Footer ---
    if req.show_footer && !req.footer_text.is_empty() {
        let footer_y = req.display_height as i32 - glyph_height - 1;

        // Separator
        let sep_y = ((footer_y - 1) * scale as i32) as u32;
        if sep_y < img.height() {
            let sep_color = Rgba([128, 128, 128, 150]);
            for x in 0..img.width() {
                img.put_pixel(x, sep_y, sep_color);
            }
        }

        render_text(
            &mut img,
            &req.footer_text,
            1,
            footer_y,
            None,
            &char_map,
            scale,
        );
    }

    // Encode to PNG
    let mut buffer = std::io::Cursor::new(Vec::new());
    img.write_to(&mut buffer, image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;

    Ok(buffer.into_inner())
}

fn hex_to_rgba(hex: &str) -> Rgba<u8> {
    let hex = hex.trim_start_matches('#');
    if hex.len() == 6 {
        let r = u8::from_str_radix(&hex[0..2], 16).unwrap_or(255);
        let g = u8::from_str_radix(&hex[2..4], 16).unwrap_or(255);
        let b = u8::from_str_radix(&hex[4..6], 16).unwrap_or(255);
        Rgba([r, g, b, 255])
    } else if hex.len() == 3 {
        let r = u8::from_str_radix(&hex[0..1].repeat(2), 16).unwrap_or(255);
        let g = u8::from_str_radix(&hex[1..2].repeat(2), 16).unwrap_or(255);
        let b = u8::from_str_radix(&hex[2..3].repeat(2), 16).unwrap_or(255);
        Rgba([r, g, b, 255])
    } else {
        Rgba([255, 255, 255, 255])
    }
}

fn render_glyph(
    img: &mut RgbaImage,
    glyph: &Glyph,
    x: i32,
    y: i32,
    color_override: Option<&str>,
    scale: u32,
) {
    let override_rgba = color_override.map(hex_to_rgba);

    // Safely get size and palette
    let size = match glyph.size.as_ref() {
        Some(s) => s,
        None => return,
    };
    let palette = match glyph.palette.as_ref() {
        Some(p) => p,
        None => return,
    };

    for (row_idx, row_str) in glyph.bitmap.iter().enumerate() {
        for (col_idx, ch) in row_str.chars().enumerate() {
            if let Some(hex_color) = palette.entries.get(&ch) {
                if hex_color == "#000000" {
                    continue;
                }

                let mut pixel_color = hex_to_rgba(hex_color);

                // Logic: Only override if original is White
                if let Some(ovr) = override_rgba {
                    if hex_color.to_uppercase() == "#FFFFFF" {
                        pixel_color = ovr;
                    }
                }

                // Draw scaled pixel
                let start_x = (x + col_idx as i32) * scale as i32;
                let start_y = (y + row_idx as i32) * scale as i32;

                for dy in 0..scale {
                    for dx in 0..scale {
                        let px = start_x + dx as i32;
                        let py = start_y + dy as i32;
                        if px >= 0 && px < img.width() as i32 && py >= 0 && py < img.height() as i32
                        {
                            img.put_pixel(px as u32, py as u32, pixel_color);
                        }
                    }
                }
            }
        }
    }
}

fn measure_text(text: &str, char_map: &HashMap<String, &Glyph>) -> i32 {
    let mut width = 0;
    let spacing = 1;
    for (i, ch) in text.chars().enumerate() {
        let ch_str = ch.to_string();
        let w = if let Some(g) = char_map.get(&ch_str) {
            g.size.as_ref().map(|s| s.width).unwrap_or(4) as i32
        } else {
            4
        };
        width += w;
        if i < text.chars().count() - 1 {
            width += spacing;
        }
    }
    width
}

fn render_text(
    img: &mut RgbaImage,
    text: &str,
    start_x: i32,
    start_y: i32,
    color_override: Option<&str>,
    char_map: &HashMap<String, &Glyph>,
    scale: u32,
) -> i32 {
    let mut cursor_x = start_x;
    let spacing = 1;
    for ch in text.chars() {
        let ch_str = ch.to_string();
        if let Some(glyph) = char_map.get(&ch_str) {
            render_glyph(img, glyph, cursor_x, start_y, color_override, scale);
            let w = glyph.size.as_ref().map(|s| s.width).unwrap_or(4) as i32;
            cursor_x += w + spacing;
        } else {
            cursor_x += 4 + spacing;
        }
    }
    cursor_x - start_x
}

fn render_text_in_column(
    img: &mut RgbaImage,
    text: &str,
    region_x: i32,
    region_width: i32,
    start_y: i32,
    align: &str,
    color_override: Option<&str>,
    char_map: &HashMap<String, &Glyph>,
    scale: u32,
) {
    let text_w = measure_text(text, char_map);
    let mut cursor_x = match align {
        "right" => region_x + region_width - text_w,
        "center" => region_x + (region_width - text_w) / 2,
        _ => region_x,
    };

    let spacing = 1;
    for ch in text.chars() {
        let ch_str = ch.to_string();
        if let Some(glyph) = char_map.get(&ch_str) {
            render_glyph(img, glyph, cursor_x, start_y, color_override, scale);
            let w = glyph.size.as_ref().map(|s| s.width).unwrap_or(4) as i32;
            cursor_x += w + spacing;
        } else {
            cursor_x += 4 + spacing;
        }
    }
}
