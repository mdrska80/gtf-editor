/**
 * Composable for departure display canvas rendering.
 *
 * Handles all glyph rendering logic: single glyph painting, text measurement,
 * column-aligned text, inverted glyphs, and the full display composition
 * (header, departure rows, footer, grid).
 */

/**
 * Create a renderer bound to the given reactive dependencies.
 *
 * @param {Object} opts
 * @param {import('vue').Ref} opts.displayCanvas - ref to the <canvas> element
 * @param {import('vue').Ref<number>} opts.displayWidth
 * @param {import('vue').Ref<number>} opts.displayHeight
 * @param {import('vue').Ref<number>} opts.pixelScale
 * @param {import('vue').Ref<boolean>} opts.showGrid
 * @param {import('vue').Ref<boolean>} opts.showHeader
 * @param {import('vue').Ref<Array>} opts.headerLines
 * @param {import('vue').Ref<boolean>} opts.showFooter
 * @param {import('vue').Ref<string>} opts.footerText
 * @param {import('vue').Ref<Array>} opts.columns
 * @param {import('vue').Ref<Array>} opts.rows
 * @param {import('vue').ComputedRef} opts.processedDefaultPalette
 * @param {import('vue').ComputedRef} opts.glyphMap
 * @param {import('vue').ComputedRef<boolean>} opts.hasGlyphs
 */
export function useDepartureRenderer(opts)
{
  const {
    displayCanvas,
    displayWidth,
    displayHeight,
    pixelScale,
    showGrid,
    showHeader,
    headerLines,
    showFooter,
    footerText,
    columns,
    rows,
    processedDefaultPalette,
    glyphMap,
    hasGlyphs,
  } = opts;

  // ---------------------------------------------------------------
  // Palette helpers
  // ---------------------------------------------------------------

  function getGlyphPalette(glyph)
  {
    if (glyph.palette?.entries && Object.keys(glyph.palette.entries).length > 0)
    {
      return glyph.palette.entries;
    }
    const defaults = {};
    if (processedDefaultPalette.value)
    {
      for (const entry of processedDefaultPalette.value)
      {
        defaults[entry.char] = entry.color;
      }
    }
    return defaults;
  }

  // ---------------------------------------------------------------
  // Low-level glyph rendering
  // ---------------------------------------------------------------

  /**
   * Render a single glyph onto the canvas at display-pixel position (x, y).
   * Returns the glyph width in display pixels.
   */
  function renderGlyph(ctx, glyph, x, y, colorOverride = null)
  {
    if (!glyph || !glyph.bitmap || !glyph.size) return 0;

    const palette = getGlyphPalette(glyph);
    const scale = pixelScale.value;
    const glyphW = glyph.size.width;
    const glyphH = glyph.size.height;

    for (let row = 0; row < glyph.bitmap.length && row < glyphH; row++)
    {
      const line = glyph.bitmap[row];
      for (let col = 0; col < line.length && col < glyphW; col++)
      {
        const ch = line[col];
        let color = palette[ch] || null;
        if (colorOverride && color && color.toLowerCase() !== '#000000')
        {
          color = colorOverride;
        }
        if (color && color.toLowerCase() !== '#000000')
        {
          ctx.fillStyle = color;
          ctx.fillRect(
            (x + col) * scale,
            (y + row) * scale,
            scale,
            scale
          );
        }
      }
    }
    return glyphW;
  }

  /**
   * Render a glyph inverted (dark on white) for icon circles.
   */
  function renderGlyphBlackOnWhite(ctx, glyph, x, y)
  {
    if (!glyph || !glyph.bitmap || !glyph.size) return;
    const palette = getGlyphPalette(glyph);
    const scale = pixelScale.value;
    for (let row = 0; row < glyph.bitmap.length && row < glyph.size.height; row++)
    {
      const line = glyph.bitmap[row];
      for (let col = 0; col < line.length && col < glyph.size.width; col++)
      {
        const color = palette[line[col]] || null;
        if (color && color.toLowerCase() !== '#000000')
        {
          ctx.fillStyle = '#000000';
          ctx.fillRect((x + col) * scale, (y + row) * scale, scale, scale);
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // Text measurement & rendering
  // ---------------------------------------------------------------

  /**
   * Measure text width in display pixels without rendering.
   */
  function measureText(text, spacing = 1)
  {
    let w = 0;
    for (const char of text)
    {
      if (char === ' ')
      {
        const sg = glyphMap.value[' '];
        w += sg ? sg.size.width : 4;
      }
      else
      {
        const g = glyphMap.value[char];
        w += g ? g.size.width + spacing : 4;
      }
    }
    if (text.length > 0) w -= spacing; // remove trailing
    return w;
  }

  /**
   * Simple left-aligned text render, returns width consumed.
   */
  function renderText(ctx, text, startX, startY, colorOverride = null, spacing = 1)
  {
    let cursorX = startX;
    for (const char of text)
    {
      if (char === ' ')
      {
        const sg = glyphMap.value[' '];
        cursorX += sg ? sg.size.width : 4;
        continue;
      }
      const glyph = glyphMap.value[char];
      if (glyph)
      {
        renderGlyph(ctx, glyph, cursorX, startY, colorOverride);
        cursorX += glyph.size.width + spacing;
      }
      else
      {
        cursorX += 4;
      }
    }
    return cursorX - startX;
  }

  /**
   * Render text at (startX, startY) with alignment within a column region.
   */
  function renderTextInColumn(ctx, text, regionX, regionWidth, startY, align, colorOverride, spacing = 1)
  {
    const textW = measureText(text, spacing);
    let cursorX;
    if (align === 'right')
    {
      cursorX = regionX + regionWidth - textW;
    }
    else if (align === 'center')
    {
      cursorX = regionX + Math.floor((regionWidth - textW) / 2);
    }
    else
    {
      cursorX = regionX;
    }

    for (const char of text)
    {
      if (char === ' ')
      {
        const sg = glyphMap.value[' '];
        cursorX += sg ? sg.size.width : 4;
        continue;
      }
      const glyph = glyphMap.value[char];
      if (glyph)
      {
        renderGlyph(ctx, glyph, cursorX, startY, colorOverride);
        cursorX += glyph.size.width + spacing;
      }
      else
      {
        cursorX += 4;
      }
    }
  }

  // ---------------------------------------------------------------
  // Main display render
  // ---------------------------------------------------------------

  function renderDisplay()
  {
    const canvas = displayCanvas.value;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = pixelScale.value;
    const dispW = displayWidth.value;
    const dispH = displayHeight.value;

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pixel grid
    if (showGrid.value && scale > 1)
    {
      ctx.strokeStyle = 'rgba(80, 80, 80, 1)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= dispW; x++)
      {
        ctx.beginPath();
        ctx.moveTo(x * scale + 0.5, 0);
        ctx.lineTo(x * scale + 0.5, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= dispH; y++)
      {
        ctx.beginPath();
        ctx.moveTo(0, y * scale + 0.5);
        ctx.lineTo(canvas.width, y * scale + 0.5);
        ctx.stroke();
      }
    }

    if (!hasGlyphs.value)
    {
      ctx.fillStyle = '#444444';
      ctx.font = `${12 * scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('No font loaded. Open a GTF file.', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Determine glyph height for row spacing
    const sampleGlyph = Object.values(glyphMap.value)[0];
    const glyphHeight = sampleGlyph?.size?.height || 8;
    const rowSpacing = glyphHeight + 1;

    let currentY = 1;

    // --- Header ---
    if (showHeader.value && headerLines.value.length > 0)
    {
      for (const hLine of headerLines.value)
      {
        if (!hLine.text) continue;
        if (currentY + glyphHeight > dispH) break;

        // Station icon circle for the first header line
        if (hLine === headerLines.value[0])
        {
          const iconChar = hLine.text.charAt(0).toUpperCase();
          const iconSize = glyphHeight;
          const iconCenterX = (1 + iconSize / 2) * scale;
          const iconCenterY = (currentY + iconSize / 2) * scale;
          const iconRadius = (iconSize / 2 - 0.5) * scale;

          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(iconCenterX, iconCenterY, iconRadius, 0, Math.PI * 2);
          ctx.fill();

          const iconGlyph = glyphMap.value[iconChar];
          if (iconGlyph)
          {
            const gx = Math.round(1 + (iconSize - iconGlyph.size.width) / 2);
            const gy = Math.round(currentY + (iconSize - iconGlyph.size.height) / 2);
            renderGlyphBlackOnWhite(ctx, iconGlyph, gx, gy);
          }

          renderText(ctx, hLine.text, 2 + iconSize + 2, currentY, hLine.color || '#FFFFFF', 1);
        }
        else
        {
          renderText(ctx, hLine.text, 1, currentY, hLine.color || '#FFFFFF', 1);
        }
        currentY += rowSpacing;
      }

      // Separator
      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
      ctx.fillRect(0, currentY * scale, canvas.width, Math.max(1, scale * 0.5));
      currentY += 1;
    }

    // --- Departure Rows ---
    const footerReserved = showFooter.value ? rowSpacing + 2 : 0;

    for (const row of rows.value)
    {
      if (currentY + glyphHeight > dispH - footerReserved) break;

      for (let ci = 0; ci < columns.value.length && ci < row.cells.length; ci++)
      {
        const col = columns.value[ci];
        const cellText = row.cells[ci] || '';
        if (!cellText) continue;

        renderTextInColumn(
          ctx,
          cellText,
          col.x,
          col.width,
          currentY,
          col.align || 'left',
          col.color || '#FFFFFF',
          1
        );
      }

      currentY += rowSpacing;
    }

    // --- Footer ---
    if (showFooter.value && footerText.value)
    {
      currentY = dispH - glyphHeight - 1;
      ctx.fillStyle = 'rgba(128, 128, 128, 0.6)';
      ctx.fillRect(0, (currentY - 1) * scale, canvas.width, Math.max(1, scale * 0.5));
      renderText(ctx, footerText.value, 1, currentY, '#FFFFFF', 1);
    }
  }

  /**
   * Get the current glyph height (used by XML generation).
   */
  function getGlyphHeight()
  {
    const sampleGlyph = Object.values(glyphMap.value)[0];
    return sampleGlyph?.size?.height || 8;
  }

  return {
    renderDisplay,
    getGlyphHeight,
  };
}
