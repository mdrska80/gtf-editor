import { ref, nextTick } from 'vue';

/**
 * Composable for departure display XML generation and parsing.
 *
 * Generates XML from display state and parses XML back to update
 * columns/rows (two-way binding with circular-update prevention).
 *
 * @param {Object} opts
 * @param {import('vue').Ref<number>} opts.displayWidth
 * @param {import('vue').Ref<number>} opts.displayHeight
 * @param {import('vue').Ref<boolean>} opts.showHeader
 * @param {import('vue').Ref<Array>} opts.headerLines
 * @param {import('vue').Ref<boolean>} opts.showFooter
 * @param {import('vue').Ref<string>} opts.footerText
 * @param {import('vue').Ref<Array>} opts.columns
 * @param {import('vue').Ref<Array>} opts.rows
 * @param {Function} opts.getGlyphHeight - returns current glyph height in pixels
 */
export function useDepartureXml(opts)
{
  const {
    displayWidth,
    displayHeight,
    showHeader,
    headerLines,
    showFooter,
    footerText,
    columns,
    rows,
    getGlyphHeight,
  } = opts;

  const xmlContent = ref('');
  const xmlParseError = ref('');

  // Flag to prevent circular updates: XML -> state -> XML
  let xmlUpdatingState = false;

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  function escapeXml(str)
  {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ---------------------------------------------------------------
  // XML Generation
  // ---------------------------------------------------------------

  /**
   * Generate XML from current display state.
   * Format: <ROOT><Clear/><Text X="" Y="" Width="" Font="0">text</Text>...</ROOT>
   */
  function generateXml()
  {
    const glyphHeight = getGlyphHeight();
    const rowSpacing = glyphHeight + 1;

    let lines = [];
    lines.push('<ROOT>');
    lines.push('  <Clear/>');

    let currentY = 1;

    // Header lines
    if (showHeader.value && headerLines.value.length > 0)
    {
      for (const hLine of headerLines.value)
      {
        if (!hLine.text) continue;
        lines.push(`  <Text X="0" Y="${currentY}" Width="${displayWidth.value}" Font="0">${escapeXml(hLine.text)}</Text>`);
        currentY += rowSpacing;
      }
      currentY += 1; // separator
    }

    // Departure rows
    for (const row of rows.value)
    {
      for (let ci = 0; ci < columns.value.length && ci < row.cells.length; ci++)
      {
        const col = columns.value[ci];
        const cellText = row.cells[ci] || '';
        if (!cellText) continue;

        let attrs = `X="${col.x}" Y="${currentY}" Width="${col.width}" Font="0"`;
        if (col.align === 'right')
        {
          attrs += ' Align="Right"';
        }
        else if (col.align === 'center')
        {
          attrs += ' Align="center"';
        }
        lines.push(`  <Text ${attrs}>${escapeXml(cellText)}</Text>`);
      }
      currentY += rowSpacing;
    }

    // Footer
    if (showFooter.value && footerText.value)
    {
      const footerY = displayHeight.value - glyphHeight - 1;
      lines.push(`  <Text X="0" Y="${footerY}" Width="${displayWidth.value}" Font="0">${escapeXml(footerText.value)}</Text>`);
    }

    lines.push('</ROOT>');
    return lines.join('\n');
  }

  // ---------------------------------------------------------------
  // XML Parsing -> State
  // ---------------------------------------------------------------

  /**
   * Parse XML and update display state from it.
   * Reconstructs rows based on Y grouping, columns from X/Width.
   */
  function parseXmlToState(xml)
  {
    try
    {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      const parseError = doc.querySelector('parsererror');
      if (parseError)
      {
        xmlParseError.value = 'Invalid XML';
        return;
      }

      const root = doc.documentElement;
      if (root.tagName !== 'ROOT')
      {
        xmlParseError.value = 'Expected root element <ROOT>';
        return;
      }

      const textElements = root.querySelectorAll('Text');
      if (textElements.length === 0)
      {
        xmlParseError.value = '';
        return;
      }

      // Group text elements by Y coordinate
      const yGroups = {};
      for (const el of textElements)
      {
        const x = parseInt(el.getAttribute('X') || '0', 10);
        const y = parseInt(el.getAttribute('Y') || '0', 10);
        const w = parseInt(el.getAttribute('Width') || '0', 10);
        const align = (el.getAttribute('Align') || 'left').toLowerCase();
        const text = el.textContent || '';

        if (!yGroups[y])
        {
          yGroups[y] = [];
        }
        yGroups[y].push({ x, y, width: w, align, text });
      }

      const yValues = Object.keys(yGroups).map(Number).sort((a, b) => a - b);

      // Build unique column definitions from X/Width combinations across all rows
      const colSignatures = new Map(); // key: "x:width" -> { x, width, align }
      for (const yVal of yValues)
      {
        for (const item of yGroups[yVal])
        {
          const key = `${item.x}:${item.width}`;
          if (!colSignatures.has(key))
          {
            colSignatures.set(key, { x: item.x, width: item.width, align: item.align });
          }
        }
      }

      // Sort columns by X
      const newColumns = Array.from(colSignatures.values()).sort((a, b) => a.x - b.x);

      // Build rows: for each Y group, find matching cells
      const newRows = [];
      for (const yVal of yValues)
      {
        const group = yGroups[yVal];
        const cells = newColumns.map((col) =>
        {
          const match = group.find(item => item.x === col.x && item.width === col.width);
          return match ? match.text : '';
        });
        newRows.push({ cells });
      }

      // Apply to state
      xmlUpdatingState = true;

      // Update columns (preserve labels and colors if columns match, otherwise generate)
      const updatedColumns = newColumns.map((nc) =>
      {
        // Try to find existing column by X position
        const existing = columns.value.find(c => c.x === nc.x);
        return {
          label: existing?.label || `X${nc.x}`,
          x: nc.x,
          width: nc.width,
          align: nc.align || 'left',
          color: existing?.color || '#FFFFFF',
        };
      });

      columns.value = updatedColumns;
      rows.value = newRows;

      xmlParseError.value = '';

      nextTick(() =>
      {
        xmlUpdatingState = false;
      });
    }
    catch (err)
    {
      xmlParseError.value = `Error: ${err.message}`;
    }
  }

  // ---------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------

  function onXmlInput()
  {
    parseXmlToState(xmlContent.value);
  }

  /**
   * Regenerate XML from state (called when state changes,
   * unless XML triggered the change).
   */
  function updateXmlFromState()
  {
    if (xmlUpdatingState) return;
    xmlContent.value = generateXml();
  }

  return {
    xmlContent,
    xmlParseError,
    onXmlInput,
    updateXmlFromState,
  };
}
