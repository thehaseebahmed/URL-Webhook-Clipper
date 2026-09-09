/**
 * Main Popup Script - KONZEPT A Implementation
 * V17 - WORKAROUND: Load collaborators from existing records
 */

import { storage } from './modules/storage.js';
import { theme } from './modules/theme.js';
import { fileHandler } from './modules/fileHandler.js';
import { sender } from './modules/sender.js';
import { webhookManager } from './modules/webhookManager.js';

// Global state
let isInitialized = false;
let destinations = []; // List of webhook destinations
let currentDestination = null;

// 🔧 FIX: Expose destinations globally for sender.js
window.destinations = destinations;

/**
 * 🔬 DEBUG TOOL: Inspect all storage areas
 */
window.debugStorage = async function() {
  console.log('\n=== 🔬 STORAGE DEBUG INSPECTOR ===');
  console.log('Timestamp:', new Date().toISOString());
  
  try {
    const local = await chrome.storage.local.get(null);
    console.log('\n📦 chrome.storage.local:');
    console.log('   Total Keys:', Object.keys(local).length);
    console.log('   Keys:', Object.keys(local));
    console.log('   Full Data:', local);
    
    const sync = await chrome.storage.sync.get(null);
    console.log('\n☁️ chrome.storage.sync:');
    console.log('   Total Keys:', Object.keys(sync).length);
    console.log('   Keys:', Object.keys(sync));
    console.log('   Full Data:', sync);
    
    const session = await chrome.storage.session.get(null);
    console.log('\n⏱️ chrome.storage.session:');
    console.log('   Total Keys:', Object.keys(session).length);
    console.log('   Keys:', Object.keys(session));
    console.log('   Full Data:', session);
    
    console.log('\n=================================\n');
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};

/**
 * 🔬 DEBUG TOOL: Clear all storage
 */
window.clearAllStorage = async function() {
  if (!confirm('⚠️ WARNUNG: Alle gespeicherten Daten löschen?')) return;
  
  console.log('🗑️ Clearing all storage...');
  await chrome.storage.local.clear();
  await chrome.storage.sync.clear();
  await chrome.storage.session.clear();
  console.log('✅ All storage cleared');
  
  location.reload();
};

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.classList.remove('success', 'error', 'info');
  statusDiv.classList.add(type);
  statusDiv.style.display = 'block';

  if (type !== 'error') {
    setTimeout(() => {
      if (statusDiv.textContent === message) {
        statusDiv.style.display = 'none';
        statusDiv.textContent = '';
        statusDiv.classList.remove('success', 'error', 'info');
      }
    }, 5000);
  }
}

/**
 * 🎯 KONZEPT A: Load and merge all destinations
 */
async function loadDestinations() {
  console.log('🎯 [DESTINATIONS] Loading all destinations...');
  
  try {
    const syncResult = await chrome.storage.sync.get(['webhookConfigs']);

    const webhooks = syncResult.webhookConfigs || [];

    console.log('🔍 [DEBUG] Storage contents:', {
      webhooks: webhooks.length,
      webhookData: webhooks
    });

    destinations = [];

    // Add webhooks
    webhooks.forEach(webhook => {
      destinations.push({
        id: webhook.id,
        type: 'webhook',
        name: webhook.name,
        icon: '📤',
        displayName: `📤 ${webhook.name}`,
        config: webhook
      });
    });

    // 🔧 FIX: Update global reference
    window.destinations = destinations;

    console.log('🎯 [DESTINATIONS] Loaded:', {
      total: destinations.length,
      webhooks: webhooks.length,
      destinationsList: destinations
    });
    
    if (destinations.length === 0) {
      showStatus('⚠️ Keine Destinations konfiguriert. Bitte gehe zu Einstellungen.', 'info');
    }
    
    return destinations;
  } catch (error) {
    console.error('❌ [DESTINATIONS] Error loading destinations:', error);
    showStatus('❌ Fehler beim Laden der Destinations: ' + error.message, 'error');
    return [];
  }
}

/**
 * 🎯 KONZEPT A: Populate destination dropdown
 */
function populateDestinationDropdown() {
  console.log('🎯 [DROPDOWN] Populating destination dropdown...');
  
  const select = document.getElementById('destinationSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">Select destination...</option>';
  
  if (destinations.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No destinations configured';
    option.disabled = true;
    select.appendChild(option);
    return;
  }
  
  // Group webhooks
  const webhooks = destinations.filter(d => d.type === 'webhook');
  if (webhooks.length > 0) {
    const webhookGroup = document.createElement('optgroup');
    webhookGroup.label = '━━━━━━ WEBHOOKS ━━━━━━';
    webhooks.forEach(webhook => {
      const option = new Option(webhook.displayName, webhook.id);
      webhookGroup.appendChild(option);
    });
    select.appendChild(webhookGroup);
  }

  console.log('🎯 [DROPDOWN] Populated with', destinations.length, 'destinations');
}

/**
 * 🎯 KONZEPT A: Render fields based on selected destination
 */
async function renderFieldsForDestination(destinationId) {
  console.log('🎯 [RENDER] Rendering fields for:', destinationId);
  
  const dynamicContent = document.getElementById('dynamicContent');
  const dropzone = document.getElementById('dropzone');
  const sendBtn = document.getElementById('sendBtn');
  
  if (!dynamicContent) return;
  
  dynamicContent.innerHTML = '';
  
  if (!destinationId) {
    dropzone.style.display = 'none';
    sendBtn.textContent = 'Send';
    return;
  }
  
  const destination = destinations.find(d => d.id === destinationId);
  if (!destination) {
    console.error('❌ [RENDER] Destination not found:', destinationId);
    showStatus('❌ Destination nicht gefunden', 'error');
    return;
  }
  
  currentDestination = destination;
  
  try {
    if (destination.type === 'webhook') {
      await renderWebhookFields(destination);
      sendBtn.textContent = 'Send to Webhook';
    }

    dropzone.style.display = 'block';
    
    // Restore saved form data
    await storage.restoreFormData(destinationId);
  } catch (error) {
    console.error('❌ [RENDER] Error rendering fields:', error);
    showStatus('❌ Fehler beim Rendern der Felder: ' + error.message, 'error');
  }
}

/**
 * Render webhook-specific fields
 */
async function renderWebhookFields(destination) {
  console.log('📤 [WEBHOOK] Rendering webhook fields');
  
  const dynamicContent = document.getElementById('dynamicContent');
  
  const html = `
    <div class="select-group template-group">
      <label for="templateSelect">Template:</label>
      <select id="templateSelect"></select>
    </div>
    <div id="templateDescription"></div>
    <div>
      <label for="notes">Notes and Responses:</label>
      <textarea id="notes" placeholder="Enter additional notes..." rows="10"></textarea>
    </div>
  `;
  
  dynamicContent.innerHTML = html;
  
  // Populate templates
  const templateSelect = document.getElementById('templateSelect');
  const templates = destination.config.templates || [];
  
  templateSelect.innerHTML = '<option value="">No Template</option>';
  templates.forEach(template => {
    const option = new Option(template.name, template.name);
    templateSelect.add(option);
  });
  
  // Add event listeners
  templateSelect.addEventListener('change', () => {
    updateTemplateDescription(destination.config);
    saveFormData();
  });
  
  document.getElementById('notes')?.addEventListener('input', () => {
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(saveFormData, 300);
  });
}

/**
 * Update template description
 */
function updateTemplateDescription(webhookConfig) {
  const templateSelect = document.getElementById('templateSelect');
  const descDiv = document.getElementById('templateDescription');
  
  if (!templateSelect || !descDiv) return;
  
  const selectedTemplate = templateSelect.value;
  if (!selectedTemplate) {
    descDiv.textContent = '';
    return;
  }
  
  const template = webhookConfig.templates?.find(t => t.name === selectedTemplate);
  if (template?.description) {
    descDiv.textContent = template.description;
  } else {
    descDiv.textContent = '';
  }
}

/**
 * Save form data
 */
async function saveFormData() {
  if (!currentDestination) return;
  
  try {
    const formData = {
      destinationId: currentDestination.id,
      destinationType: currentDestination.type
    };
    
    if (currentDestination.type === 'webhook') {
      formData.notes = document.getElementById('notes')?.value || '';
      formData.selectedTemplate = document.getElementById('templateSelect')?.value || '';
    }

    await storage.saveGeneralFormData(formData);
  } catch (error) {
    console.error('❌ [SAVE] Error saving form data:', error);
    showStatus('❌ Fehler beim Speichern: ' + error.message, 'error');
  }
}

/**
 * Clear form data
 */
async function clearFormData() {
  try {
    document.getElementById('dynamicContent').innerHTML = '';
    fileHandler.clearAttachments();

    await storage.saveGeneralFormData({});
    showStatus('Formular geleert', 'info');
  } catch (error) {
    console.error('❌ [CLEAR] Error clearing form:', error);
    showStatus('❌ Fehler beim Löschen: ' + error.message, 'error');
  }
}

/**
 * Initialize the popup
 */
async function initializePopup() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('🚀 [INIT] Popup opened - KONZEPT A v17 (WORKAROUND)');

  window.showStatus = showStatus;
  window.clearFormData = clearFormData;

  try {
    await storage.initializeMigration();
    await theme.init();
    fileHandler.init();
    webhookManager.init();

    // Load destinations
    await loadDestinations();
    populateDestinationDropdown();

    // Restore saved state
    const savedData = await storage.loadGeneralFormData();
    if (savedData?.destinationId) {
      document.getElementById('destinationSelect').value = savedData.destinationId;
      await renderFieldsForDestination(savedData.destinationId);
    }

    setupEventListeners();
    
    console.log('✅ [INIT] Popup initialization completed');
  } catch (error) {
    console.error('❌ [INIT] Initialization error:', error);
    showStatus('❌ Fehler beim Initialisieren: ' + error.message, 'error');
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  document.getElementById('destinationSelect')?.addEventListener('change', async (e) => {
    await renderFieldsForDestination(e.target.value);
    saveFormData();
  });

  document.getElementById('sendBtn')?.addEventListener('click', () => sender.send());
  
  document.getElementById('clearBtn')?.addEventListener('click', async () => {
    if (confirm('Alle Formulardaten löschen?')) await clearFormData();
  });
  
  document.getElementById('closePopup')?.addEventListener('click', () => window.close());
  
  // 🔧 FIX: Load webhook list when opening config dialog
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    document.getElementById('configDialog')?.classList.add('active');
    webhookManager.renderWebhookList();
  });

  document.getElementById('closeConfigBtn')?.addEventListener('click', async () => {
    document.getElementById('configDialog')?.classList.remove('active');
    await loadDestinations();
    populateDestinationDropdown();
  });
}

document.addEventListener('DOMContentLoaded', initializePopup);
