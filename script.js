// Dynamic Text Field Management with Font Resizing & Resizable Box
function makeTextEditableAndResizable(textElement, itemContainer) {
    if (!textElement) return;

    // Create floating formatting toolbar if it doesn't exist
    let toolbar = itemContainer.querySelector('.text-formatting-toolbar');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'text-formatting-toolbar';
        toolbar.style.display = 'none';

        toolbar.innerHTML = `
            <button type="button" class="btn-font-dec" title="Font size kurakkan">-</button>
            <input type="number" class="input-font-size" value="16" min="8" max="200" title="Font Size">
            <button type="button" class="btn-font-inc" title="Font size koottan">+</button>
        `;

        itemContainer.appendChild(toolbar);

        const fontInput = toolbar.querySelector('.input-font-size');
        const decBtn = toolbar.querySelector('.btn-font-dec');
        const incBtn = toolbar.querySelector('.btn-font-inc');

        // Update font size dynamically on user change
        function updateFontSize(newSize) {
            let size = parseInt(newSize, 10);
            if (isNaN(size) || size < 8) size = 8;
            if (size > 200) size = 200;
            textElement.style.fontSize = size + 'px';
            fontInput.value = size;
        }

        fontInput.addEventListener('input', (e) => {
            updateFontSize(e.target.value);
        });

        fontInput.addEventListener('mousedown', (e) => e.stopPropagation());

        decBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let currentSize = parseInt(window.getComputedStyle(textElement).fontSize, 10) || 16;
            updateFontSize(currentSize - 2);
        });

        incBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let currentSize = parseInt(window.getComputedStyle(textElement).fontSize, 10) || 16;
            updateFontSize(currentSize + 2);
        });
    }

    // Show formatting toolbar on focus/edit
    textElement.addEventListener('focus', () => {
        textElement.classList.add('is-editing');
        const currentFontSize = parseInt(window.getComputedStyle(textElement).fontSize, 10) || 16;
        const fontInput = toolbar.querySelector('.input-font-size');
        if (fontInput) fontInput.value = currentFontSize;
        toolbar.style.display = 'flex';
    });

    // Hide toolbar when focus is lost
    textElement.addEventListener('blur', (e) => {
        setTimeout(() => {
            if (!itemContainer.contains(document.activeElement)) {
                textElement.classList.remove('is-editing');
                toolbar.style.display = 'none';
            }
        }, 150);
    });

    // Enable CSS native resize functionality
    textElement.style.resize = 'both';
    textElement.style.overflow = 'auto';
}

// Initialize for all existing text elements on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const textItems = document.querySelectorAll('.draggable-text-style');
    textItems.forEach(textEl => {
        const parentContainer = textEl.closest('.draggable-item') || textEl.parentElement;
        makeTextEditableAndResizable(textEl, parentContainer);
    });
});