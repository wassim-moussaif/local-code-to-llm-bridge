/**
 * Code-to-LLM Bridge Content Script
 * Injected into Google AI Studio, ChatGPT, and Claude.
 * Handles DOM Observation, Push (File Picker Modal), and Pull (Save to Local Button).
 */

(function () {
  console.log('[CodeBridge] Content script loaded on:', window.location.hostname);

  // Determine current platform
  const HOSTNAME = window.location.hostname;
  const IS_AI_STUDIO = HOSTNAME.includes('aistudio.google.com');
  const IS_GEMINI = HOSTNAME.includes('gemini.google.com');
  const IS_CHATGPT = HOSTNAME.includes('chatgpt.com');
  const IS_CLAUDE = HOSTNAME.includes('claude.ai');

  let activeModal = null;
  let cachedFiles = [];

  // ==========================================
  // 1. EXTRACTORS & HELPERS
  // ==========================================

  function parseFilenameFromSnippet(codeText, blockElement) {
    if (!codeText) return null;

    // Pattern 1: Leading comment lines e.g. // filepath: src/App.tsx, # filename: main.py, /* file: index.css */
    const firstLines = codeText.split('\n').slice(0, 5);
    for (const line of firstLines) {
      const match = line.match(/(?:file(?:name|path)?|path)[:=\s]+([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9_]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
      // Common comment comment patterns: // src/components/Header.tsx
      const commentMatch = line.match(/^(?:\/\/|#|\/\*)\s*([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9_]+)/);
      if (commentMatch && commentMatch[1]) {
        const potential = commentMatch[1].trim();
        if (potential.includes('.') && !potential.includes(' ')) {
          return potential;
        }
      }
    }

    // Pattern 2: Look in heading or parent markdown context above codeblock
    if (blockElement) {
      let prev = blockElement.previousElementSibling;
      for (let i = 0; i < 3 && prev; i++) {
        const text = prev.textContent || '';
        const match = text.match(/(?:file|filename|path|in|to)[:\s`]+([a-zA-Z0-9_\-\.\/\\]+\.[a-zA-Z0-9_]+)/i);
        if (match && match[1]) return match[1].trim();
        prev = prev.previousElementSibling;
      }
    }

    return null;
  }

  // ==========================================
  // 2. DOM OBSERVER FOR PULL (SAVE TO LOCAL)
  // ==========================================

  function attachSaveButtons() {
    let codeBlocks = [];

    if (IS_AI_STUDIO) {
      // AI Studio selectors: markdown pre blocks, ms-code-block, or code snippets
      codeBlocks = document.querySelectorAll('pre:not([data-codebridge-processed]), .code-block:not([data-codebridge-processed])');
    } else if (IS_GEMINI) {
      // Gemini web selectors: code blocks in model responses
      codeBlocks = document.querySelectorAll('code-block:not([data-codebridge-processed]), pre:not([data-codebridge-processed])');
    } else if (IS_CHATGPT) {
      // ChatGPT selectors: pre inside conversation turns
      codeBlocks = document.querySelectorAll('pre:not([data-codebridge-processed])');
    } else if (IS_CLAUDE) {
      // Claude selectors
      codeBlocks = document.querySelectorAll('pre:not([data-codebridge-processed]), div[class*="code-block"]:not([data-codebridge-processed])');
    }

    codeBlocks.forEach((block) => {
      block.setAttribute('data-codebridge-processed', 'true');

      // Find code text
      const codeElement = block.querySelector('code') || block;
      const rawText = codeElement.textContent || '';

      // Skip tiny single-line commands unless they look like code
      if (rawText.trim().split('\n').length < 2 && !rawText.includes('{') && !rawText.includes('def ')) {
        return;
      }

      const suggestedName = parseFilenameFromSnippet(rawText, block);

      // Create toolbar / header if needed
      const btn = document.createElement('button');
      btn.className = 'codebridge-pull-btn';
      btn.innerHTML = suggestedName
        ? `<span>💾 Save to <b>${suggestedName.split('/').pop()}</b></span>`
        : `<span>💾 Save to Local</span>`;
      btn.title = suggestedName ? `Save directly to ${suggestedName}` : 'Save code block to local project';

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSaveSnippet(rawText, suggestedName, btn);
      });

      // Target placement: find top bar or prepend to pre
      const headerBar = block.querySelector('div[class*="header"], div[class*="toolbar"], .code-block-header') ||
        block.previousElementSibling?.querySelector('div[class*="header"]');

      if (headerBar) {
        headerBar.appendChild(btn);
      } else {
        block.style.position = 'relative';
        btn.style.position = 'absolute';
        btn.style.top = '6px';
        btn.style.right = '40px';
        block.appendChild(btn);
      }
    });
  }

  function handleSaveSnippet(content, defaultPath, buttonEl) {
    const originalHtml = buttonEl.innerHTML;
    buttonEl.innerHTML = '<span>⏳</span> Opening Explorer...';
    buttonEl.className = 'codebridge-pull-btn';

    chrome.runtime.sendMessage(
      {
        action: 'SAVE_WITH_DIALOG',
        payload: {
          content: content.trim(),
          suggested_filename: defaultPath || ''
        }
      },
      (res) => {
        if (chrome.runtime.lastError || !res || !res.success) {
          buttonEl.textContent = '✗ Error';
          buttonEl.className = 'codebridge-pull-btn error';
          alert('Failed to save file: ' + (res?.error || 'Local server offline. Run python server on :3387.'));
          setTimeout(() => {
            buttonEl.innerHTML = originalHtml;
            buttonEl.className = 'codebridge-pull-btn';
          }, 3000);
          return;
        }

        if (!res.data || !res.data.saved) {
          // User cancelled file picker dialog
          buttonEl.innerHTML = originalHtml;
          buttonEl.className = 'codebridge-pull-btn';
          return;
        }

        const savedFilename = res.data.path ? res.data.path.split(/[\/\\]/).pop() : 'Saved';
        buttonEl.innerHTML = `<span>✓ Saved (${savedFilename})</span>`;
        buttonEl.className = 'codebridge-pull-btn success';
        setTimeout(() => {
          buttonEl.innerHTML = originalHtml;
          buttonEl.className = 'codebridge-pull-btn';
        }, 3000);
      }
    );
  }

  // ==========================================
  // 3. DOM OBSERVER FOR PUSH (LOCAL FILE PICKER)
  // ==========================================

  function attachPushButtons() {
    // Prevent duplicate buttons on page
    if (document.querySelector('.codebridge-push-btn')) {
      return;
    }

    let targetElement = null;
    let insertMode = 'append'; // 'append' or 'before'

    if (IS_AI_STUDIO) {
      targetElement = document.querySelector('ms-prompt-input, .prompt-container, .chat-input-container');
      if (!targetElement) {
        const ta = document.querySelector('textarea.textarea, textarea');
        if (ta && ta.parentElement) targetElement = ta.parentElement;
      }
    } else if (IS_GEMINI) {
      // Gemini prompt input bar
      const geminiBar = document.querySelector('.input-area-container, .chat-input-area, form.input-area, .bottom-container .input-wrapper');
      if (geminiBar) {
        targetElement = geminiBar;
      } else {
        const geminiInput = document.querySelector('rich-textarea, div.ql-editor, div[contenteditable="true"]');
        if (geminiInput && geminiInput.parentElement) targetElement = geminiInput.parentElement;
      }
    } else if (IS_CHATGPT) {
      // Look for the action toolbar containing Send/Voice/Search buttons on ChatGPT
      const actionToolbar = document.querySelector('form div[class*="flex items-center gap-1"]:has(button), form div[class*="flex items-center"]:has(button[data-testid="send-button"])');
      if (actionToolbar) {
        targetElement = actionToolbar;
        insertMode = 'prepend';
      } else {
        // Fallback to form bottom row
        const formRow = document.querySelector('form div.flex.w-full.items-center, form');
        if (formRow) {
          targetElement = formRow;
        }
      }
    } else if (IS_CLAUDE) {
      const claudeBar = document.querySelector('fieldset, div[class*="ProseMirror"]')?.parentElement;
      if (claudeBar) targetElement = claudeBar;
    }

    if (targetElement && !targetElement.querySelector('.codebridge-push-btn')) {
      const pushBtn = document.createElement('button');
      pushBtn.type = 'button';
      pushBtn.className = 'codebridge-push-btn';
      pushBtn.innerHTML = `<span>⚡</span><span>Push Code</span>`;
      pushBtn.title = 'Select local files from localhost:3387 to insert into prompt (Ctrl+Shift+K)';

      pushBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openFilePickerModal();
      });

      if (insertMode === 'prepend' && targetElement.firstChild) {
        targetElement.insertBefore(pushBtn, targetElement.firstChild);
      } else {
        targetElement.appendChild(pushBtn);
      }
    }
  }

  // ==========================================
  // 4. MODAL FILE PICKER (PUSH WORKFLOW)
  // ==========================================

  function openFilePickerModal() {
    if (activeModal) return;

    // Request files from background worker
    chrome.runtime.sendMessage({ action: 'GET_FILES' }, (res) => {
      if (chrome.runtime.lastError || !res || !res.success) {
        alert('Cannot reach localhost:3387. Please ensure backend server is running:\npython backend/main.py');
        return;
      }

      cachedFiles = (res.files || []).filter(f => !f.is_dir);
      renderModal(res.workspace, cachedFiles);
    });
  }

  function renderModal(workspace, files) {
    const backdrop = document.createElement('div');
    backdrop.className = 'codebridge-modal-backdrop';

    const selectedFilePaths = new Set();

    backdrop.innerHTML = `
      <div class="codebridge-modal">
        <div class="codebridge-modal-header">
          <div class="codebridge-modal-title">
            <span>⚡ Local Codebase</span>
            <span style="font-size:11px; font-weight:normal; color:#64748b;">${workspace}</span>
          </div>
          <button class="codebridge-modal-close" id="cbModalClose">✕</button>
        </div>
        <div class="codebridge-search-bar">
          <input type="text" class="codebridge-search-input" id="cbSearchInput" placeholder="Filter files (e.g. App.tsx, server.py, models/)..." autofocus />
        </div>
        <div class="codebridge-list-toolbar">
          <label class="codebridge-select-all-label">
            <input type="checkbox" id="cbSelectAllCheckbox" />
            <span id="cbSelectAllText">Select All (0 files)</span>
          </label>
          <div class="codebridge-toolbar-actions">
            <button type="button" class="codebridge-link-btn" id="cbDeselectAllBtn">Clear</button>
          </div>
        </div>
        <div class="codebridge-file-list" id="cbFileList"></div>
        <div class="codebridge-modal-footer">
          <span id="cbSelectedCount">0 files selected</span>
          <button class="codebridge-btn-submit" id="cbInsertBtn">Inject into Prompt</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    activeModal = backdrop;

    const fileListEl = backdrop.querySelector('#cbFileList');
    const searchInput = backdrop.querySelector('#cbSearchInput');
    const closeBtn = backdrop.querySelector('#cbModalClose');
    const insertBtn = backdrop.querySelector('#cbInsertBtn');
    const countEl = backdrop.querySelector('#cbSelectedCount');
    const selectAllCheckbox = backdrop.querySelector('#cbSelectAllCheckbox');
    const selectAllText = backdrop.querySelector('#cbSelectAllText');
    const deselectAllBtn = backdrop.querySelector('#cbDeselectAllBtn');

    let currentFilteredFiles = files;

    function updateSelectionUI() {
      countEl.textContent = `${selectedFilePaths.size} file${selectedFilePaths.size === 1 ? '' : 's'} selected`;

      // Update select-all state based on current visible list
      const totalFiltered = currentFilteredFiles.length;
      selectAllText.textContent = `Select All (${totalFiltered} file${totalFiltered === 1 ? '' : 's'})`;

      if (totalFiltered === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.disabled = true;
      } else {
        selectAllCheckbox.disabled = false;
        const selectedInFiltered = currentFilteredFiles.filter(f => selectedFilePaths.has(f.path)).length;
        if (selectedInFiltered === totalFiltered) {
          selectAllCheckbox.checked = true;
          selectAllCheckbox.indeterminate = false;
        } else if (selectedInFiltered > 0) {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = true;
        } else {
          selectAllCheckbox.checked = false;
          selectAllCheckbox.indeterminate = false;
        }
      }
    }

    function populateList(filterText = '') {
      fileListEl.innerHTML = '';
      currentFilteredFiles = files.filter(f => f.path.toLowerCase().includes(filterText.toLowerCase()));

      if (currentFilteredFiles.length === 0) {
        fileListEl.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748b;">No files matching "${filterText}"</div>`;
        updateSelectionUI();
        return;
      }

      currentFilteredFiles.forEach((file) => {
        const item = document.createElement('div');
        item.className = 'codebridge-file-item' + (selectedFilePaths.has(file.path) ? ' selected' : '');
        item.innerHTML = `
          <div class="codebridge-file-info">
            <input type="checkbox" ${selectedFilePaths.has(file.path) ? 'checked' : ''} />
            <span class="codebridge-file-path">${file.path}</span>
          </div>
          <span class="codebridge-file-size">${formatBytes(file.size)}</span>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.tagName !== 'INPUT') {
            const cb = item.querySelector('input');
            cb.checked = !cb.checked;
          }
          if (item.querySelector('input').checked) {
            selectedFilePaths.add(file.path);
            item.classList.add('selected');
          } else {
            selectedFilePaths.delete(file.path);
            item.classList.remove('selected');
          }
          updateSelectionUI();
        });

        fileListEl.appendChild(item);
      });

      updateSelectionUI();
    }

    selectAllCheckbox.addEventListener('change', () => {
      const shouldSelect = selectAllCheckbox.checked;
      currentFilteredFiles.forEach(file => {
        if (shouldSelect) {
          selectedFilePaths.add(file.path);
        } else {
          selectedFilePaths.delete(file.path);
        }
      });
      // Re-render list to reflect checked state
      populateList(searchInput.value);
    });

    deselectAllBtn.addEventListener('click', () => {
      selectedFilePaths.clear();
      populateList(searchInput.value);
    });

    populateList();

    searchInput.addEventListener('input', (e) => populateList(e.target.value));

    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    insertBtn.addEventListener('click', async () => {
      if (selectedFilePaths.size === 0) {
        alert('Please select at least one file to insert.');
        return;
      }

      insertBtn.textContent = 'Reading files...';

      // Read all selected file contents
      const filePayloads = [];
      for (const p of Array.from(selectedFilePaths)) {
        try {
          const res = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'GET_FILE_CONTENT', payload: { path: p } }, resolve);
          });
          if (res && res.success) {
            filePayloads.push(res.data);
          }
        } catch (err) {
          console.error('[CodeBridge] Error reading file:', p, err);
        }
      }

      injectFilesIntoChat(filePayloads);
      closeModal();
    });
  }

  function closeModal() {
    if (activeModal) {
      activeModal.remove();
      activeModal = null;
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ==========================================
  // 5. INJECT MARKDOWN INTO ACTIVE CHAT INPUT
  // ==========================================

  function injectFilesIntoChat(files) {
    if (!files || files.length === 0) return;

    let markdownBlock = '\n';
    files.forEach(f => {
      markdownBlock += `\n### File: \`${f.path}\`\n\`\`\`${f.extension || ''}\n${f.content}\n\`\`\`\n`;
    });

    // Locate active input
    let targetInput = null;

    if (IS_AI_STUDIO) {
      targetInput = document.querySelector('textarea.textarea, ms-prompt-input textarea, textarea');
    } else if (IS_GEMINI) {
      targetInput = document.querySelector('rich-textarea div[contenteditable="true"], div.ql-editor, textarea, div[contenteditable="true"]');
    } else if (IS_CHATGPT) {
      targetInput = document.querySelector('#prompt-textarea');
    } else if (IS_CLAUDE) {
      targetInput = document.querySelector('div[contenteditable="true"]');
    }

    if (!targetInput) {
      targetInput = document.querySelector('textarea, div[contenteditable="true"]');
    }

    if (!targetInput) {
      navigator.clipboard.writeText(markdownBlock);
      alert('Could not find active chat box. Code copied to clipboard instead!');
      return;
    }

    if (targetInput.tagName === 'TEXTAREA') {
      const prev = targetInput.value;
      targetInput.value = prev ? `${prev}\n${markdownBlock}` : markdownBlock;
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      targetInput.focus();
    } else if (targetInput.isContentEditable) {
      targetInput.focus();
      document.execCommand('insertText', false, markdownBlock);
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function injectRawSnippetIntoChat(snippetText) {
    if (!snippetText || !snippetText.trim()) return;

    let targetInput = null;
    if (IS_AI_STUDIO) {
      targetInput = document.querySelector('textarea.textarea, ms-prompt-input textarea, textarea');
    } else if (IS_GEMINI) {
      targetInput = document.querySelector('rich-textarea div[contenteditable="true"], div.ql-editor, textarea, div[contenteditable="true"]');
    } else if (IS_CHATGPT) {
      targetInput = document.querySelector('#prompt-textarea');
    } else if (IS_CLAUDE) {
      targetInput = document.querySelector('div[contenteditable="true"]');
    }

    if (!targetInput) {
      targetInput = document.querySelector('textarea, div[contenteditable="true"]');
    }

    const formatted = `\n\`\`\`\n${snippetText.trim()}\n\`\`\`\n`;

    if (!targetInput) {
      navigator.clipboard.writeText(formatted);
      alert('Could not find active chat box. Selected code copied to clipboard!');
      return;
    }

    if (targetInput.tagName === 'TEXTAREA') {
      const prev = targetInput.value;
      targetInput.value = prev ? `${prev}\n${formatted}` : formatted;
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      targetInput.focus();
    } else if (targetInput.isContentEditable) {
      targetInput.focus();
      document.execCommand('insertText', false, formatted);
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ==========================================
  // 6. FLOATING SELECTION TOOLTIP (PUSH & SAVE)
  // ==========================================

  let floatingTooltip = null;
  let activeSelectedText = '';

  function createFloatingTooltip() {
    if (floatingTooltip) return floatingTooltip;
    floatingTooltip = document.createElement('div');
    floatingTooltip.className = 'codebridge-selection-tooltip-container';
    floatingTooltip.innerHTML = `
      <button class="codebridge-tooltip-btn codebridge-tooltip-push" id="cbTooltipPush" type="button" title="Insert selected code into prompt">
        <span>⚡</span><span>Push</span>
      </button>
      <button class="codebridge-tooltip-btn codebridge-tooltip-save" id="cbTooltipSave" type="button" title="Save selected code directly to local file">
        <span>💾</span><span>Save to Local</span>
      </button>
    `;
    floatingTooltip.style.display = 'none';
    document.body.appendChild(floatingTooltip);

    floatingTooltip.addEventListener('mousedown', (e) => {
      // Prevent selection collapse on click
      e.preventDefault();
      e.stopPropagation();
    });

    const pushBtn = floatingTooltip.querySelector('#cbTooltipPush');
    const saveBtn = floatingTooltip.querySelector('#cbTooltipSave');

    pushBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const textToPush = activeSelectedText || (window.getSelection() ? window.getSelection().toString() : '');
      if (textToPush && textToPush.trim()) {
        injectRawSnippetIntoChat(textToPush);
      }
      hideFloatingTooltip();
    });

    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const textToSave = activeSelectedText || (window.getSelection() ? window.getSelection().toString() : '');
      if (textToSave && textToSave.trim()) {
        const suggested = parseFilenameFromSnippet(textToSave);
        handleSaveSnippet(textToSave, suggested, saveBtn);
      }
      hideFloatingTooltip();
    });

    return floatingTooltip;
  }

  function hideFloatingTooltip() {
    if (floatingTooltip) {
      floatingTooltip.style.display = 'none';
    }
  }

  function checkAndShowTooltip(targetEl) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hideFloatingTooltip();
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 3) {
      hideFloatingTooltip();
      return;
    }

    // Don't show tooltip when selecting inside chat inputs / textareas
    if (targetEl && (targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT' || targetEl.isContentEditable)) {
      hideFloatingTooltip();
      return;
    }

    activeSelectedText = selection.toString();

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect && (rect.width > 0 || rect.height > 0)) {
        const tooltip = createFloatingTooltip();
        const top = window.scrollY + rect.top - 46;
        const left = window.scrollX + rect.left + (rect.width / 2) - 85;

        tooltip.style.top = `${Math.max(10, top)}px`;
        tooltip.style.left = `${Math.max(10, left)}px`;
        tooltip.style.display = 'flex';
        return;
      }
    } catch (err) {
      console.warn('[CodeBridge] Tooltip position error:', err);
    }

    hideFloatingTooltip();
  }

  document.addEventListener('mouseup', (e) => {
    // If clicking inside the tooltip, ignore
    if (floatingTooltip && floatingTooltip.contains(e.target)) return;
    setTimeout(() => checkAndShowTooltip(e.target), 30);
  });

  document.addEventListener('keyup', (e) => {
    // Also support keyboard text selection (Shift + arrows)
    if (e.shiftKey) {
      setTimeout(() => checkAndShowTooltip(e.target), 30);
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (floatingTooltip && !floatingTooltip.contains(e.target)) {
      hideFloatingTooltip();
    }
  });

  // Background context menu handler
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'PUSH_SELECTION' && msg.text) {
      injectRawSnippetIntoChat(msg.text);
    } else if (msg.action === 'SAVE_SELECTION' && msg.text) {
      const dummyBtn = document.createElement('button');
      const suggested = parseFilenameFromSnippet(msg.text);
      handleSaveSnippet(msg.text, suggested, dummyBtn);
    }
  });

  // ==========================================
  // 7. GLOBAL OBSERVER INITIALIZATION
  // ==========================================

  // Keyboard shortcut Ctrl+Shift+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
      e.preventDefault();
      openFilePickerModal();
    }
  });

  // Debounced MutationObserver for dynamic SPAs
  let debounceTimeout = null;
  const observer = new MutationObserver(() => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      attachSaveButtons();
      attachPushButtons();
    }, 250);
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan
  setTimeout(() => {
    attachSaveButtons();
    attachPushButtons();
  }, 1000);

})();
