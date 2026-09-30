document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('statusBadge');
  const workspacePath = document.getElementById('workspacePath');
  const refreshBtn = document.getElementById('refreshBtn');

  function checkStatus() {
    statusBadge.textContent = 'Checking...';
    statusBadge.className = 'badge';

    chrome.runtime.sendMessage({ action: 'CHECK_HEALTH' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        statusBadge.textContent = 'Offline';
        statusBadge.className = 'badge badge-offline';
        workspacePath.textContent = 'Python server not running on port 3387';
        return;
      }

      statusBadge.textContent = 'Online';
      statusBadge.className = 'badge badge-online';
      workspacePath.textContent = response.data.workspace || 'Connected';
    });
  }

  refreshBtn.addEventListener('click', checkStatus);

  const switchWorkspaceBtn = document.getElementById('switchWorkspaceBtn');
  const newWorkspaceInput = document.getElementById('newWorkspaceInput');
  const browseFolderBtn = document.getElementById('browseFolderBtn');

  if (browseFolderBtn) {
    browseFolderBtn.addEventListener('click', () => {
      const origHtml = browseFolderBtn.innerHTML;
      browseFolderBtn.innerHTML = '<span>⏳</span> Opening...';
      browseFolderBtn.disabled = true;

      chrome.runtime.sendMessage({ action: 'BROWSE_FOLDER' }, (res) => {
        browseFolderBtn.innerHTML = origHtml;
        browseFolderBtn.disabled = false;

        if (chrome.runtime.lastError || !res || !res.success) {
          alert('Failed to open file picker: ' + (res?.error || 'Local server offline. Run python backend on :3387.'));
          return;
        }

        if (res.data?.selected) {
          checkStatus();
        }
      });
    });
  }

  if (switchWorkspaceBtn && newWorkspaceInput) {
    switchWorkspaceBtn.addEventListener('click', () => {
      const target = newWorkspaceInput.value.trim();
      if (!target) return;
      switchWorkspaceBtn.textContent = '...';
      chrome.runtime.sendMessage({
        action: 'SET_WORKSPACE',
        payload: { workspace_path: target }
      }, (res) => {
        switchWorkspaceBtn.textContent = 'Switch';
        if (chrome.runtime.lastError || !res || !res.success) {
          alert('Failed to switch workspace: ' + (res?.error || 'Invalid directory'));
        } else {
          newWorkspaceInput.value = '';
          checkStatus();
        }
      });
    });
  }

  checkStatus();
});
