/**
 * Storage Module - KONZEPT A Compatible
 * Version 5.0 - Unified destination storage
 */

export const storage = {
  /**
   * Initialize storage migration
   */
  async initializeMigration() {
    try {
      console.log('🔄 [MIGRATION] Starting migration check...');
      const localData = await chrome.storage.local.get(null);
      
      const { webhookConfigs, ...dataToMigrate } = localData;
      
      if (Object.keys(dataToMigrate).length > 0) {
        console.log('🔄 [MIGRATION] Migrating data to session storage...');
        await chrome.storage.session.set(dataToMigrate);
        
        const keysToRemove = Object.keys(dataToMigrate);
        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
        
        console.log('✅ [MIGRATION] Migration complete');
      }
    } catch (error) {
      console.error('❌ [MIGRATION] Migration error:', error);
    }
  },

  /**
   * Save general form data
   */
  async saveGeneralFormData(formData) {
    try {
      await chrome.storage.session.set({ generalFormData: formData });
      console.log('💾 [STORAGE] Saved general form data');
    } catch (error) {
      console.error('❌ [STORAGE] Error saving general form data:', error);
    }
  },

  /**
   * Load general form data
   */
  async loadGeneralFormData() {
    try {
      const result = await chrome.storage.session.get(['generalFormData']);
      return result.generalFormData || null;
    } catch (error) {
      console.error('❌ [STORAGE] Error loading general form data:', error);
      return null;
    }
  },

  /**
   * Restore form data based on destination
   */
  async restoreFormData(destinationId) {
    const formData = await this.loadGeneralFormData();
    if (!formData || formData.destinationId !== destinationId) return;

    if (formData.destinationType === 'webhook') {
      if (formData.notes) {
        document.getElementById('notes').value = formData.notes;
      }
      if (formData.selectedTemplate) {
        document.getElementById('templateSelect').value = formData.selectedTemplate;
      }
    }
  }
};
