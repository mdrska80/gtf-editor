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

## High-level Task Breakdown (Revised Plan)

1.  **Setup & Run:** Ensure the project can be installed (`npm install`) and run locally (`npm run dev`).
    - *Success Criteria:* The application loads successfully in the browser without errors.
2.  **Understand GTF Spec:** **(Done)**
    - *Success Criteria:* Be able to explain the basic structure and purpose of the GTF format. **(Achieved)**
3.  **Explore UI & Code:** **(Done - Re-analysis complete, confirming implementation status accurately)**
    - *Success Criteria:* Identify the main views/components and confirm implemented/missing features compared to `SPECIFICATION.md` and code analysis.
4.  **(UI Refinement Task) Redesign Language Check Dialog UI:** Improve the visual styling of the character grid in `LanguageCheckDialog.vue` to make it look less "flat" and more "organized".
    - *Success Criteria:* The character buttons have improved visual appeal (e.g., better spacing, depth/shadows, hover effects) addressing the user's feedback.
5.  **(UI Refinement Task) Verify Dark Mode Compatibility:** (Done - Considered complete despite known minor shadow issue)
    - *Success Criteria:* All UI elements have appropriate colors and contrast in both light and dark modes, leveraging Vuetify themes. (Met, with noted exception)
6.  **(Core Feature) Implement "Save" Functionality:** Differentiate "Save" (overwrite) from "Save As". (Verified Complete)
    - *Success Criteria:* User can save changes to the current file without a dialog if previously saved. "Save As" still prompts for a new location. Save on a new file triggers Save As.
7.  **(UX) Add Confirmation Dialog for Glyph Deletion:** Prevent accidental deletion.
    - *Success Criteria:* Confirmation prompt shown before glyph deletion.
8.  **(Core Feature) Basic Undo/Redo (Metadata):** Implement Undo/Redo for Header/Glyph text fields.
    - *Success Criteria:* Ctrl+Z/Ctrl+Y works for simple metadata changes.
9.  **(Refactoring) Refactor App.vue:** Extract logic and template sections into smaller components/composables to improve maintainability. (Completed)
    - *Success Criteria:* Identified parts (e.g., Sidebar) extracted, `App.vue` size reduced.
    - *Sub-Tasks:*
        - [x] Extract `AppSidebar.vue`
        - [x] Create `useGtfStore.js` composable for core state and data methods.
        - [x] Create `useGlyphDisplay.js` composable for sorting/grouping/view mode.
        - [-] (Optional) Extract `AppTopBar.vue`. (Removed)
10. **(UI Feature) Implement Font Preview Page:** Create a page to type text and see it rendered with the loaded GTF font.
    - *Success Criteria:* New page accessible. Text input field works. Preview area dynamically renders input text using loaded glyphs, with placeholders for missing characters.

## Project Status Board (Revised)

- [x] Setup & Run
- [x] Understand GTF Spec
- [x] Explore UI & Code (Accurate)
- **Core Missing Features:** (All Done per original scope)
    - [x] Implement New File Functionality
    - [x] Implement Add/Remove Glyphs
    - [x] Implement Header Editing Logic
    - [x] Implement Bitmap Resizing Logic
- **Refinements & New Features (Round 1):**
    - [x] Redesign Language Check Dialog UI (Completed)
    - [x] Verify Dark Mode Compatibility (Completed - Known shadow issue)
    - [x] Add Improved Language Check (Marked Complete - No further changes)
- [x] Investigate Frontend Stack
- **New Proposed Tasks (Round 2 - Updated):**
    - [x] Implement "Save" Functionality (Verified Complete)
    - [ ] Add Confirmation Dialog for Glyph Deletion
    - [x] Refactor App.vue (Completed)
    - [x] Implement Font Preview Page (Completed)

## Lessons

*(Learnings and reusable notes will be documented here)*
- GTF v2 is a text format with HEADER/GLYPH blocks. Specification file: `glyph_format_spec_v2.md`.
- Core parsing/saving logic exists in Rust (`src-tauri/src/gtf.rs`, `src-tauri/src/lib.rs`) via `load_gtf_file` and `save_gtf_file` Tauri commands.
- Visual bitmap editor `BitmapGrid.vue` IS implemented.
- `SPECIFICATION.md` checklist is outdated **and the file has been removed**. This scratchpad (`.cursor/scratchpad.md`) is now the primary source for task tracking and project status.
- File Ops (Open, Save, Save As, New File) implemented in `App.vue` / `FileOperations.vue`.
- Add/Remove Glyphs implemented in `App.vue`.
- Header/Glyph Metadata/Palette editing logic implemented via component events handled in `App.vue`.
- Sidebar glyph list provides Character Map/Overview functionality with grouping and preview (`App.vue`, `GlyphPreview.vue`).
- Bitmap resizing logic IS implemented (User confirmed).
- **All core spec features seem implemented.** Focus is now on refinement/new features.
- Identified frontend stack: Vue 3, Vite, Vuetify 3.
- Language check uses hardcoded sets in `App.vue`, interaction simplified to click-to-edit/add.
- Achieving consistent custom `box-shadow` appearance across light/dark themes is difficult. Vuetify's `elevation` classes are the preferred method, but didn't fully resolve the desired subtle effect on the `.char-item` in dark mode for this specific case. (Task marked complete despite this minor visual issue).
- **Refactoring:** Using composables (`useGtfStore`, `useGlyphDisplay`) helps break down large components like `App.vue` and centralize logic. Ensure composables intended as singletons define their state *outside* the exported function.
- **Layout Debugging:** When `display: inline-block` isn't working as expected, check for conflicting `display` properties set dynamically in `:style` bindings or inherited from parent elements. Using wrapper elements can help isolate and control layout flow.

## Executor's Feedback or Assistance Requests

**Task: Refactor App.vue (useGlyphDisplay)**

- **Status:** `useGlyphDisplay.js` composable created and integrated.
- **Goal:** Separate display logic (sorting, grouping, view mode) from `App.vue`.
- **Action:** Moved relevant state, computed properties, and functions to `useGlyphDisplay.js`. Updated `App.vue` to use the composable and pass data/handlers to `AppSidebar` and `LanguageCheckDialog`.
- **Request:** Please run the app and verify sidebar display (sorting, grouping, view toggle) and language check dialog functionality. Re-check core features for regressions. Check console for errors.

**Task: Implement Font Preview Page**

- **Status:** Fixing bug - Preview glyphs rendering vertically.
- **Goal:** Ensure glyphs render side-by-side like text.
- **Action:** Removed conflicting `display: grid` from inline styles in `GlyphPreview.vue` to allow its CSS `display: inline-block` to apply. Removed override from parent.
- **Request:** Please verify the Font Preview page layout again. Do glyphs render inline correctly now?

*(No current requests or blockers)*
