/**
 * Sender Module - Handles webhook sending logic
 * V8.0 - FIXED: Template as separate field for Make.com filters
 */

export const sender = {
  /**
   * Send data to the selected destination
   */
  async send() {
    const sendBtn = document.getElementById('sendBtn');
    if (!sendBtn) return;

    sendBtn.disabled = true;
    this.showStatus('Sending...', 'info');

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs?.[0]?.id || !tabs[0].url) {
        throw new Error('Could not get current tab information.');
      }
      const currentTab = tabs[0];

      const basePayload = {
        url: currentTab.url,
        title: currentTab.title,
        notes: document.getElementById('notes')?.value || '',
        metaDescription: '',
        timestamp: new Date().toISOString(),
        attachments: window.attachments || []
      };

      // Try to get meta description
      const isRestrictedUrl = currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('edge://');
      if (!isRestrictedUrl) {
        try {
          const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: () => document.querySelector('meta[name="description"]')?.content || ''
          });
          basePayload.metaDescription = injectionResults?.[0]?.result || '';
        } catch (error) {
          console.warn("Could not get meta description:", error.message);
        }
      }

      const destinationSelect = document.getElementById('destinationSelect');
      if (!destinationSelect?.value) {
        throw new Error('Bitte wähle eine Destination aus');
      }

      const destinationId = destinationSelect.value;
      console.log('📤 [SEND] Selected destination:', destinationId);

      const destination = window.destinations?.find(d => d.id === destinationId);
      if (!destination) {
        throw new Error('Destination nicht gefunden');
      }

      console.log('📤 [SEND] Destination type:', destination.type);

      let result;

      if (destination.type === 'webhook') {
        result = { webhook: await this.sendToWebhook(destination, basePayload) };
        if (result.webhook.success) {
          await this.saveLastUsedDestination('webhook', destination.id, destination.name);
        }
      } else {
        throw new Error('Ungültiger Destination-Typ');
      }

      this.showResults(result, document.getElementById('notes'));

    } catch (error) {
      console.error('❌ [SEND] Error:', error);
      this.showStatus('Error: ' + error.message, 'error');
      sendBtn.disabled = false;
    }
  },

  /**
   * Save last used destination
   */
  async saveLastUsedDestination(type, id, name) {
    try {
      await chrome.storage.sync.set({ lastUsedDestination: { type, id, name } });
    } catch (error) {
      console.error('Error saving last used destination:', error);
    }
  },

  /**
   * Format timestamp in German locale
   */
  formatTimestamp(date) {
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('de-DE', options);
  },

  /**
   * Send payload to webhook URL
   * 🔧 FIX: Template as separate field for Make.com filters
   */
  async sendToWebhook(destination, payload) {
    try {
      if (!destination.config?.url) {
        throw new Error('Webhook URL fehlt in der Konfiguration');
      }

      // Get selected template
      const templateSelect = document.getElementById('templateSelect');
      const selectedTemplate = templateSelect?.value || '';

      // 🔧 FIX: Build payload with template as SEPARATE field
      const webhookPayload = {
        url: payload.url,
        title: payload.title,
        notes: payload.notes,
        template: selectedTemplate,              // ← Separate field for filters!
        metaDescription: payload.metaDescription,
        timestamp: this.formatTimestamp(new Date()),
        attachments: payload.attachments         // ← File attachments only!
      };

      const headers = { 'Content-Type': 'application/json' };
      (destination.config.headers || []).forEach(h => {
        const key = h.key?.trim();
        if (key) headers[key] = h.value ?? '';
      });

      console.log('📤 [WEBHOOK] Sending to:', destination.config.url);
      console.log('📤 [WEBHOOK] Payload (filter-compatible):', webhookPayload);

      const response = await fetch(destination.config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhookPayload)
      });

      const text = await response.text();
      
      if (!response.ok) {
        console.error('❌ [WEBHOOK] Response:', { status: response.status, text });
        throw new Error(`Webhook ${response.status} ${response.statusText}`);
      }

      console.log('✅ [WEBHOOK] Success:', response.status);
      return { success: true, status: response.status, statusText: response.statusText, response: text };
    } catch (error) {
      console.error('❌ [WEBHOOK] Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Show combined results
   */
  showResults(results, notesInput) {
    if (!results) {
        this.showStatus('No destination selected.', 'error');
        if (document.getElementById('sendBtn')) document.getElementById('sendBtn').disabled = false;
        return;
    }

    let statusMessage = '';
    let statusType = 'success';
    let notesContent = '';

    if (results.webhook) {
      if (results.webhook.success) {
        statusMessage = '✅ Webhook sent successfully';
        notesContent = `=== WEBHOOK RESPONSE ===\nStatus: ${results.webhook.status} ${results.webhook.statusText}\n\n${results.webhook.response}`;
      } else {
        statusMessage = '❌ Webhook failed';
        statusType = 'error';
        notesContent = `=== WEBHOOK ERROR ===\n${results.webhook.error}`;
      }
    }

    if (notesInput) notesInput.value = notesContent.trim();
    this.showStatus(statusMessage, statusType);
    if (document.getElementById('sendBtn')) document.getElementById('sendBtn').disabled = false;
  },

  /**
   * Show status message
   */
  showStatus(message, type) {
    if (typeof window.showStatus === 'function') {
      window.showStatus(message, type);
    }
  }
};
