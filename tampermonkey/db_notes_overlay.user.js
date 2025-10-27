// ==UserScript==
// @name         DuelingBook Notes Overlay
// @description  Temporary notes overlay for duelingbook.com with hide/show toggle
// @version      1.0
// @author       vivaria
// @license      MIT
// @homepageURL  https://github.com/vivaria/db_scripts
// @updateURL    https://github.com/vivaria/db_scripts/raw/main/tampermonkey/db_notes_overlay.user.js
// @downloadURL  https://github.com/vivaria/db_scripts/raw/main/tampermonkey/db_notes_overlay.user.js
// @match        *://www.duelingbook.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Create container for both the button and the textbox
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.zIndex = 10000;
    container.style.fontFamily = 'sans-serif';

    // Create the toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Show Notes';
    toggleButton.style.marginBottom = '5px';
    toggleButton.style.padding = '5px 10px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.borderRadius = '1px';
    toggleButton.style.border = '1px solid #888';
    toggleButton.style.background = '#f0f0f0';
    toggleButton.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';

    // Create the textarea
    const box = document.createElement('textarea');
    box.style.width = '198px';
    box.style.height = '391px';
    box.style.background = '#ffffcc';
    box.style.color = '#000';
    box.style.padding = '10px';
    box.style.border = '1px solid #ccc';
    box.style.borderRadius = '1px';
    box.style.resize = 'both';
    // box.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    box.placeholder = 'Write your notes here...';
    box.style.display = 'none';

    // Toggle function
    toggleButton.addEventListener('click', () => {
        if (box.style.display === 'none') {
            box.style.display = 'block';
            toggleButton.textContent = 'Hide Notes';
        } else {
            box.style.display = 'none';
            toggleButton.textContent = 'Show Notes';
        }
    });

    // Assemble the elements
    container.appendChild(box);
    container.appendChild(toggleButton);
    document.body.appendChild(container);
})();
