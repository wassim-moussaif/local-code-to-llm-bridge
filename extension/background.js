/**
 * Background Service Worker for Local Code-to-LLM Bridge.
 * Bypasses web-page CORS & CSP restrictions by executing fetch requests
 * to http://127.0.0.1:3387 inside extension background context.
 */

const LOCAL_SERVER_BASE = 'http://127.0.0.1:3387';

chrome.runtime.onInstalled.addListener(() => {
  console.log('[CodeBridge] Extension installed successfully.');
  
  // Register context menus for highlighted/selected text
  try {
    chrome.contextMenus.create({
      id: 'codebridge-push-selection',
      title: '⚡ Push Selection to Prompt (CodeBridge)',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'codebridge-save-selection',
      title: '💾 Save Selection to Local File (CodeBridge)',
      contexts: ['selection']
    });
  } catch (err) {
    console.warn('[CodeBridge] Context menu creation error:', err);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  if (info.menuItemId === 'codebridge-push-selection') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'PUSH_SELECTION',
      text: info.selectionText || ''
    });
  } else if (info.menuItemId === 'codebridge-save-selection') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'SAVE_SELECTION',
      text: info.selectionText || ''
    });
  }
});

// Listener for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, payload } = request;

  if (action === 'CHECK_HEALTH') {
    fetch(`${LOCAL_SERVER_BASE}/health`)
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: 'Server unreachable at localhost:3387. Ensure Python server is running.' }));
    return true; // Keep channel open for async response
  }

  if (action === 'GET_FILES') {
    fetch(`${LOCAL_SERVER_BASE}/files`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => sendResponse({ success: true, files: data.files, workspace: data.workspace }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'GET_FILE_CONTENT') {
    const url = `${LOCAL_SERVER_BASE}/file?path=${encodeURIComponent(payload.path)}`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to read file: HTTP ${res.status}`);
        return res.json();
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'SAVE_FILE') {
    fetch(`${LOCAL_SERVER_BASE}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: payload.path,
        content: payload.content
      })
    })
      .then(async res => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
        return body;
      })
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'SET_WORKSPACE') {
    fetch(`${LOCAL_SERVER_BASE}/workspace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_path: payload.workspace_path })
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'BROWSE_FOLDER') {
    fetch(`${LOCAL_SERVER_BASE}/browse-folder`, {
      method: 'POST'
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (action === 'SAVE_WITH_DIALOG') {
    fetch(`${LOCAL_SERVER_BASE}/save-dialog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: payload.content,
        suggested_filename: payload.suggested_filename || ''
      })
    })
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
