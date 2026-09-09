# Send to Webhook

A Chrome extension for clipping URLs, notes, and files to webhooks with right-click context menu support.

## Version 1.0.0 - Latest Updates

### 🎉 New in Version 1.0.0
- ✅ **Rebrand**: "URL Webhook Clipper" is now "Send to Webhook"
- ✅ **Webhook-Only**: Airtable integration removed to keep the extension focused and simple
- ✅ **Right-Click Context Menu**: Send content directly from any webpage via context menu — hidden entirely when no webhook is configured
- ✅ **Clean Vertical Field Layout**: Apple-style form design with perfect alignment
- ✅ **Improved UX**: Streamlined interface with better visual hierarchy
- ✅ **Enhanced Error Handling**: Clear, contextual error messages
- ✅ **Session Persistence**: Form data persists during browser session

### 🔥 Version 1.0.0 Highlights

#### **Context Menu Integration**
- Right-click on any page, link, image, or selected text
- Choose a webhook destination from the "Send to Webhook" submenu
- Automatic payload creation with URL, title, and selection
- Success/error notifications
- Menu item is hidden entirely until at least one webhook is configured

#### **Destination Management**
- Dropdown listing all configured webhook destinations
- Dynamic field rendering based on selection

#### **Apple-Style Design**
- Clean vertical field alignment
- Generous spacing and padding
- Smooth transitions and focus states
- Professional, modern interface

## Features

### Core Functionality
- 📋 **Clip URLs**: Capture current tab URL and title
- 📝 **Add Notes**: Include custom notes with your clips
- 📎 **Attach Files**: Drag & drop or select files (up to 10MB)
- 🖱️ **Right-Click Menu**: Send content directly from context menu
- 🎨 **Dark Mode**: Automatic theme switching
- 💾 **Session Persistence**: Form data persists during browser session

### Webhook Support
- 🔄 **Multiple Webhooks**: Configure multiple webhook destinations
- 🔐 **Custom Headers**: Add custom HTTP headers (e.g. `Authorization`) per webhook
- 🏷️ **Templates**: Organize clips with custom templates
- 📤 **Import/Export**: Backup and restore webhook configurations
- ✅ **Test Connection**: Verify webhook URLs before sending

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Usage

### Basic Workflow

1. Click the extension icon to open the popup
2. Select a webhook destination
3. Add notes (optional)
4. Attach files (optional)
5. Click "Send to Webhook"

### Context Menu Workflow

1. Right-click on any page, link, image, or selected text
2. Hover over "Send to Webhook"
3. Choose your destination from the submenu
4. Content is sent automatically
5. Receive success/error notification

### Session Persistence

- **Auto-Save**: Form data automatically saves as you type (500ms debounce)
- **Persistent Fields**: Notes, destination selection, and attachments
- **Session-Only**: Data persists only during browser session (clears on browser restart)
- **Auto-Clear**: Data automatically clears after successful send or on error
- **Manual Clear**: Use "Clear Form" button to reset all fields
- **Dynamic URL**: Current tab URL is always fetched fresh at send time

### Webhook Configuration

1. Click "⚙️ Configure" to open settings
2. Add new webhooks with labels and URLs
3. Create templates for each webhook
4. Add descriptions to templates for context
5. Test connection before saving
6. Save configurations

### Import/Export

- **Export**: Backup your webhook configurations to JSON
- **Import**: Restore configurations from JSON file

## File Structure

```
Send-to-Webhook/
├── manifest.json           # Extension manifest (v1.0.0)
├── background.js          # Background service worker with context menu
├── popup/
│   ├── popup.html        # Main popup UI
│   ├── popup.js          # Main orchestration script
│   ├── styles.css        # All styles (Apple-style design)
│   └── modules/          # Modular architecture
│       ├── storage.js    # Session storage management
│       ├── theme.js      # Dark mode handling
│       ├── fileHandler.js # File attachment logic
│       ├── sender.js     # Webhook sending logic
│       └── webhookManager.js # Webhook CRUD operations
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Technical Details

### Storage Architecture

- **Session Storage** (`chrome.storage.session`): 
  - Form data (notes, selections, attachments)
  - Temporary, clears on browser restart
  - Auto-saves with debouncing
  
- **Sync Storage** (`chrome.storage.sync`):
  - Webhook configurations
  - Theme preference
  - Persistent across browser sessions

### Context Menu Architecture

- **Dynamic Menu Building**: Context menu updates automatically when destinations change
- **Smart Payload Creation**: Automatically extracts URL, title, selection, and meta description
- **Error Handling**: Shows notifications for success/failure
- **Storage Monitoring**: Listens for config changes and rebuilds menu
- **Empty State**: No menu item is shown at all when no webhook is configured

### Permissions

- `activeTab`: Access current tab information
- `storage`: Store configurations and session data
- `scripting`: Extract meta descriptions from pages
- `contextMenus`: Right-click menu integration
- `notifications`: User notifications

### Supported File Types

- Documents: PDF, DOC, DOCX, XLS, XLSX, TXT
- Images: JPG, JPEG, PNG, GIF, WEBP, SVG

## Development

### Module Structure

Each module is self-contained and exports its functionality:

- **storage.js**: Handles all session storage operations
- **theme.js**: Manages dark mode state and UI
- **fileHandler.js**: Processes file attachments
- **sender.js**: Sends data to webhooks
- **webhookManager.js**: Manages webhook configurations

### Adding New Features

1. Create a new module in `popup/modules/`
2. Export functions from the module
3. Import and initialize in `popup.js`
4. Add UI elements to `popup.html`
5. Style in `styles.css`

### Key Design Patterns

- **ES6 Modules**: Clean imports/exports with `type="module"`
- **Dependency Injection**: Modules communicate through main orchestrator
- **Separation of Concerns**: Each module handles one responsibility
- **Debouncing**: Auto-save with 500ms delay to prevent excessive writes
- **Event-Driven**: Context menu and storage listeners for real-time updates

## Changelog

### Version 1.0.0 (Current) - Send to Webhook
- 🎉 **Rebrand** from "URL Webhook Clipper" to "Send to Webhook"
- ❌ **Removed Airtable integration** — webhook-only going forward
- ✅ **Context menu hidden entirely** when no webhook is configured
- ✅ **New extension icon**
- ✅ **Version reset to 1.0.0** to mark the rebrand

The entries below describe the extension's history under its previous name and
version numbering ("URL Webhook Clipper", up to v2.0), before the v1.0.0 rebrand.

### Version 2.0
- 🎉 **Right-click context menu** for Webhooks and Airtable
- ✅ **Unified destination dropdown** with visual grouping
- ✅ **Clean vertical field layout** (Apple-style)
- ✅ **Full Airtable integration** with dynamic field mapping
- ✅ **Improved error handling** with contextual messages
- ✅ **Enhanced UX** with better visual hierarchy
- ✅ **Session persistence** for form data
- ✅ **Automatic context menu updates** when configs change

### Version 1.9
- ✅ Airtable base-centric architecture
- ✅ Dynamic field rendering
- ✅ Collaborator support
- ✅ Field validation

### Version 1.8
- ✅ Modular refactoring
- ✅ Improved code organization

### Version 1.7
- ✅ Session-based persistence
- ✅ Auto-save with debouncing
- ✅ Clear Form button

### Version 1.6
- ✅ CORS fix for webhook requests
- ✅ Template descriptions

### Version 1.5
- ✅ AI Agent integration support
- ✅ Enhanced webhook response display

### Version 1.4
- ✅ Phone number to smartphone feature
- ✅ Context menu integration (initial)

### Version 1.3
- ✅ Dark mode improvements
- ✅ Import/Export functionality

### Version 1.2
- ✅ Persistent popup window
- ✅ Drag & drop file support

## Known Limitations

- Maximum 10MB file size for attachments
- Context menu limited to 6 items per submenu (Chrome limitation)

## Roadmap

### Planned Features
- 🔍 Search/filter for destinations (when 10+ destinations)
- 📊 Analytics and statistics
- 🔄 Batch operations
- 🛡️ Field validation
- 🔁 Error recovery with automatic retry

## License

MIT License - See LICENSE file for details

## Credits

Design by [Lipa LIFE](https://www.lipalife.de)

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/chris86tian/URL-Webhook-Clipper/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/chris86tian/URL-Webhook-Clipper/discussions)
- 📧 **Contact**: [Lipa LIFE](https://www.lipalife.de)

---

**Version 1.0.0** - Built with ❤️ for productivity enthusiasts
