// Dynamic Text Field Management with Font Resizing & Resizable Box
function makeTextEditableAndResizable(textElement, itemContainer) {
    if (!textElement || !itemContainer) return;

    // Make element editable
    textElement.contentEditable = "true";

    // Create floating formatting toolbar if it doesn't exist
    let toolbar = itemContainer.querySelector('.text-formatting-toolbar');
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'text-formatting-toolbar';
        toolbar.style.display = 'none';

        toolbar.innerHTML = `
            <button type="button" class="btn-font-dec" title="Font size kurakkan">-</button>
            <input type="number" class="input-font-size" value="18" min="8" max="200" title="Font Size">
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
            let currentSize = parseInt(window.getComputedStyle(textElement).fontSize, 10) || 18;
            updateFontSize(currentSize - 2);
        });

        incBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let currentSize = parseInt(window.getComputedStyle(textElement).fontSize, 10) || 18;
            updateFontSize(currentSize + 2);
        });
    }

    // Show formatting toolbar on focus/edit
    textElement.addEventListener('focus', () => {
        textElement.classList.add('is-editing');
        const currentFontSize = parseInt(window.getComputedStyle(textElement).fontSize, 10) || 18;
        const fontInput = toolbar.querySelector('.input-font-size');
        if (fontInput) fontInput.value = currentFontSize;
        toolbar.style.display = 'flex';
    });

    // Hide toolbar when focus is lost
    textElement.addEventListener('blur', () => {
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

// Function to add custom text box dynamically to the map
function addCustomText() {
    const canvasContainer = document.getElementById('canvasContainer');
    if (!canvasContainer) return;

    const fontSelect = document.getElementById('fontFamilySelect');
    const sizeSelect = document.getElementById('fontSizeSelect');

    const selectedFont = fontSelect ? fontSelect.value : 'Arial';
    const selectedSize = sizeSelect ? sizeSelect.value : '18px';

    const itemContainer = document.createElement('div');
    itemContainer.className = 'draggable-item';
    itemContainer.style.position = 'absolute';
    itemContainer.style.left = '100px';
    itemContainer.style.top = '100px';
    itemContainer.style.zIndex = '10';

    const textDiv = document.createElement('div');
    textDiv.className = 'draggable-text-style';
    textDiv.style.fontFamily = selectedFont;
    textDiv.style.fontSize = selectedSize;
    textDiv.innerText = 'Text Enter Cheyyuka';

    itemContainer.appendChild(textDiv);
    canvasContainer.appendChild(itemContainer);

    // Apply resizing & editable toolbar
    makeTextEditableAndResizable(textDiv, itemContainer);

    // Focus on the newly created text element
    textDiv.focus();
}

// Initialize for all existing text elements on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const textItems = document.querySelectorAll('.draggable-text-style');
    textItems.forEach(textEl => {
        const parentContainer = textEl.closest('.draggable-item') || textEl.parentElement;
        makeTextEditableAndResizable(textEl, parentContainer);
    });
});