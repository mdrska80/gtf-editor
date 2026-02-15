import { ref, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { open, save, ask } from '@tauri-apps/plugin-dialog';
import { useGtfStore } from './useGtfStore';

export function useFileOperations() {
    const store = useGtfStore();
    const isLoading = ref(false);
    const error = /** @type {import('vue').Ref<string|null>} */ (ref(null));

    // Computed to check if we can save (must have data)
    const canSave = computed(() => {
        return store.gtfData.value !== null;
    });

    function clearError() {
        error.value = null;
    }

    // Returns true if safe to proceed, false if cancelled
    async function checkUnsavedChanges() {
        if (!store.isDirty.value) return true;

        // Simple "Discard or Cancel" flow for now to be safe
        // Ideally we'd have Save/Discard/Cancel
        const shouldDiscard = await ask('You have unsaved changes. Are you sure you want to discard them and proceed?', {
            title: 'Unsaved Changes',
            kind: 'warning',
            okLabel: 'Discard Changes',
            cancelLabel: 'Cancel',
        });

        return shouldDiscard;
    }

    async function handleOpenFile() {
        if (!(await checkUnsavedChanges())) return false;

        error.value = null;
        isLoading.value = true;

        try {
            const selectedPath = await open({
                multiple: false,
                filters: [
                    {
                        name: 'Glyph Text Format',
                        extensions: ['gtf'],
                    },
                ],
            });

            if (selectedPath && typeof selectedPath === 'string') {
                console.log('Selected file:', selectedPath);
                const document = await invoke('load_gtf_file', { path: selectedPath });

                console.log('Parsed document:', document);

                store.setGtfData(
                    document,
                    selectedPath,
                    'header',
                    null
                );

                return true; // Success
            }
        } catch (err) {
            const errorString = String(err);
            console.error('Error loading or parsing file:', errorString);

            if (errorString.includes('more bitmap lines than expected')) {
                error.value = `Warning: File loaded with known inconsistency (bitmap lines vs SIZE). Please review glyph definitions.`;
            } else {
                error.value = `Error: ${errorString}`;
            }
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function handleSaveFile() {
        if (!store.gtfData.value || !store.currentFilePath.value) {
            console.warn('Save attempted but no data or file path is available.');
            return false;
        }

        error.value = null;
        console.log(`Saving to current path: ${store.currentFilePath.value}`);

        try {
            await invoke('save_gtf_file', {
                path: store.currentFilePath.value,
                document: store.gtfData.value,
            });
            console.log('File saved successfully (overwrite).');
            store.markSaved();
            return true;
        } catch (saveErr) {
            const errorString = String(saveErr);
            console.error('Error saving file (overwrite):', errorString);
            error.value = `Error saving file: ${errorString}`;
            return false;
        }
    }

    async function handleSaveFileAs() {
        if (!store.gtfData.value) {
            return false;
        }

        error.value = null;

        try {
            const savePath = await save({
                filters: [
                    {
                        name: 'Glyph Text Format',
                        extensions: ['gtf'],
                    },
                ],
                defaultPath: store.gtfData.value.header?.font_name
                    ? `${store.gtfData.value.header.font_name}.gtf`
                    : 'untitled.gtf',
            });

            if (savePath) {
                console.log('Saving to file:', savePath);
                await invoke('save_gtf_file', {
                    path: savePath,
                    document: store.gtfData.value,
                });

                // Update store with new path
                store.currentFilePath.value = savePath;
                store.markSaved();
                return true;
            }
            return false; // User cancelled
        } catch (err) {
            const errorString = String(err);
            console.error('Error saving file:', errorString);
            error.value = `Error saving file: ${errorString}`;
            return false;
        }
    }

    async function handleNewFile() {
        if (!(await checkUnsavedChanges())) return;
        store.newFile();
    }

    return {
        isLoading,
        error,
        canSave,
        clearError,
        handleOpenFile,
        handleSaveFile,
        handleSaveFileAs,
        handleNewFile
    };
}
