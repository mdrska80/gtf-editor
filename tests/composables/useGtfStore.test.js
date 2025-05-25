import { describe, it, expect, beforeEach } from 'vitest';
import { useGtfStore } from '@/composables/useGtfStore';
import { createTestEnvironment, createSampleGtfData } from '../setup';

describe('useGtfStore', () => {
  let store;
  let sampleData;

  beforeEach(() => {
    createTestEnvironment();
    store = useGtfStore();
    sampleData = createSampleGtfData();
    // Reset to clean state
    store.newFile();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      expect(store.gtfData.value).toEqual({ header: {}, glyphs: [] });
      expect(store.currentFilePath.value).toBe(null);
      expect(store.currentView.value).toBe('header');
      expect(store.selectedGlyphName.value).toBe(null);
      expect(store.selectedGlyphData.value).toBe(null);
    });
  });

  describe('Data Management', () => {
    it('should set GTF data correctly', () => {
      store.setGtfData(sampleData, '/test/path.gtf', 'glyph', 'A');

      expect(store.gtfData.value).toEqual(sampleData);
      expect(store.currentFilePath.value).toBe('/test/path.gtf');
      expect(store.currentView.value).toBe('glyph');
      expect(store.selectedGlyphName.value).toBe('A');
    });

    it('should handle null data gracefully', () => {
      store.setGtfData(null);

      expect(store.gtfData.value).toEqual({ header: {}, glyphs: [] });
      expect(store.currentFilePath.value).toBe(null);
      expect(store.currentView.value).toBe('header');
    });

    it('should create new file with clean state', () => {
      // First set some data
      store.setGtfData(sampleData, '/test/path.gtf', 'glyph', 'A');
      
      // Then create new file
      store.newFile();

      expect(store.gtfData.value).toEqual({ header: {}, glyphs: [] });
      expect(store.currentFilePath.value).toBe(null);
      expect(store.currentView.value).toBe('header');
      expect(store.selectedGlyphName.value).toBe(null);
    });
  });

  describe('View Navigation', () => {
    beforeEach(() => {
      store.setGtfData(sampleData);
    });

    it('should select header view', () => {
      store.selectGlyph('A'); // First select a glyph
      store.selectHeader();

      expect(store.currentView.value).toBe('header');
      expect(store.selectedGlyphName.value).toBe(null);
    });

    it('should select glyph view', () => {
      store.selectGlyph('A');

      expect(store.currentView.value).toBe('glyph');
      expect(store.selectedGlyphName.value).toBe('A');
      expect(store.selectedGlyphData.value).toEqual(sampleData.glyphs[0]);
    });

    it('should return null for non-existent glyph', () => {
      store.selectGlyph('NonExistent');

      expect(store.selectedGlyphName.value).toBe('NonExistent');
      expect(store.selectedGlyphData.value).toBe(null);
    });
  });

  describe('Glyph Operations', () => {
    beforeEach(() => {
      store.setGtfData(sampleData);
    });

    it('should add new glyph with default properties', () => {
      const initialCount = store.gtfData.value.glyphs.length;
      
      store.addGlyph();

      expect(store.gtfData.value.glyphs).toHaveLength(initialCount + 1);
      
      const newGlyph = store.gtfData.value.glyphs[initialCount];
      expect(newGlyph.name).toBe('NewGlyph1');
      expect(newGlyph.size).toEqual({ width: 5, height: 7 });
      expect(newGlyph.bitmap).toHaveLength(7);
      expect(newGlyph.bitmap[0]).toBe('.....');
      expect(store.currentView.value).toBe('glyph');
      expect(store.selectedGlyphName.value).toBe('NewGlyph1');
    });

    it('should generate unique names for new glyphs', () => {
      store.addGlyph(); // NewGlyph1
      store.addGlyph(); // NewGlyph2

      const glyphNames = store.gtfData.value.glyphs.map(g => g.name);
      expect(glyphNames).toContain('NewGlyph1');
      expect(glyphNames).toContain('NewGlyph2');
    });

    it('should use header default size for new glyphs', () => {
      store.updateHeaderData({ 
        field: 'default_size', 
        value: { width: 8, height: 10 } 
      });
      
      store.addGlyph();

      const newGlyph = store.gtfData.value.glyphs[store.gtfData.value.glyphs.length - 1];
      expect(newGlyph.size).toEqual({ width: 8, height: 10 });
      expect(newGlyph.bitmap).toHaveLength(10);
      expect(newGlyph.bitmap[0]).toBe('........');
    });

    it('should use header default palette for new glyphs', () => {
      const defaultPalette = { entries: { '#': '#FF0000', '.': '#000000', 'X': '#00FF00' } };
      store.updateHeaderData({ 
        field: 'default_palette', 
        value: defaultPalette 
      });
      
      store.addGlyph();

      const newGlyph = store.gtfData.value.glyphs[store.gtfData.value.glyphs.length - 1];
      expect(newGlyph.palette).toEqual(defaultPalette);
    });

    it('should remove selected glyph', () => {
      store.selectGlyph('A');
      const initialCount = store.gtfData.value.glyphs.length;
      
      store.removeGlyph();

      expect(store.gtfData.value.glyphs).toHaveLength(initialCount - 1);
      expect(store.gtfData.value.glyphs.find(g => g.name === 'A')).toBeUndefined();
      expect(store.currentView.value).toBe('header');
      expect(store.selectedGlyphName.value).toBe(null);
    });

    it('should handle removing non-existent glyph gracefully', () => {
      store.selectGlyph('NonExistent');
      const initialCount = store.gtfData.value.glyphs.length;
      
      store.removeGlyph();

      expect(store.gtfData.value.glyphs).toHaveLength(initialCount);
      expect(store.currentView.value).toBe('header');
    });
  });

  describe('Header Updates', () => {
    beforeEach(() => {
      store.setGtfData(sampleData);
    });

    it('should update simple header fields', () => {
      store.updateHeaderData({ field: 'font_name', value: 'New Font Name' });
      store.updateHeaderData({ field: 'version', value: '2.0' });

      expect(store.gtfData.value.header.font_name).toBe('New Font Name');
      expect(store.gtfData.value.header.version).toBe('2.0');
    });

    it('should handle empty string values as null', () => {
      store.updateHeaderData({ field: 'description', value: '' });
      store.updateHeaderData({ field: 'font_name', value: '   ' });

      expect(store.gtfData.value.header.description).toBe(null);
      expect(store.gtfData.value.header.font_name).toBe(null);
    });

    it('should update default palette', () => {
      const newPalette = { entries: { '#': '#FF0000', '.': '#000000', 'X': '#00FF00' } };
      
      store.updateHeaderData({ field: 'default_palette', value: newPalette });

      expect(store.gtfData.value.header.default_palette).toEqual(newPalette);
    });

    it('should handle invalid palette data', () => {
      store.updateHeaderData({ field: 'default_palette', value: 'invalid' });

      expect(store.gtfData.value.header.default_palette).toEqual({ entries: {} });
    });

    it('should update default size', () => {
      const newSize = { width: 10, height: 12 };
      
      store.updateHeaderData({ field: 'default_size', value: newSize });

      expect(store.gtfData.value.header.default_size).toEqual(newSize);
    });

    it('should handle invalid size data', () => {
      store.updateHeaderData({ field: 'default_size', value: 'invalid' });

      expect(store.gtfData.value.header.default_size).toBe(null);
    });
  });

  describe('Glyph Updates', () => {
    beforeEach(() => {
      store.setGtfData(sampleData);
      store.selectGlyph('A');
    });

    it('should update glyph name and auto-populate character data', () => {
      // First clear unicode so it can be auto-populated
      store.updateGlyphData({ field: 'unicode', value: '' });
      store.updateGlyphData({ field: 'name', value: 'C' });

      const glyphData = store.selectedGlyphData.value;
      expect(glyphData.name).toBe('C');
      expect(glyphData.char_repr).toBe('C');
      expect(glyphData.unicode).toBe('U+0043');
      expect(store.selectedGlyphName.value).toBe('C');
    });

    it('should update character representation and auto-populate unicode', () => {
      // Clear existing unicode first
      store.updateGlyphData({ field: 'unicode', value: '' });
      store.updateGlyphData({ field: 'char_repr', value: 'Z' });

      const glyphData = store.selectedGlyphData.value;
      expect(glyphData.char_repr).toBe('Z');
      expect(glyphData.unicode).toBe('U+005A');
    });

    it('should not auto-populate unicode when it already exists', () => {
      store.updateGlyphData({ field: 'char_repr', value: 'Z' });

      const glyphData = store.selectedGlyphData.value;
      expect(glyphData.unicode).toBe('U+0041'); // Should remain as original
    });

    it('should update unicode manually', () => {
      store.updateGlyphData({ field: 'unicode', value: 'U+1234' });

      expect(store.selectedGlyphData.value.unicode).toBe('U+1234');
    });

    it('should clear unicode with empty string', () => {
      store.updateGlyphData({ field: 'unicode', value: '' });

      expect(store.selectedGlyphData.value.unicode).toBe(null);
    });

    it('should update glyph size', () => {
      const newSize = { width: 8, height: 10 };
      store.updateGlyphData({ field: 'size', value: newSize });

      expect(store.selectedGlyphData.value.size).toEqual(newSize);
    });

    it('should update glyph palette', () => {
      const newPalette = { entries: { '#': '#00FF00', '.': '#000000' } };
      store.updateGlyphData({ field: 'palette', value: newPalette });

      expect(store.selectedGlyphData.value.palette).toEqual(newPalette);
    });

    it('should update bitmap data', () => {
      const newBitmap = ['#####', '#...#', '#...#', '#####', '.....', '.....', '.....'];
      store.updateGlyphData({ field: 'bitmap', value: newBitmap });

      expect(store.selectedGlyphData.value.bitmap).toEqual(newBitmap);
    });

    it('should apply default palette from header', () => {
      const headerPalette = { entries: { '#': '#FF0000', '.': '#000000', 'X': '#0000FF' } };
      store.updateHeaderData({ field: 'default_palette', value: headerPalette });
      
      store.updateGlyphData({ action: 'use_default_palette' });

      expect(store.selectedGlyphData.value.palette).toEqual(headerPalette);
    });

    it('should handle use_default_palette when no header palette exists', () => {
      // The glyph starts with a palette from the sample data
      const originalPalette = store.selectedGlyphData.value.palette;
      // Verify it has some initial state (from sample data)
      expect(originalPalette).toBeDefined();
      expect(originalPalette.entries).toBeDefined();
      
      // Clear header palette (this sets it to { entries: {} })
      store.updateHeaderData({ field: 'default_palette', value: null });
      
      store.updateGlyphData({ action: 'use_default_palette' });

      // When header palette is empty, the glyph palette gets set to empty entries
      expect(store.selectedGlyphData.value.palette).toEqual({ entries: {} });
    });
  });

  describe('Character Helper Functions', () => {
    beforeEach(() => {
      store.setGtfData(sampleData);
    });

    it('should add glyph for character', () => {
      const initialCount = store.gtfData.value.glyphs.length;
      
      store.addGlyphForChar('Z');

      expect(store.gtfData.value.glyphs).toHaveLength(initialCount + 1);
      
      const newGlyph = store.gtfData.value.glyphs[initialCount];
      expect(newGlyph.name).toBe('Z');
      expect(newGlyph.char_repr).toBe('Z');
      expect(newGlyph.unicode).toBe('U+005A');
      expect(store.selectedGlyphName.value).toBe('Z');
      expect(store.currentView.value).toBe('glyph');
    });

    it('should select existing glyph for character if it exists', () => {
      store.addGlyphForChar('A'); // Should select existing 'A' glyph

      expect(store.selectedGlyphName.value).toBe('A');
      expect(store.currentView.value).toBe('glyph');
      // Should not add a duplicate
      const aGlyphs = store.gtfData.value.glyphs.filter(g => g.name === 'A');
      expect(aGlyphs).toHaveLength(1);
    });
  });
}); 