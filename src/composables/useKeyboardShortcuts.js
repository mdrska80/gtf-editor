import { onMounted, onUnmounted, ref } from 'vue';
import { useFileOperations } from './useFileOperations';

export function useKeyboardShortcuts() {
    const { handleOpenFile, handleSaveFile, handleSaveFileAs, handleNewFile } = useFileOperations();
    const isOverlayVisible = ref(false);

    // Track CMD key state for overlay
    let cmdPressedTime = 0;
    let longPressTimer = null;
    const LONG_PRESS_DURATION = 5000; // ms

    function handleKeyDown(event) {
        const isCmdOrCtrl = event.metaKey || event.ctrlKey;

        // Command Long Press Detection (only if no other keys are pressed)
        if ((event.key === 'Meta' || event.key === 'Control') && !event.repeat) {
            cmdPressedTime = Date.now();
            longPressTimer = setTimeout(() => {
                isOverlayVisible.value = true;

                // disable for now...but keep the functionality
                //isOverlayVisible.value = false;

            }, LONG_PRESS_DURATION);
        }

        // Shortcuts
        if (isCmdOrCtrl) {
            switch (event.key.toLowerCase()) {
                case 's':
                    event.preventDefault();
                    if (event.shiftKey) {
                        handleSaveFileAs();
                    } else {
                        handleSaveFile();
                    }
                    break;
                case 'o':
                    event.preventDefault();
                    handleOpenFile();
                    break;
                case 'n':
                    event.preventDefault();
                    handleNewFile();
                    break;
                case 'i':
                    event.preventDefault();
                    // We need to trigger import dialog. 
                    // Since import dialog is in UI, we might need a shared state or event bus.
                    // For now, let's dispatch a custom event that App.vue or FileOperations can listen to?
                    // Or use a store flag?
                    // Let's use a CustomEvent for now as it's simple to hook into.
                    window.dispatchEvent(new CustomEvent('gtf-trigger-import'));
                    break;
            }
        }
    }

    function handleKeyUp(event) {
        if (event.key === 'Meta' || event.key === 'Control') {
            clearTimeout(longPressTimer);
            if (isOverlayVisible.value) {
                isOverlayVisible.value = false;
            }
        }
    }

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        clearTimeout(longPressTimer);
    });

    return {
        isOverlayVisible
    };
}
