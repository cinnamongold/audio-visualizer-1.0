const state = {
  devices: [],
  selected: null
};

const steps = [...document.querySelectorAll('.step')];
const panels = {
  1: document.getElementById('step-1'),
  2: document.getElementById('step-2'),
  3: document.getElementById('step-3')
};

const loading = document.getElementById('loading');
const deviceList = document.getElementById('deviceList');
const refreshBtn = document.getElementById('refreshBtn');
const currentName = document.getElementById('currentName');
const currentId = document.getElementById('currentId');
const newName = document.getElementById('newName');
const backBtn = document.getElementById('backBtn');
const renameBtn = document.getElementById('renameBtn');
const resultBox = document.getElementById('resultBox');
const startOverBtn = document.getElementById('startOverBtn');

function showStep(stepNumber) {
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle('hidden', Number(key) !== stepNumber);
  });
  steps.forEach((step) => {
    step.classList.toggle('active', Number(step.dataset.step) === stepNumber);
  });
}

function renderDevices() {
  deviceList.innerHTML = '';

  if (!state.devices.length) {
    deviceList.innerHTML = '<div class="hint">No Bluetooth devices were found. Make sure Bluetooth is enabled and the device has been recognized by Windows.</div>';
    return;
  }

  state.devices.forEach((device) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'device';
    button.innerHTML = `
      <div class="device-title">${escapeHtml(device.name || 'Unnamed device')}</div>
      <div class="device-meta">Status: ${escapeHtml(device.status || 'Unknown')} · Class: ${escapeHtml(device.class || 'Unknown')}</div>
      <div class="device-meta">${escapeHtml(device.instanceId)}</div>
    `;
    button.addEventListener('click', () => selectDevice(device));
    deviceList.appendChild(button);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function loadDevices() {
  loading.textContent = 'Loading Bluetooth devices…';
  deviceList.innerHTML = '';
  refreshBtn.disabled = true;

  try {
    const res = await fetch('/api/devices');
    const data = await res.json();
    if (!res.ok) throw new Error(data.details || data.error || 'Unknown error');
    state.devices = data.devices || [];
    renderDevices();
    loading.textContent = state.devices.length
      ? 'Select the device you want to rename.'
      : 'No recognized Bluetooth devices are currently available.';
  } catch (error) {
    loading.innerHTML = `<span class="error">${escapeHtml(error.message)}</span>`;
  } finally {
    refreshBtn.disabled = false;
  }
}

function selectDevice(device) {
  state.selected = device;
  currentName.textContent = device.name || 'Unnamed device';
  currentId.textContent = device.instanceId;
  newName.value = device.name || '';
  showStep(2);
  newName.focus();
  newName.select();
}

async function renameSelected() {
  if (!state.selected) return;
  const requestedName = newName.value.trim();
  if (!requestedName) {
    alert('Please enter a new display name.');
    return;
  }

  renameBtn.disabled = true;
  resultBox.innerHTML = '<div class="hint">Sending rename request…</div>';
  showStep(3);

  try {
    const res = await fetch('/api/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: state.selected.instanceId,
        newName: requestedName
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.details || data.error || 'Rename failed');

    resultBox.innerHTML = `
      <h2 class="success">Rename requested</h2>
      <p>${escapeHtml(data.message || 'Windows accepted the rename request.')}</p>
      <p><strong>Requested name:</strong> ${escapeHtml(data.requestedName || requestedName)}</p>
      <p><strong>Current reported name:</strong> ${escapeHtml(data.currentReportedName || 'Unknown')}</p>
      <p><strong>Method:</strong> ${escapeHtml(data.method || 'Unknown')}</p>
    `;
  } catch (error) {
    resultBox.innerHTML = `
      <h2 class="error">Rename failed</h2>
      <p>${escapeHtml(error.message)}</p>
      <p>Tip: run the Node server from an Administrator PowerShell or Command Prompt, then refresh and try again.</p>
    `;
  } finally {
    renameBtn.disabled = false;
  }
}

refreshBtn.addEventListener('click', loadDevices);
backBtn.addEventListener('click', () => showStep(1));
renameBtn.addEventListener('click', renameSelected);
startOverBtn.addEventListener('click', async () => {
  showStep(1);
  await loadDevices();
});

loadDevices();
