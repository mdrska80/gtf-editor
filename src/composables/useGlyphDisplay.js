import { ref, computed } from 'vue';

// --- Constants --- (Moved from App.vue)
const commonLowercase = 'abcdefghijklmnopqrstuvwxyz';
const commonUppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const commonDigits = '0123456789';
const commonPunctuation = '!"#$%&\'()*+,-./:;<=>?@[\]^_`{|}~ ';
const allCommon = commonLowercase + commonUppercase + commonDigits + commonPunctuation;

const languageCharacterSets = {
  Czech: 'áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ' + allCommon,
  Slovak: 'áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ' + allCommon,
  Romanian: 'ăâîșțĂÂÎȘȚ' + allCommon,
  Hungarian: 'áéíóöőúüűÁÉÍÓÖŐÚÜŰ' + allCommon,
  Estonian: 'äõöüšžÄÕÖÜŠŽ' + allCommon,
  "Basic Latin + Digits": allCommon
};

export function useGlyphDisplay(reactiveGlyphs) {
  // --- State --- (Moved from App.vue)
  const isSimplePreviewMode = ref(true); // false = grouped list, true = simple preview grid

  // --- Functions --- (Moved from App.vue)
  function toggleSidebarView() {
    isSimplePreviewMode.value = !isSimplePreviewMode.value;
    console.log("GlyphDisplay: Toggled sidebar view to", isSimplePreviewMode.value ? 'simple' : 'grouped');
  }

  // --- Computed Properties --- (Moved from App.vue, depend on reactiveGlyphs)
  const sortedGlyphs = computed(() => {
    const glyphs = reactiveGlyphs.value || []; // Use the reactive input
    if (!glyphs || !Array.isArray(glyphs)) return [];
    
    const parseUnicode = (unicodeStr) => {
      if (!unicodeStr || !unicodeStr.startsWith('U+')) return Infinity;
      try { return parseInt(unicodeStr.substring(2), 16); } 
      catch (e) { console.warn(`Error parsing unicode: ${unicodeStr}`, e); return Infinity; }
    };
    // Create a copy before sorting
    return [...glyphs].sort((a, b) => parseUnicode(a.unicode) - parseUnicode(b.unicode));
  });

  const groupedGlyphs = computed(() => {
    const glyphsToSort = sortedGlyphs.value; // Use the computed sorted glyphs
    if (!glyphsToSort || glyphsToSort.length === 0) return [];

    const groups = { Uppercase: [], Lowercase: [], Digits: [], PunctuationSymbols: [], LanguageSpecific: [], Other: [], Undefined: [] };
    const groupOrder = ['Uppercase', 'Lowercase', 'Digits', 'PunctuationSymbols', 'LanguageSpecific', 'Other', 'Undefined'];
    const languageCharsSet = new Set(Object.values(languageCharacterSets).filter(set => set !== allCommon).join('').replace(new RegExp(`[${allCommon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), ''));
    
    const parseUnicode = (unicodeStr) => {
      if (!unicodeStr || !unicodeStr.startsWith('U+')) return null;
      try { return parseInt(unicodeStr.substring(2), 16); } catch (e) { return null; }
    };

    for (const glyph of glyphsToSort) {
      const codePoint = parseUnicode(glyph.unicode);
      const char = glyph.char_repr;
      if (codePoint === null) groups.Undefined.push(glyph);
      else if (codePoint >= 0x41 && codePoint <= 0x5A) groups.Uppercase.push(glyph);
      else if (codePoint >= 0x61 && codePoint <= 0x7A) groups.Lowercase.push(glyph);
      else if (codePoint >= 0x30 && codePoint <= 0x39) groups.Digits.push(glyph);
      else if ((codePoint >= 0x20 && codePoint <= 0x2F) || (codePoint >= 0x3A && codePoint <= 0x40) || (codePoint >= 0x5B && codePoint <= 0x60) || (codePoint >= 0x7B && codePoint <= 0x7E)) groups.PunctuationSymbols.push(glyph);
      else if (char && languageCharsSet.has(char)) groups.LanguageSpecific.push(glyph);
      else groups.Other.push(glyph);
    }
    return groupOrder.map(name => ({ name: name.replace(/([A-Z])/g, ' $1').trim(), glyphs: groups[name] })).filter(group => group.glyphs.length > 0);
  });

  // Expose state and methods
  return {
    isSimplePreviewMode,
    languageCharacterSets, // Expose if needed elsewhere (e.g., LanguageCheckDialog)
    sortedGlyphs,
    groupedGlyphs,
    toggleSidebarView,
  };
} 