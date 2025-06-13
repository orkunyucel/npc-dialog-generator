const form = document.getElementById('promptForm');
const promptInput = document.getElementById('promptInput');
const npcCharacterInput = document.getElementById('npcCharacterInput');
const responsesDiv = document.getElementById('responses');
const loadingDiv = document.getElementById('loading');
const generateBtn = document.getElementById('generateBtn');
const generateImageBtn = document.getElementById('generateImageBtn');
const resultsSection = document.getElementById('resultsSection');
const imageSection = document.getElementById('imageSection');
const charCount = document.getElementById('charCount');
const npcCharCount = document.getElementById('npcCharCount');
const copyAllBtn = document.getElementById('copyAllBtn');
const toast = document.getElementById('toast');
const tutorialModal = document.getElementById('tutorialModal');
const lengthRange = document.getElementById('lengthRange');
const lengthLabel = document.getElementById('lengthLabel');

// Dialog mode variables
let currentDialogId = null;
let dialogHistory = [];
let currentScene = '';
let dialogImages = [];

// Length range labels
const lengthLabels = ['Short', 'Medium', 'Long'];
lengthRange.addEventListener('input', () => {
    lengthLabel.textContent = lengthLabels[lengthRange.value - 1];
});

// Style buttons
let selectedStyle = 'mixed';
document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedStyle = btn.dataset.style;
    });
});

// Tutorial functions
function closeTutorial() {
    tutorialModal.classList.remove('show');
    localStorage.setItem('tutorialSeen', 'true');
}

function showTutorial() {
    tutorialModal.classList.add('show');
}

// Check if tutorial was seen before
if (localStorage.getItem('tutorialSeen') === 'true') {
    tutorialModal.classList.remove('show');
}

// Character counter for main prompt
promptInput.addEventListener('input', () => {
    const length = promptInput.value.length;
    charCount.textContent = length;
    if (length > 500) {
        promptInput.value = promptInput.value.substring(0, 500);
        charCount.textContent = 500;
    }
});

// Character counter for NPC input
npcCharacterInput.addEventListener('input', () => {
    const length = npcCharacterInput.value.length;
    npcCharCount.textContent = length;
    if (length > 100) {
        npcCharacterInput.value = npcCharacterInput.value.substring(0, 100);
        npcCharCount.textContent = 100;
    }
});

// Copy all functionality
copyAllBtn.addEventListener('click', async () => {
    const allDialogs = Array.from(document.querySelectorAll('.dialog-text'))
        .map(el => el.textContent)
        .join('\n\n');
    
    try {
        await navigator.clipboard.writeText(allDialogs);
        showToast('All dialogues copied!');
    } catch (err) {
        showToast('Copy failed!', 'error');
    }
});

// Toast notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Copy individual dialog
async function copyDialog(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.innerHTML;
        button.innerHTML = '✓';
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    } catch (err) {
        showToast('Copy failed!', 'error');
    }
}

// Generate Image
generateImageBtn.onclick = async () => {
    if (!promptInput.value.trim()) {
        showToast('Please enter a scene description!', 'error');
        return;
    }

    imageSection.style.display = 'block';
    document.getElementById('generatedImage').style.display = 'none';
    document.getElementById('imageLoading').style.display = 'flex';
    generateImageBtn.disabled = true;

    try {
        const res = await fetch('/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptInput.value })
        });
        
        const data = await res.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        const img = document.getElementById('generatedImage');
        
        img.onload = function() {
            img.style.display = 'block';
            document.getElementById('imageLoading').style.display = 'none';
            showToast('Image created!');
        };
        
        img.onerror = function() {
            document.getElementById('imageLoading').style.display = 'none';
            showToast('Image could not be loaded!', 'error');
            console.error('Image URL:', data.image_url);
        };
        
        img.src = data.image_url;
        
    } catch (err) {
        document.getElementById('imageLoading').style.display = 'none';
        showToast('Image creation failed!', 'error');
        console.error('Error:', err);
    }
    
    generateImageBtn.disabled = false;
};

// Form submission
form.onsubmit = async (e) => {
    e.preventDefault();
    
    if (!promptInput.value.trim()) {
        showToast('Please enter a scene description!', 'error');
        return;
    }

    resultsSection.style.display = 'block';
    responsesDiv.innerHTML = "";
    loadingDiv.style.display = "flex";
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');

    try {
        const res = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: promptInput.value,
                npcCharacter: npcCharacterInput.value.trim(),
                style: selectedStyle,
                emotion: document.getElementById('emotionSelect').value,
                includeActions: document.getElementById('includeActions').checked,
                includeNames: document.getElementById('includeNames').checked,
                length: lengthLabels[lengthRange.value - 1].toLowerCase()
            })
        });
        
        const data = await res.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        if (data.dialogs && data.dialogs.length > 0) {
            window.generatedDialogs = data.dialogs;
            window.currentNpcCharacter = data.npcCharacter || '';
            const npcTag = data.npcCharacter ? 
                `<span class="npc-character-tag">${data.npcCharacter}</span>` : '';
            
            responsesDiv.innerHTML = data.dialogs.map((dialog, i) => `
                <div class="dialog-card" style="animation-delay: ${i * 0.1}s">
                    <button class="favorite-btn" onclick="toggleFavorite('${dialog.replace(/'/g, "\\'")}', this)">
                        ☆
                    </button>
                    <div class="dialog-header">
                        <div class="npc-info">
                            <span class="npc-name">Dialogue ${i + 1}</span>
                            ${npcTag}
                        </div>
                        <button class="copy-btn" onclick="copyDialog('${dialog.replace(/'/g, "\\'")}', this)">
                            📋
                        </button>
                    </div>
                    <p class="dialog-text">${dialog}</p>
                    <div class="dialog-footer">
                        <button class="convert-dialog-btn" data-dialog-index="${i}" data-dialog-text="${dialog.replace(/"/g, '&quot;')}" data-npc-character="${data.npcCharacter || ''}">
                            <span class="icon">💬</span>
                            <span>Convert to Dialog</span>
                        </button>
                        <button class="regenerate-btn" onclick="regenerateDialog(${i})">
                            <span class="regenerate-icon">🔄</span>
                            <span class="regenerate-text">Regenerate</span>
                        </button>
                    </div>
                </div>
            `).join("");
            showToast('Dialogues generated successfully!');
        } else {
            throw new Error('Could not generate dialogues');
        }
    } catch (err) {
        responsesDiv.innerHTML = `
            <div class="error-card">
                <span class="error-icon">⚠️</span>
                <p>An error occurred: ${err.message}</p>
                <button onclick="location.reload()" class="retry-btn">Try Again</button>
            </div>
        `;
        showToast('Error occurred!', 'error');
    }
    
    loadingDiv.style.display = "none";
    generateBtn.disabled = false;
    generateBtn.classList.remove('loading');
};

// Export Functions
function exportAsJSON() {
    const dialogs = Array.from(document.querySelectorAll('.dialog-text'))
        .map((el, index) => ({
            id: index + 1,
            text: el.textContent,
            scene: promptInput.value,
            npcCharacter: npcCharacterInput.value.trim(),
            style: selectedStyle,
            timestamp: new Date().toISOString()
        }));
    
    const dataStr = JSON.stringify({
        scene_description: promptInput.value,
        npc_character: npcCharacterInput.value.trim(),
        generated_at: new Date().toISOString(),
        style: selectedStyle,
        dialogs: dialogs
    }, null, 2);
    
    downloadFile(dataStr, 'npc-dialogs.json', 'application/json');
    showToast('Exported as JSON!');
}

function exportAsCSV() {
    const dialogs = Array.from(document.querySelectorAll('.dialog-text'));
    let csv = 'ID,Dialog,Scene,NPC Character,Style,Generated At\n';
    
    dialogs.forEach((el, index) => {
        const text = el.textContent.replace(/"/g, '""');
        const npc = npcCharacterInput.value.trim().replace(/"/g, '""');
        csv += `${index + 1},"${text}","${promptInput.value}","${npc}","${selectedStyle}","${new Date().toLocaleString()}"\n`;
    });
    
    downloadFile(csv, 'npc-dialogs.csv', 'text/csv');
    showToast('Exported as CSV!');
}

function exportForUnity() {
    const dialogs = Array.from(document.querySelectorAll('.dialog-text'));
    let unityFormat = `// NPC Dialogs for Unity\n// Scene: ${promptInput.value}\n// NPC: ${npcCharacterInput.value.trim() || 'Various'}\n// Style: ${selectedStyle}\n// Generated: ${new Date().toLocaleString()}\n\n`;
    
    unityFormat += 'using System.Collections.Generic;\n\n';
    unityFormat += 'public static class NPCDialogs {\n';
    unityFormat += `    public static string npcCharacter = "${npcCharacterInput.value.trim()}";\n`;
    unityFormat += '    public static List<string> dialogs = new List<string>() {\n';
    
    dialogs.forEach((el, index) => {
        const text = el.textContent.replace(/"/g, '\\"');
        unityFormat += `        "${text}"${index < dialogs.length - 1 ? ',' : ''}\n`;
    });
    
    unityFormat += '    };\n}';
    
    downloadFile(unityFormat, 'NPCDialogs.cs', 'text/plain');
    showToast('Exported for Unity!');
}

function exportForUnreal() {
    const dialogs = Array.from(document.querySelectorAll('.dialog-text'));
    let unrealFormat = `// NPC Dialogs for Unreal Engine\n// Scene: ${promptInput.value}\n// NPC: ${npcCharacterInput.value.trim() || 'Various'}\n// Style: ${selectedStyle}\n\n`;
    
    unrealFormat += '#pragma once\n\n';
    unrealFormat += '#include "CoreMinimal.h"\n\n';
    unrealFormat += `static const FString NPCCharacter = TEXT("${npcCharacterInput.value.trim()}");\n\n`;
    
    dialogs.forEach((el, index) => {
        const text = el.textContent.replace(/"/g, '\\"');
        unrealFormat += `static const FText Dialog${index + 1} = FText::FromString(TEXT("${text}"));\n`;
    });
    
    downloadFile(unrealFormat, 'NPCDialogs.h', 'text/plain');
    showToast('Exported for Unreal!');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Scene update toggle function
function toggleSceneUpdate() {
    const textarea = document.getElementById('dialogSceneUpdate');
    const toggleBtn = document.querySelector('.scene-toggle-btn .toggle-icon');
    
    if (textarea.style.display === 'none') {
        textarea.style.display = 'block';
        toggleBtn.textContent = '➖';
        textarea.focus();
    } else {
        textarea.style.display = 'none';
        toggleBtn.textContent = '➕';
        textarea.value = '';
    }
}

// Regenerate single dialog with better animation
async function regenerateDialog(index) {
    const card = document.querySelectorAll('.dialog-card')[index];
    const dialogText = card.querySelector('.dialog-text');
    const regenerateBtn = card.querySelector('.regenerate-btn');
    const npcTag = card.querySelector('.npc-character-tag');
    const originalText = dialogText.textContent;
    
    // Start animation
    card.classList.add('regenerating');
    regenerateBtn.disabled = true;
    
    // Create loading text animation
    const loadingPhrases = [
        "Generating new dialogue...",
        "Creating unique response...",
        "Thinking of something new..."
    ];
    let phraseIndex = 0;
    
    const textInterval = setInterval(() => {
        dialogText.innerHTML = `<span class="loading-text">${loadingPhrases[phraseIndex % loadingPhrases.length]}</span>`;
        phraseIndex++;
    }, 1000);
    
    try {
        const res = await fetch('/generate-single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: promptInput.value,
                npcCharacter: npcCharacterInput.value.trim(),
                style: selectedStyle
            })
        });
        
        const data = await res.json();
        
        if (data.dialog) {
            clearInterval(textInterval);
            // Update the global array with new dialog
            if (window.generatedDialogs && window.generatedDialogs[index]) {
                window.generatedDialogs[index] = data.dialog;
            }
            // Update current NPC character
            if (data.npcCharacter) {
                window.currentNpcCharacter = data.npcCharacter;
            }
            // Update NPC tag if present
            if (npcTag && data.npcCharacter) {
                npcTag.textContent = data.npcCharacter;
            }
            // Update the convert dialog button's data
            const convertBtn = card.querySelector('.convert-dialog-btn');
            if (convertBtn) {
                convertBtn.setAttribute('data-dialog-text', data.dialog);
                convertBtn.setAttribute('data-npc-character', data.npcCharacter || '');
            }
            // Fade in new text
            dialogText.style.opacity = '0';
            setTimeout(() => {
                dialogText.textContent = data.dialog;
                dialogText.style.opacity = '1';
            }, 300);
            showToast('Dialog regenerated!');
        } else {
            throw new Error('No dialog returned');
        }
    } catch (err) {
        clearInterval(textInterval);
        dialogText.style.opacity = '0';
        setTimeout(() => {
            dialogText.textContent = originalText;
            dialogText.style.opacity = '1';
        }, 300);
        showToast('Regeneration failed!', 'error');
    }
    
    // Stop animation
    setTimeout(() => {
        card.classList.remove('regenerating');
        regenerateBtn.disabled = false;
    }, 500);
}

function startDialogMode(initialDialog, npcCharacter) {
    document.getElementById('dialogModal').classList.add('show');
    document.getElementById('dialogHistory').innerHTML = '';
    currentScene = promptInput.value; // Mevcut sahneyi sakla
    
    // Start dialog session
    fetch('/start-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            initialDialog: initialDialog,
            scene: currentScene,
            npc1: npcCharacter || 'NPC',
            style: selectedStyle
        })
    })
    .then(res => res.json())
    .then(data => {
        currentDialogId = data.dialogId;
        dialogHistory = data.history;
        renderDialogHistory();
    })
    .catch(err => {
        showToast('Failed to start dialog mode!', 'error');
        console.error(err);
    });
}

function closeDialogMode() {
    document.getElementById('dialogModal').classList.remove('show');
    currentDialogId = null;
    dialogHistory = [];
    dialogImages = [];
    updateImageCountBadge();
    // Reset to conversation tab
    document.querySelectorAll('.dialog-tab')[0].click();
}

function renderDialogHistory() {
    const historyDiv = document.getElementById('dialogHistory');
    historyDiv.innerHTML = dialogHistory.map((turn, index) => `
        <div class="dialog-message" style="animation-delay: ${index * 0.1}s">
            <div class="dialog-character">${turn.character}</div>
            <div class="dialog-text-content">${turn.text}</div>
        </div>
    `).join('');
    
    // Scroll to bottom
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

document.getElementById('dialogForm').onsubmit = async (e) => {
    e.preventDefault();
    
    if (!currentDialogId) {
        showToast('Dialog session not active!', 'error');
        return;
    }
    
    const npcInput = document.getElementById('dialogNpcInput');
    const emotionSelect = document.getElementById('dialogEmotionSelect');
    const sceneUpdateInput = document.getElementById('dialogSceneUpdate');
    const generateBtn = e.target.querySelector('.dialog-generate-btn');
    
    if (!npcInput.value.trim()) {
        showToast('Please enter NPC character!', 'error');
        return;
    }
    
    // Sahne güncellemesi varsa current scene'i güncelle
    if (sceneUpdateInput.value.trim()) {
        currentScene = sceneUpdateInput.value.trim();
        
        // Sahne güncelleme bilgisini history'ye ekle
        const sceneUpdateMsg = {
            character: '📍 Scene Update',
            text: currentScene
        };
        dialogHistory.push(sceneUpdateMsg);
        renderDialogHistory();
    }
    
    // Disable form
    generateBtn.disabled = true;
    npcInput.disabled = true;
    
    // Add loading message
    const historyDiv = document.getElementById('dialogHistory');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'dialog-loading';
    loadingDiv.innerHTML = `
        <div class="dialog-loading-spinner"></div>
        <div class="dialog-loading-text">Generating response...</div>
    `;
    historyDiv.appendChild(loadingDiv);
    historyDiv.scrollTop = historyDiv.scrollHeight;
    
    try {
        const res = await fetch('/continue-dialog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dialogId: currentDialogId,
                npcCharacter: npcInput.value.trim(),
                emotion: emotionSelect.value,
                includeActions: document.getElementById('includeActions').checked,
                includeNames: document.getElementById('includeNames').checked,
                sceneUpdate: sceneUpdateInput.value.trim() || null // Yeni parametre
            })
        });
        
        const data = await res.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update history
        dialogHistory = data.history;
        renderDialogHistory();
        
        // Clear inputs
        npcInput.value = '';
        emotionSelect.value = '';
        sceneUpdateInput.value = '';
        sceneUpdateInput.style.display = 'none';
        document.querySelector('.scene-toggle-btn .toggle-icon').textContent = '➕';
        
        showToast('Response generated!');
        
    } catch (err) {
        showToast('Failed to generate response!', 'error');
        console.error(err);
        if (loadingDiv.parentNode) {
            loadingDiv.remove();
        }
    }
    
    // Re-enable form
    generateBtn.disabled = false;
    npcInput.disabled = false;
    npcInput.focus();
};

// Dialog Tab System Functions

// Switch between dialog tabs
function switchDialogTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.dialog-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab contents
    document.querySelectorAll('.dialog-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'conversation') {
        document.getElementById('conversationTab').classList.add('active');
        document.getElementById('exportImagesBtn').style.display = 'none';
    } else if (tabName === 'images') {
        document.getElementById('imagesTab').classList.add('active');
        document.getElementById('exportImagesBtn').style.display = dialogImages.length > 0 ? 'inline-block' : 'none';
    }
}

// Generate image for dialog mode
async function generateDialogImage() {
    // Get the current scene - either the original or updated one
    const sceneText = currentScene || promptInput.value;
    
    if (!sceneText.trim()) {
        showToast('No scene description available!', 'error');
        return;
    }

    const generateBtn = document.querySelector('.dialog-generate-image-btn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="loading-spinner"></span> Creating...';

    try {
        const res = await fetch('/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: sceneText })
        });
        
        const data = await res.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Add to images array
        const imageData = {
            id: Date.now(),
            url: data.image_url,
            scene: sceneText,
            timestamp: new Date().toLocaleString(),
            dialogContext: dialogHistory.slice(-3) // Last 3 dialog entries for context
        };
        
        dialogImages.push(imageData);
        updateDialogImagesList();
        updateImageCountBadge();
        
        showToast('Image created and saved to Images tab!');
        
        // Auto-switch to images tab
        const imagesTabBtn = document.querySelector('.dialog-tab:nth-child(2)');
        imagesTabBtn.click();
        
    } catch (err) {
        showToast('Image creation failed!', 'error');
        console.error('Error:', err);
    }
    
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span class="btn-text">Create Scene Image</span><span class="btn-icon">🎨</span>';
}

// Update images list display
function updateDialogImagesList() {
    const listContainer = document.getElementById('dialogImagesList');
    
    if (dialogImages.length === 0) {
        listContainer.innerHTML = '<p class="no-images-message">No images generated yet</p>';
        return;
    }
    
    listContainer.innerHTML = dialogImages.map((img, index) => `
        <div class="dialog-image-item" data-image-id="${img.id}">
            <div class="image-header">
                <span class="image-number">Image ${index + 1}</span>
                <span class="image-timestamp">${img.timestamp}</span>
                <button class="remove-image-btn" onclick="removeDialogImage(${img.id})">×</button>
            </div>
            <div class="image-content">
                <img src="${img.url}" alt="Generated scene" onclick="openImageFullscreen('${img.url}')">
                <div class="image-details">
                    <div class="scene-description">
                        <strong>Scene:</strong> ${img.scene}
                    </div>
                    ${img.dialogContext.length > 0 ? `
                        <div class="dialog-context">
                            <strong>Context:</strong>
                            ${img.dialogContext.map(turn => `<div>${turn.character}: ${turn.text.substring(0, 50)}...</div>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Update image count badge
function updateImageCountBadge() {
    const badge = document.getElementById('imageCountBadge');
    if (dialogImages.length > 0) {
        badge.textContent = dialogImages.length;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Remove image from list
function removeDialogImage(imageId) {
    dialogImages = dialogImages.filter(img => img.id !== imageId);
    updateDialogImagesList();
    updateImageCountBadge();
    
    if (dialogImages.length === 0) {
        document.getElementById('exportImagesBtn').style.display = 'none';
    }
}

// Open image in fullscreen
function openImageFullscreen(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'image-fullscreen-modal';
    modal.innerHTML = `
        <div class="fullscreen-content">
            <button class="fullscreen-close" onclick="this.parentElement.parentElement.remove()">×</button>
            <img src="${imageUrl}" alt="Fullscreen image">
        </div>
    `;
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    document.body.appendChild(modal);
}

// Export dialog images data
function exportDialogImages() {
    const exportData = {
        sessionId: currentDialogId,
        exportDate: new Date().toISOString(),
        totalImages: dialogImages.length,
        images: dialogImages
    };
    
    const jsonStr = JSON.stringify(exportData, null, 2);
    downloadFile(jsonStr, 'dialog-images-data.json', 'application/json');
    showToast('Images data exported!');
}

// Export dialog
function exportDialog(format) {
    if (!currentDialogId) {
        showToast('No active dialog to export!', 'error');
        return;
    }
    
    fetch('/export-dialog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            dialogId: currentDialogId,
            format: format
        })
    })
    .then(res => res.json())
    .then(data => {
        if (format === 'json') {
            const jsonStr = JSON.stringify(data, null, 2);
            downloadFile(jsonStr, 'dialog-conversation.json', 'application/json');
        } else {
            downloadFile(data.text, 'dialog-conversation.txt', 'text/plain');
        }
        showToast(`Dialog exported as ${format.toUpperCase()}!`);
    })
    .catch(err => {
        showToast('Export failed!', 'error');
        console.error(err);
    });
}

// Favorite dialogs
let favoriteDialogs = JSON.parse(localStorage.getItem('favorites') || '[]');

function toggleFavorite(dialogText, button) {
    const index = favoriteDialogs.findIndex(fav => fav.text === dialogText);
    
    if (index === -1) {
        favoriteDialogs.push({
            text: dialogText,
            scene: promptInput.value,
            npcCharacter: npcCharacterInput.value.trim(),
            style: selectedStyle,
            timestamp: new Date().toISOString()
        });
        button.classList.add('favorited');
        button.innerHTML = '⭐';
        showToast('Added to favorites!');
    } else {
        favoriteDialogs.splice(index, 1);
        button.classList.remove('favorited');
        button.innerHTML = '☆';
        showToast('Removed from favorites!');
    }
    
    localStorage.setItem('favorites', JSON.stringify(favoriteDialogs));
}

// Save scene
function saveScene() {
    const scene = {
        description: promptInput.value,
        npcCharacter: npcCharacterInput.value.trim(),
        style: selectedStyle,
        dialogs: Array.from(document.querySelectorAll('.dialog-text')).map(el => el.textContent),
        imageUrl: document.getElementById('generatedImage').src || '',
        timestamp: new Date().toISOString()
    };
    
    const savedScenes = JSON.parse(localStorage.getItem('savedScenes') || '[]');
    savedScenes.unshift(scene);
    if (savedScenes.length > 20) savedScenes.pop();
    localStorage.setItem('savedScenes', JSON.stringify(savedScenes));
    
    showToast('Scene saved!');
    updateSavedScenesList();
}

// Toggle saved scenes sidebar
function toggleSavedScenes() {
    const sidebar = document.getElementById('savedScenes');
    sidebar.classList.toggle('open');
    updateSavedScenesList();
}

// Update saved scenes list
function updateSavedScenesList() {
    const savedScenes = JSON.parse(localStorage.getItem('savedScenes') || '[]');
    const listDiv = document.getElementById('savedScenesList');
    
    if (savedScenes.length === 0) {
        listDiv.innerHTML = '<p class="no-saves">No saved scenes yet</p>';
        return;
    }
    
    listDiv.innerHTML = savedScenes.map((scene, index) => `
        <div class="scene-card" onclick="loadScene(${index})">
            <h4>${scene.description.substring(0, 50)}...</h4>
            <p class="scene-meta">
                <span>🎭 ${scene.style}</span>
                <span>👤 ${scene.npcCharacter || 'Various'}</span>
                <span>💬 ${scene.dialogs.length} dialogs</span>
            </p>
            <p class="scene-date">${new Date(scene.timestamp).toLocaleDateString()}</p>
        </div>
    `).join('');
}

// Load saved scene
function loadScene(index) {
    const savedScenes = JSON.parse(localStorage.getItem('savedScenes') || '[]');
    const scene = savedScenes[index];
    
    if (scene) {
        promptInput.value = scene.description;
        charCount.textContent = scene.description.length;
        
        npcCharacterInput.value = scene.npcCharacter || '';
        npcCharCount.textContent = (scene.npcCharacter || '').length;
        
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.style === scene.style) {
                btn.classList.add('active');
                selectedStyle = scene.style;
            }
        });
        
        resultsSection.style.display = 'block';
        
        const npcTag = scene.npcCharacter ? 
            `<span class="npc-character-tag">${scene.npcCharacter}</span>` : '';
        
        responsesDiv.innerHTML = scene.dialogs.map((dialog, i) => `
            <div class="dialog-card" style="animation-delay: ${i * 0.1}s">
                <button class="favorite-btn" onclick="toggleFavorite('${dialog.replace(/'/g, "\\'")}', this)">
                    ☆
                </button>
                <div class="dialog-header">
                    <div class="npc-info">
                        <span class="npc-name">Dialogue ${i + 1}</span>
                        ${npcTag}
                    </div>
                    <button class="copy-btn" onclick="copyDialog('${dialog.replace(/'/g, "\\'")}', this)">
                        📋
                    </button>
                </div>
                <p class="dialog-text">${dialog}</p>
                <div class="dialog-footer">
                    <button class="convert-dialog-btn" data-dialog-text="${dialog.replace(/"/g, '&quot;')}" data-npc-character="${scene.npcCharacter || ''}">
                        <span class="icon">💬</span>
                        <span>Convert to Dialog</span>
                    </button>
                    <button class="regenerate-btn" onclick="regenerateDialog(${i})">
                        <span class="regenerate-icon">🔄</span>
                        <span class="regenerate-text">Regenerate</span>
                    </button>
                </div>
            </div>
        `).join("");
        
        if (scene.imageUrl) {
            imageSection.style.display = 'block';
            document.getElementById('generatedImage').src = scene.imageUrl;
            document.getElementById('generatedImage').style.display = 'block';
        }
        
        toggleSavedScenes();
        showToast('Scene loaded!');
    }
}

// Scene templates
const sceneTemplates = [
    {
        name: "🏰 Medieval Town",
        description: "A bustling medieval marketplace where merchants hawk their wares and guards patrol the cobblestone streets",
        npc: "merchant"
    },
    {
        name: "🏕️ Campfire",
        description: "Adventurers gathered around a campfire at night, sharing stories of their travels and battles",
        npc: "veteran adventurer"
    },
    {
        name: "🏚️ After Battle",
        description: "Villagers emerging from hiding after a fierce battle, checking on neighbors and surveying damage",
        npc: "worried mother"
    },
    {
        name: "🎪 Festival",
        description: "Annual harvest festival with music, dancing, and celebration throughout the village",
        npc: "excited child"
    },
    {
        name: "☠️ Dungeon",
        description: "Dark dungeon where prisoners await their fate, guards patrol, and mysterious sounds echo",
        npc: "prison guard"
    },
    {
        name: "🌊 Seaside Port",
        description: "Busy port town with sailors, merchants, and travelers from distant lands",
        npc: "old fisherman"
    },
    {
        name: "🌲 Forest Camp",
        description: "Bandits hiding in the forest, planning their next ambush on merchant caravans",
        npc: "bandit leader"
    },
    {
        name: "🏛️ Temple",
        description: "Sacred temple where pilgrims seek blessings and priests perform ancient rituals",
        npc: "temple priest"
    },
    {
        name: "🚀 Space Station",
        description: "Futuristic space station where crew members deal with technical malfunctions and alien visitors",
        npc: "station engineer"
    },
    {
        name: "🏙️ Cyberpunk City",
        description: "Neon-lit streets where hackers, corporate agents, and street vendors navigate the digital underground",
        npc: "street vendor"
    }
];

// Show templates modal
function showTemplates() {
    const modal = document.getElementById('templatesModal');
    const list = document.getElementById('templatesList');
    
    list.innerHTML = sceneTemplates.map(template => `
        <div class="template-card" onclick="useTemplate('${template.description}', '${template.npc}')">
            <h3>${template.name}</h3>
            <p>${template.description}</p>
            <p style="color: var(--npc-accent); font-size: 0.85rem; margin-top: 8px;">
                <strong>Suggested NPC:</strong> ${template.npc}
            </p>
        </div>
    `).join('');
    
    modal.classList.add('show');
}

// Close templates modal
function closeTemplates() {
    document.getElementById('templatesModal').classList.remove('show');
}

// Use template
function useTemplate(description, npc) {
    promptInput.value = description;
    charCount.textContent = description.length;
    npcCharacterInput.value = npc;
    npcCharCount.textContent = npc.length;
    closeTemplates();
    showToast('Template loaded!');
}

// Initialize
updateSavedScenesList();

// Close dialog modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('dialogModal').classList.contains('show')) {
        closeDialogMode();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.convert-dialog-btn')) {
        const btn = e.target.closest('.convert-dialog-btn');
        
        // First try to get from data attributes (for regenerated dialogs)
        let dialogText = btn.getAttribute('data-dialog-text');
        let npcCharacter = btn.getAttribute('data-npc-character');
        
        // If not found in attributes, fallback to array (for initial generation)
        if (!dialogText) {
            const index = parseInt(btn.dataset.dialogIndex);
            if (window.generatedDialogs && window.generatedDialogs[index]) {
                dialogText = window.generatedDialogs[index];
                npcCharacter = window.currentNpcCharacter;
            }
        }
        
        if (dialogText) {
            // Decode HTML entities
            dialogText = dialogText.replace(/&quot;/g, '"');
            startDialogMode(dialogText, npcCharacter);
        }
    }
});
