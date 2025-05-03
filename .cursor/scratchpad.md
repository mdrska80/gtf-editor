# GTF Editor Project Scratchpad

## Background and Motivation

- **Project Type:** Frontend application likely for editing GTF (Glyph/Font?) files.
- **Technology Stack:** Vue 3, Vite, Vuetify (UI library), Tauri (for potential desktop builds).
- **Initial Goal:** Understand the project structure, how to run it, and propose potential next steps or features.
- **Current State:** Basic understanding of the tech stack and how to run the development server (`npm run dev`) or Tauri app (`npm run tauri dev`) after `npm install`.

## Key Challenges and Analysis

- **Understanding GTF:** (Status: Done)
- **Tauri Integration:** (Confirmed: Tauri is used for file dialogs and backend Rust logic.)
- **UI Implementation:** **(Update: Core UI components (Header Editor, Glyph Editor, Palette Editor, Bitmap Grid, File Ops, Language Check, Glyph List/Preview) are implemented and functional.)**
- **State Management:** (Update: State managed in `App.vue` via `ref` and computed properties, passed down via props, updates handled via emitted events. Seems functional for current features.)
- **Incomplete Features:** **(Update: Based on user feedback and re-evaluation, all core features including Bitmap Resizing seem to be implemented. Focus shifts to refinements and new features.)**
- **Defining "Beautiful/Vibrant/Alive":** These terms are subjective. We need to translate them into concrete design choices (colors, spacing, animations, interactions).
- **Technology Stack:** **(Confirmed: Vue 3, Vite, Vuetify 3)** The project uses Vite, Vue 3, and the Vuetify 3 component library. This means we should leverage Vuetify's theming capabilities (including built-in light/dark mode support) and potentially customize its components rather than starting CSS from scratch. Animations might be handled via Vuetify's transitions or custom CSS. The presence of Tauri suggests a desktop app context, which might influence some choices (e.g., native-like elements or custom).
- **Global Application:** Applying styles globally requires careful planning. Vuetify's theme system helps, but we need to ensure custom styles integrate well and don't conflict.
- **Theme Switching:** Vuetify provides mechanisms for theme switching, simplifying this task. We need to configure the light/dark palettes within Vuetify's theme settings.

## High-level Task Breakdown

1.  **Setup & Run:** Ensure the project can be installed (`npm install`) and run locally (`npm run dev`).
    - *Success Criteria:* The application loads successfully in the browser without errors.
2.  **Understand GTF Spec:** **(Done)**
    - *Success Criteria:* Be able to explain the basic structure and purpose of the GTF format. **(Achieved)**
3.  **Explore UI & Code:** **(Done - Re-analysis complete, confirming implementation status accurately)**
    - *Success Criteria:* Identify the main views/components and confirm implemented/missing features compared to `SPECIFICATION.md` and code analysis.
4.  **(Revised Again) Implement Missing Core Features:**
    a.  **Bitmap Resizing Logic:** Connect `SIZE` metadata changes (likely in `GlyphMetadataEditor.vue` or `GlyphEditor.vue`) to update the bitmap data array (padding with '.' or cropping). This logic likely belongs in the `updateGlyphData` function within `App.vue` when the `field` is `size`. **(Update: User confirms this IS implemented.)**
5.  **(Refinement Task) Optimize Glyph Palette Serialization:** Modify Rust saving logic to omit glyph palette entries that are identical to the header's default palette.
    - *Success Criteria:* Saved GTF files are smaller and only contain overriding palette entries within glyphs.
6.  **(Optional/Future) Implement Advanced Features & Refinements:**
    *   **Activate Text Preview Bar:** Uncomment and ensure `GlyphPreviewBar.vue` works for rendering sample text.
    *   **Search/Filter Glyphs:** Add search functionality to the sidebar glyph list.
    *   **Import/Export:** Add options to import/export glyphs or fonts.
    *   **Advanced Drawing Tools:** Implement Fill, Line, etc. in `BitmapGrid.vue`.
    *   **Kerning/Spacing Editor:** Add UI and data structures for kerning.
    *   **Clipboard Support:** Copy/paste glyph bitmap data.
    *   **Theming/UI Customization:** More theme options.
    *   **Improved Language Check:** Add more languages or custom sets.
    *   Add tests (Unit/Integration for both frontend and backend).
    *   Implement remaining `SPECIFICATION.md` items if desired (e.g., color picker for PaletteEditor).

## Project Status Board

- [ ] Setup & Run
- [x] Understand GTF Spec
- [x] Explore UI & Code (Accurate)
- **Core Missing Features:**
    - [x] Implement New File Functionality **(Verified Implemented in `App.vue`)**
    - [x] Implement Add/Remove Glyphs **(Verified Implemented in `App.vue`)**
    - [x] Implement Header Editing Logic **(Verified Implemented via `HeaderEditor.vue` emitting to `App.vue`)**
    - [x] Implement Bitmap Resizing Logic **(Confirmed Implemented by User)**
- **Refinements & New Features:**
    - [ ] Optimize Glyph Palette Serialization (Current Task)
    - [ ] Activate Text Preview Bar
    - [ ] Implement Search/Filter Glyphs
    - [ ] Implement Undo/Redo
    - [ ] Implement Import/Export
    - [ ] Implement Advanced Drawing Tools
    - [ ] Implement Kerning/Spacing Editor
    - [ ] Implement Clipboard Support
    - [ ] Add Theming/UI Customization
    - [ ] Add Improved Language Check
    - [ ] Add Tests
    - [ ] Add Color Picker
- [x] Investigate Frontend Stack

## Executor's Feedback or Assistance Requests

- Starting task: Optimize Glyph Palette Serialization.
- Core styling (Vuetify theme config + toggle) is implemented in `src/main.js` and `src/App.vue`.

## Lessons

*(Learnings and reusable notes will be documented here)*
- GTF v2 is a text format with HEADER/GLYPH blocks. Specification files: `glyph_format_spec_v2.md`, `SPECIFICATION.md`.
- Core parsing/saving logic exists in Rust (`src-tauri/src/gtf.rs`, `src-tauri/src/lib.rs`) via `load_gtf_file` and `save_gtf_file` Tauri commands.
- Visual bitmap editor `BitmapGrid.vue` IS implemented.
- `SPECIFICATION.md` checklist is outdated. **(Crucial: Need to read component logic AND function calls like `updateGlyphData` in `App.vue` thoroughly.)**
- File Ops (Open, Save, Save As, New File) implemented in `App.vue` / `FileOperations.vue`.
- Add/Remove Glyphs implemented in `App.vue`.
- Header/Glyph Metadata/Palette editing logic implemented via component events handled in `App.vue`.
- Sidebar glyph list provides Character Map/Overview functionality with grouping and preview (`App.vue`, `GlyphPreview.vue`).
- Bitmap resizing logic IS implemented (User confirmed).
- **All core spec features seem implemented.** Focus is now on refinement/new features.
- Identified frontend stack: Vue 3, Vite, Vuetify 3.

# GTF Editor UI Overhaul Plan

## Background and Motivation

The user wants to significantly enhance the visual appeal of the GTF editor application. The current UI is perceived as basic or "boring". The goal is to create a more "beautiful", "vibrant", and "alive" user interface with a modern look and feel. This includes implementing a global CSS strategy, adding animations/transitions, and supporting both light and dark themes. A demo page will be created first to showcase and refine the new style before applying it globally.

## Key Challenges and Analysis

- **Defining "Beautiful/Vibrant/Alive":** These terms are subjective. We need to translate them into concrete design choices (colors, spacing, animations, interactions).
- **Technology Stack:** **(Confirmed: Vue 3, Vite, Vuetify 3)** The project uses Vite, Vue 3, and the Vuetify 3 component library. This means we should leverage Vuetify's theming capabilities (including built-in light/dark mode support) and potentially customize its components rather than starting CSS from scratch. Animations might be handled via Vuetify's transitions or custom CSS. The presence of Tauri suggests a desktop app context, which might influence some choices (e.g., native-like elements or custom).
- **Global Application:** Applying styles globally requires careful planning. Vuetify's theme system helps, but we need to ensure custom styles integrate well and don't conflict.
- **Theme Switching:** Vuetify provides mechanisms for theme switching, simplifying this task. We need to configure the light/dark palettes within Vuetify's theme settings.

## High-level Task Breakdown (Initial Plan)

1.  **Investigate Frontend Stack:** Determine the specific framework (if any) used within `src/`.
    - *Success Criteria:* Identify the main frontend library/framework being used (e.g., React, Vue, Svelte, plain JS). **(Done: Vue 3, Vite, Vuetify 3)**
2.  **Define Design System:**
    - Choose a CSS strategy (e.g., CSS Variables + global stylesheet, Tailwind CSS, etc.). **(Decision: Leverage Vuetify 3 Theming)**
    - Define color palettes (light & dark modes): primary, secondary, accent, background, text colors. **(Proposed: "Moon & Star" based - see below)**
    - Select typography (fonts, sizes, weights). **(Proposed: "Inter" font, standard scales)**
    - Outline animation/transition philosophy (e.g., timing, easing functions, properties to animate). **(Proposed: Subtle CSS transitions, ~200ms ease-in-out)**
    - *Success Criteria:* Documented decisions on CSS strategy, color palettes, typography, and animation philosophy. **(Proposal documented below, pending review)**

    **Proposed "Moon & Star" Design System Details:**

    *   **Colors (Light Theme):**
        *   `primary`: `#2e4a80` (Medium Blue)
        *   `secondary`: `#60a5fa` (Light Blue)
        *   `accent`: `#d94680` (Pink/Magenta)
        *   `background`: `#f8fafc` (Off-white)
        *   `surface`: `#ffffff` (White)
        *   `warning`: `#facc15` (Gold/Amber)
        *   `error`, `info`, `success`: Standard defaults
    *   **Colors (Dark Theme):**
        *   `primary`: `#60a5fa` (Light Blue)
        *   `secondary`: `#f4a27f` (Peach/Salmon)
        *   `accent`: `#d94680` (Pink/Magenta)
        *   `background`: `#0f172a` (Very Dark Blue)
        *   `surface`: `#1a2a4d` (Dark Blue)
        *   `warning`: `#facc15` (Gold/Amber)
        *   `error`, `info`, `success`: Standard lighter defaults
    *   **Typography:**
        *   Font Family: `Inter` (fallback: system sans-serif)
        *   Scale: Standard Vuetify defaults initially.
    *   **Animation/Transitions:**
        *   Style: Subtle and functional for standard interactions (hover, focus, etc.). **Opportunity for more distinct/"extravagant" animations for specific events** (e.g., modals, loading, key confirmations) to be defined contextually.
        *   Method: CSS `transition` property (`all 0.2s ease-in-out`) for standard interactions. Potentially CSS keyframe animations or Vuetify transitions for more complex effects.
        *   Targets: Interactive elements on state changes. Specific components/actions for more pronounced animations.

3.  **Setup Core Styling:**
    - Implement the chosen CSS strategy foundation (e.g., setup CSS variables, install Tailwind). **(Task: Configure Vuetify Theme) - Done**
    - Create the basic light/dark theme switching mechanism (e.g., a button or based on system preference). **(Task: Add theme toggle) - Done**
    - *Success Criteria:* Basic theme switching is functional; core CSS structure is in place. **(Achieved)**
4.  **Create Demo Page:**
    - Create a new route or HTML file (`demo.html` or similar) dedicated to showcasing UI elements. **(Decision: Created `UIDemoPage.vue` component and added toggle button/logic in `App.vue`)**
    - *Success Criteria:* A blank demo page is accessible within the application or standalone. **(Achieved - Demo page component created and toggle mechanism implemented)**
5.  **Style Basic Elements (Demo):**
    - Apply the new global styles and theme variables to basic HTML elements (body, headings, paragraphs, links) on the demo page.
    - *Success Criteria:* Basic elements on the demo page reflect the light/dark themes correctly.
6.  **Style Common Components (Demo):**
    - Create and style common UI components (e.g., Button, Input, Card, Modal) on the demo page using the new design system.
    - Add subtle animations/transitions to interactive elements (hover, focus, active states).
    - *Success Criteria:* Key UI components are implemented and styled according to the design system on the demo page, demonstrating both themes and basic animations.
7.  **User Review & Refinement:** Present the demo page to the user for feedback and iterate on the design.
    - *Success Criteria:* User approves the general direction of the new UI style based on the demo page.
8.  **(Future) Global Application:** Plan the phased rollout of the new styles across the rest of the application.

## Project Status Board

- [x] Investigate Frontend Stack
- [x] Define Design System
- [x] Setup Core Styling
- [x] Create Demo Page **(Implemented toggle button and logic in `App.vue`)**
- [-] Style Basic Elements (Demo) *(Skipped as per user request)*
- [-] Style Common Components (Demo) *(Skipped as per user request)*
- [-] User Review & Refinement *(Skipped as per user request)*
- [ ] **(In Progress)** Global Application - Checked & fixed theme compatibility in child components.

## Executor's Feedback or Assistance Requests

- **Completed:** Checked theme compatibility for `HeaderEditor`, `GlyphEditor`, `PaletteEditor`, `GlyphMetadataEditor`, `BitmapGrid`, `BitmapTextView`, `GlyphTextView`, `GlyphPreview`, `FileOperations`, `LanguageCheckDialog`. Applied fixes using theme variables where needed.
- **Request:** Please run the application and test the theme toggle. Verify that all main editor components adapt correctly to both light and dark modes without visual issues.

## Lessons

- Identified frontend stack: Vue 3, Vite, Vuetify 3.
- **Lesson:** Extreme care must be taken when editing existing complex components like `App.vue`. Always verify edits preserve existing functionality and structure. If unsure, revert or ask for confirmation before proceeding. Prefer smaller, targeted edits. 
- **Lesson:** When applying themes globally, check child components for hardcoded colors/styles (backgrounds, borders, text colors) in both `<template>` (inline styles) and `<style scoped>`. Replace with theme variables (e.g., `rgb(var(--v-theme-surface))`, `rgb(var(--v-theme-error))`) or `currentColor` where appropriate for consistency. 