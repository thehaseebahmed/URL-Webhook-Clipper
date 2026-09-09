/**
 * Background Service Worker
 * FIX: Context menu duplicate ID errors
 * - Added removeAll() before menu creation
 * - Added initialization guard
 * - Added error handling
 */

let destinations = [];
let webhookConfigs = [];
let isRebuildingMenu = false; // ← Guard flag

// Service workers are ephemeral; hydrate in-memory caches on startup.
loadDestinations({ rebuildMenu: true });

// Load destinations on startup
chrome.runtime.onStartup.addListener(loadDestinations);
chrome.runtime.onInstalled.addListener(async (details) => {
  await loadDestinations();
  if (details.reason === 'update') {
    await chrome.storage.local.remove('airtableConfigs');
  }
  console.log('✅ [BACKGROUND] Extension installed, context menu created');
});

// Load destinations from storage
async function loadDestinations({ rebuildMenu = true } = {}) {
  try {
    // Load webhooks from sync storage
    const syncData = await chrome.storage.sync.get(['webhookConfigs']);
    webhookConfigs = syncData.webhookConfigs || [];

    // Build webhook destinations (with templates)
    const webhookDestinations = [];
    webhookConfigs.forEach(webhook => {
      if (webhook.templates && webhook.templates.length > 0) {
        // Add each template as a separate destination
        webhook.templates.forEach(template => {
          webhookDestinations.push({
            id: `${webhook.id}|${template.name}`,
            name: `${webhook.name} - ${template.name}`,
            type: 'webhook',
            webhookId: webhook.id,
            templateName: template.name
          });
        });
      } else {
        // No templates - add webhook directly
        webhookDestinations.push({
          id: webhook.id,
          name: webhook.name,
          type: 'webhook',
          webhookId: webhook.id,
          templateName: null
        });
      }
    });
    
    destinations = webhookDestinations;

    console.log('📋 [BACKGROUND] Loaded destinations:', {
      total: destinations.length,
      webhooks: webhookDestinations.length
    });
    
    // Rebuild context menu when called from lifecycle/storage updates.
    if (rebuildMenu) {
      await rebuildContextMenu();
    }
    
  } catch (error) {
    console.error('❌ [BACKGROUND] Error loading destinations:', error);
  }
}

// ✅ FIX: Rebuild context menu with proper cleanup
async function rebuildContextMenu() {
  // ✅ Guard: Prevent concurrent rebuilds
  if (isRebuildingMenu) {
    console.log('⏸️ [BACKGROUND] Menu rebuild already in progress, skipping');
    return;
  }
  
  isRebuildingMenu = true;
  
  try {
    // ✅ CRITICAL: Remove ALL existing menu items first
    await chrome.contextMenus.removeAll();
    console.log('🗑️ [BACKGROUND] Removed all existing context menu items');
    
    if (destinations.length === 0) {
      // No destinations configured - show no context menu item at all
      console.log('📋 [BACKGROUND] No destinations - context menu hidden');
      return;
    }

    // Create parent menu
    chrome.contextMenus.create({
      id: 'sendToDestination',
      title: 'Send to Webhook',
      contexts: ['page', 'selection', 'link', 'image']
    });

    // Individual webhook items (with templates)
    destinations.forEach(dest => {
      chrome.contextMenus.create({
        id: `send-${dest.id}`,
        title: dest.name,
        contexts: ['page', 'selection', 'link', 'image'],
        parentId: 'sendToDestination'
      });
    });

    console.log('✅ [BACKGROUND] Context menu rebuilt with', destinations.length, 'destinations');
    
  } catch (error) {
    console.error('❌ [BACKGROUND] Error rebuilding context menu:', error);
  } finally {
    // ✅ Release guard
    isRebuildingMenu = false;
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith('send-')) {
    const destinationId = info.menuItemId.replace('send-', '');

    // Context menu clicks can wake a cold service worker; reload from storage first.
    await loadDestinations({ rebuildMenu: false });
    const destination = destinations.find(d => d.id === destinationId);
    
    if (!destination) {
      console.error('❌ [BACKGROUND] Destination not found:', destinationId);
      return;
    }
    
    console.log('📤 [BACKGROUND] Sending to:', destination.name);
    
    // Prepare payload
    const payload = {
      url: info.linkUrl || info.srcUrl || tab.url,
      title: tab.title,
      notes: info.selectionText || '',
      timestamp: new Date().toISOString(),
      contextType: info.contexts?.[0] || 'page'
    };
    
    // Try to get meta description
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.querySelector('meta[name="description"]')?.content || ''
      });
      payload.metaDescription = results?.[0]?.result || '';
    } catch (error) {
      console.warn('⚠️ [BACKGROUND] Could not get meta description:', error.message);
    }
    
    // Send to destination
    try {
      if (destination.type === 'webhook') {
        await sendToWebhook(destination, payload);
      }
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Sent Successfully',
        message: `Sent to ${destination.name}`
      });
      
    } catch (error) {
      console.error('❌ [BACKGROUND] Send error:', error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Send Failed',
        message: error.message
      });
    }
  }
});

// Format timestamp in German locale
function formatTimestamp(date) {
  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('de-DE', options);
}

// Send to webhook
async function sendToWebhook(destination, payload) {
  const webhook = webhookConfigs.find(w => w.id === destination.webhookId);
  
  if (!webhook?.url) {
    throw new Error('Webhook configuration not found');
  }
  
  const webhookPayload = {
    url: payload.url,
    title: payload.title,
    notes: payload.notes,
    template: destination.templateName || '',
    metaDescription: payload.metaDescription || '',
    timestamp: formatTimestamp(new Date()),
    attachments: []
  };
  
  console.log('📤 [BACKGROUND] Webhook payload:', webhookPayload);

  const headers = { 'Content-Type': 'application/json' };
  (webhook.headers || []).forEach(h => {
    const key = h.key?.trim();
    if (key) headers[key] = h.value ?? '';
  });

  const response = await fetch(webhook.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(webhookPayload)
  });
  
  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
  }
  
  console.log('✅ [BACKGROUND] Webhook sent successfully');
}

// ✅ FIX: Debounced storage change handler
let storageChangeTimeout = null;

chrome.storage.sync.onChanged.addListener((changes) => {
  if (changes.webhookConfigs) {
    console.log('🔄 [BACKGROUND] Webhooks changed, scheduling reload');
    
    // ✅ Debounce: Wait 500ms before reloading
    clearTimeout(storageChangeTimeout);
    storageChangeTimeout = setTimeout(() => {
      loadDestinations();
    }, 500);
  }
});

console.log('✅ [BACKGROUND] Service worker initialized with duplicate fix');
