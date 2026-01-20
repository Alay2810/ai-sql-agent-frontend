// Global state
let activeTables = [];
let currentResults = null;
let fullTableData = {
  name: null,
  data: [],
  offset: 0,
  limit: 1000,
  total: 0
};

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  loadTables();
  setupDragAndDrop();
});

// Load all tables from backend
async function loadTables() {
  try {
    const response = await fetch('http://localhost:5000/tables');
    const data = await response.json();
    
    const container = document.getElementById('tableListContainer');
    
    if (!data.tables || data.tables.length === 0) {
      container.innerHTML = '<p class="no-tables">No tables yet. Upload a file to get started.</p>';
      return;
    }
    
    container.innerHTML = '';
    
    data.tables.forEach(table => {
      const item = document.createElement('div');
      item.className = 'table-item';
      item.draggable = true;
      item.dataset.tableName = table.tableName;
      
      // Drag events
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
      
      item.innerHTML = `
        <div class="table-item-header">
          <div class="table-item-name">📁 ${table.tableName}</div>
          <div class="table-item-info">${table.columnCount} cols | ${table.rowCount || 0} rows</div>
        </div>
        <div class="table-item-actions">
          <button onclick="viewFullTable('${table.tableName}')" class="btn-tiny" title="View Full Table">👁️ View</button>
          <button onclick="showInsertModal('${table.tableName}')" class="btn-tiny" title="Insert Row">➕ Insert</button>
          <button onclick="showUpdateModal('${table.tableName}')" class="btn-tiny" title="Update Rows">✏️ Update</button>
          <button onclick="showDeleteModal('${table.tableName}')" class="btn-tiny" title="Delete Rows">🗑️ Delete</button>
          <button onclick="confirmDropTable('${table.tableName}')" class="btn-tiny btn-danger-tiny" title="Drop Table">❌ Drop</button>
        </div>
      `;
      
      container.appendChild(item);
    });
    
    console.log(`Loaded ${data.tables.length} tables`);
  } catch (err) {
    console.error('Error loading tables:', err);
    showStatus('Error loading tables: ' + err.message, 'error');
  }
}

// Drag and Drop Setup
function setupDragAndDrop() {
  const dropzone = document.getElementById('workspaceDropzone');
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    const tableName = e.dataTransfer.getData('text/plain');
    if (tableName) {
      addTableToWorkspace(tableName);
    }
  });
}

let draggedElement = null;

function handleDragStart(e) {
  draggedElement = e.currentTarget;
  const tableName = e.currentTarget.dataset.tableName;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', tableName);
  e.currentTarget.classList.add('dragging');
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  draggedElement = null;
}

// Add table to workspace
function addTableToWorkspace(tableName) {
  if (!activeTables.includes(tableName)) {
    activeTables.push(tableName);
    updateActiveTablesUI();
    console.log('Added table to workspace:', tableName);
  } else {
    console.log('Table already in workspace:', tableName);
  }
}

// Remove table from workspace
function removeTableFromWorkspace(tableName) {
  activeTables = activeTables.filter(t => t !== tableName);
  updateActiveTablesUI();
  
  // Clear results if no tables are active
  if (activeTables.length === 0) {
    clearResults();
  }
  
  console.log('Removed table from workspace:', tableName);
}

// Update Active Tables UI
function updateActiveTablesUI() {
  const activeTablesDiv = document.getElementById('activeTables');
  const activeTablesListDiv = document.getElementById('activeTablesList');
  const questionSection = document.getElementById('questionSection');
  const activeTablesInfo = document.getElementById('activeTablesInfo');
  const dropzoneContent = document.querySelector('.dropzone-content');
  
  if (activeTables.length === 0) {
    activeTablesDiv.style.display = 'none';
    questionSection.style.display = 'none';
    activeTablesInfo.textContent = 'No tables selected. Drag tables from sidebar.';
    dropzoneContent.style.display = 'flex';
    return;
  }
  
  dropzoneContent.style.display = 'none';
  activeTablesDiv.style.display = 'block';
  questionSection.style.display = 'block';
  
  activeTablesInfo.textContent = `Selected: ${activeTables.join(', ')}`;
  
  activeTablesListDiv.innerHTML = '';
  activeTables.forEach(tableName => {
    const badge = document.createElement('div');
    badge.className = 'active-table-badge';
    badge.innerHTML = `
      <span>📊 ${tableName}</span>
      <button onclick="removeTableFromWorkspace('${tableName}')" class="remove-badge">×</button>
    `;
    activeTablesListDiv.appendChild(badge);
  });
}

// Clear workspace
function clearWorkspace() {
  activeTables = [];
  updateActiveTablesUI();
  document.getElementById('resultsSection').style.display = 'none';
}

// Clear results output
function clearResults() {
  document.getElementById('sqlOutput').textContent = '';
  document.getElementById('resultsTable').innerHTML = '';
  document.getElementById('rowCount').textContent = '0';
  document.getElementById('warningOutput').style.display = 'none';
  document.getElementById('resultsSection').style.display = 'none';
  currentResults = [];
}

// Refresh tables list
function refreshTables() {
  console.log('🔄 Refreshing tables...');
  
  // Get button reference - use event.currentTarget for better reliability
  const btn = event?.currentTarget || event?.target || document.querySelector('.btn-refresh');
  
  if (btn) {
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Refreshing...';
    btn.style.opacity = '0.6';
    
    loadTables()
      .then(() => {
        console.log('✅ Tables refreshed successfully');
        btn.disabled = false;
        btn.innerHTML = '✅ Refreshed!';
        btn.style.opacity = '1';
        
        // Reset button text after 2 seconds
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      })
      .catch(err => {
        console.error('❌ Refresh failed:', err);
        btn.disabled = false;
        btn.innerHTML = '❌ Failed';
        btn.style.opacity = '1';
        
        // Show error and reset button
        setTimeout(() => {
          btn.innerHTML = originalText;
          alert('Failed to refresh tables. Check if backend is running at http://localhost:5000\n\nError: ' + err.message);
        }, 1000);
      });
  } else {
    // Fallback if button not found
    console.log('⚠️ Button not found, refreshing anyway...');
    loadTables().catch(err => {
      console.error('❌ Refresh failed:', err);
      alert('Failed to refresh tables. Check if backend is running at http://localhost:5000');
    });
  }
}

// Upload file
async function uploadFile() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  
  if (!file) {
    showStatus('Please select a file', 'error');
    return;
  }
  
  // Auto-generate table name from filename
  let tableName = file.name
    .replace(/\.(csv|xlsx?|json)$/i, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  
  if (!/^[a-z]/.test(tableName)) {
    tableName = 't_' + tableName;
  }
  
  showStatus('Uploading...', 'success');
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tableName', tableName);
    
    const response = await fetch('http://localhost:5000/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      showStatus('Error: ' + data.error, 'error');
    } else {
      showStatus(`✅ Table "${tableName}" created with ${data.rowCount} rows`, 'success');
      fileInput.value = '';
      
      setTimeout(() => {
        loadTables();
        addTableToWorkspace(tableName);
      }, 500);
    }
  } catch (err) {
    console.error('Upload error:', err);
    showStatus('Upload failed: ' + err.message, 'error');
  }
}

// Ask question (Multi-table support)
async function askQuestion() {
  const question = document.getElementById('questionInput').value.trim();
  
  if (activeTables.length === 0) {
    alert('Please drag at least one table to the workspace');
    return;
  }
  
  if (!question) {
    alert('Please enter a question');
    return;
  }
  
  // Show loading
  document.getElementById('sqlOutput').textContent = 'Generating SQL...';
  document.getElementById('resultsTable').innerHTML = '<tr><td class="loading">Executing query...</td></tr>';
  document.getElementById('explanationOutput').textContent = 'Processing...';
  document.getElementById('resultsSection').style.display = 'block';
  document.getElementById('warningOutput').style.display = 'none';
  
  try {
    const response = await fetch('http://localhost:5000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tables: activeTables, 
        question 
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      document.getElementById('sqlOutput').textContent = 'Error: ' + data.error;
      document.getElementById('resultsTable').innerHTML = '';
      document.getElementById('explanationOutput').textContent = '';
      return;
    }
    
    // Display SQL
    document.getElementById('sqlOutput').textContent = data.sql;
    
    // Display warning if any
    if (data.warning) {
      const warningDiv = document.getElementById('warningOutput');
      warningDiv.textContent = data.warning;
      warningDiv.style.display = 'block';
    }
    
    // Display results
    renderTable(data.results, 'resultsTable');
    currentResults = data.results;
    
    // Display explanation
    document.getElementById('explanationOutput').textContent = data.explanation;
    
    // Show row count
    document.getElementById('rowCount').textContent = data.rowCount || data.results.length;
    
  } catch (err) {
    console.error('Query error:', err);
    document.getElementById('sqlOutput').textContent = 'Error: ' + err.message;
  }
}

// Render table
function renderTable(data, tableId) {
  const table = document.getElementById(tableId);
  table.innerHTML = '';
  
  if (!data || data.length === 0) {
    table.innerHTML = '<tr><td style="text-align:center; padding:20px; color:#95a5a6;">No results</td></tr>';
    return;
  }
  
  // Header
  const headerRow = document.createElement('tr');
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);
  
  // Rows - Initially show first 25 rows, but render all for scrolling
  const rowsToShow = data.slice(0, 25);
  let displayedRows = 25;
  
  rowsToShow.forEach(row => {
    const tr = document.createElement('tr');
    Object.values(row).forEach(value => {
      const td = document.createElement('td');
      td.textContent = value !== null && value !== undefined ? value : 'NULL';
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
  
  // Add scroll event listener to load more rows dynamically
  const tableContainer = table.closest('.table-container');
  if (tableContainer && data.length > 25) {
    tableContainer.onscroll = function() {
      if (displayedRows >= data.length) return;
      
      const scrollTop = tableContainer.scrollTop;
      const scrollHeight = tableContainer.scrollHeight;
      const clientHeight = tableContainer.clientHeight;
      
      // Load more rows when scrolled to 80% of container
      if (scrollTop + clientHeight >= scrollHeight * 0.8) {
        const nextBatch = data.slice(displayedRows, displayedRows + 25);
        nextBatch.forEach(row => {
          const tr = document.createElement('tr');
          Object.values(row).forEach(value => {
            const td = document.createElement('td');
            td.textContent = value !== null && value !== undefined ? value : 'NULL';
            tr.appendChild(td);
          });
          table.appendChild(tr);
        });
        displayedRows += nextBatch.length;
      }
    };
  }
}

// Download data
async function downloadData(format) {
  if (!currentResults || currentResults.length === 0) {
    alert('No results to download');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: currentResults,
        tableName: activeTables.join('_'),
        format: format
      })
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    console.log(`${format.toUpperCase()} file downloaded`);
  } catch (err) {
    console.error('Download error:', err);
    alert('Failed to download: ' + err.message);
  }
}

// Copy SQL to clipboard
function copySQL() {
  const sql = document.getElementById('sqlOutput').textContent;
  navigator.clipboard.writeText(sql).then(() => {
    alert('SQL copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// View full table
async function viewFullTable(tableName) {
  fullTableData.name = tableName;
  fullTableData.offset = 0;
  
  document.getElementById('fullTableTitle').textContent = `📊 ${tableName} - Full View`;
  document.getElementById('fullTableModal').style.display = 'flex';
  
  await loadFullTableData();
}

async function loadFullTableData() {
  try {
    const response = await fetch(
      `http://localhost:5000/table/${fullTableData.name}/full?offset=${fullTableData.offset}&limit=${fullTableData.limit}`
    );
    const data = await response.json();
    
    if (data.error) {
      alert('Error loading table: ' + data.error);
      return;
    }
    
    fullTableData.data = data.data;
    fullTableData.total = data.total;
    
    renderTable(data.data, 'fullTableData');
    
    // Update pagination
    const currentPage = Math.floor(fullTableData.offset / fullTableData.limit) + 1;
    const totalPages = Math.ceil(fullTableData.total / fullTableData.limit);
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages} (${fullTableData.total} total rows)`;
    
    document.getElementById('prevPageBtn').disabled = fullTableData.offset === 0;
    document.getElementById('nextPageBtn').disabled = !data.hasMore;
    
  } catch (err) {
    console.error('Error loading full table:', err);
    alert('Failed to load table data');
  }
}

function loadFullTablePage(direction) {
  if (direction === 'next') {
    fullTableData.offset += fullTableData.limit;
  } else if (direction === 'prev' && fullTableData.offset > 0) {
    fullTableData.offset -= fullTableData.limit;
  }
  loadFullTableData();
}

function closeFullTableView() {
  document.getElementById('fullTableModal').style.display = 'none';
}

// Download full table
async function downloadFullTable(format) {
  if (!fullTableData.data || fullTableData.data.length === 0) {
    alert('No data to download');
    return;
  }
  
  // Confirm if downloading partial data
  if (fullTableData.total > fullTableData.data.length) {
    if (!confirm(`This will download the current page (${fullTableData.data.length} rows). Total rows: ${fullTableData.total}. Continue?`)) {
      return;
    }
  }
  
  try {
    const response = await fetch('http://localhost:5000/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: fullTableData.data,
        tableName: fullTableData.name,
        format: format
      })
    });
    
    if (!response.ok) {
      throw new Error('Download failed');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullTableData.name}_${Date.now()}.${format === 'csv' ? 'csv' : 'xlsx'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    console.error('Download error:', err);
    alert('Failed to download: ' + err.message);
  }
}

// Search table
function searchTable() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const table = document.getElementById('fullTableData');
  const rows = table.getElementsByTagName('tr');
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(searchTerm) ? '' : 'none';
  }
}

// CRUD Operations
function showInsertModal(tableName) {
  const modal = document.getElementById('crudModal');
  const title = document.getElementById('crudModalTitle');
  const content = document.getElementById('crudModalContent');
  
  title.textContent = `➕ Insert Row into ${tableName}`;
  
  // Get table schema
  fetch(`http://localhost:5000/table/${tableName}/preview`)
    .then(res => res.json())
    .then(data => {
      const schema = data.schema;
      
      let html = '<form id="insertForm" onsubmit="executeInsert(event, \'' + tableName + '\')">';
      html += '<div class="form-grid">';
      
      schema.forEach(col => {
        if (col.COLUMN_NAME !== 'id') {
          html += `
            <div class="form-group">
              <label>${col.COLUMN_NAME} (${col.DATA_TYPE})</label>
              <input type="text" name="${col.COLUMN_NAME}" placeholder="${col.COLUMN_NAME}" />
            </div>
          `;
        }
      });
      
      html += '</div>';
      html += '<div class="modal-actions"><button type="submit" class="btn-primary">Insert</button></div>';
      html += '</form>';
      
      content.innerHTML = html;
      modal.style.display = 'flex';
    })
    .catch(err => {
      alert('Error loading table schema: ' + err.message);
    });
}

async function executeInsert(event, tableName) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = {};
  formData.forEach((value, key) => {
    if (value.trim()) {
      data[key] = value;
    }
  });
  
  try {
    const response = await fetch('http://localhost:5000/crud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'INSERT',
        tableName: tableName,
        data: data
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('✅ Row inserted successfully!');
      closeCrudModal();
      loadTables();
    } else {
      alert('❌ Error: ' + result.error);
    }
  } catch (err) {
    alert('Failed to insert: ' + err.message);
  }
}

function showUpdateModal(tableName) {
  const modal = document.getElementById('crudModal');
  const title = document.getElementById('crudModalTitle');
  const content = document.getElementById('crudModalContent');
  
  title.textContent = `✏️ Update ${tableName}`;
  
  content.innerHTML = `
    <p class="hint">Use plain English to update rows. Examples:</p>
    <ul class="hint-list">
      <li>"Set price to 500 where product = 'Laptop'"</li>
      <li>"Update status to 'active' where id > 100"</li>
    </ul>
    <form onsubmit="executeUpdateViaAI(event, '${tableName}')">
      <textarea name="updateQuery" rows="3" placeholder="Describe the update..." required></textarea>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">Execute Update</button>
      </div>
    </form>
  `;
  
  modal.style.display = 'flex';
}

async function executeUpdateViaAI(event, tableName) {
  event.preventDefault();
  const query = event.target.updateQuery.value;
  
  if (!confirm('⚠️ This will modify data. Continue?')) {
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tables: [tableName],
        question: query
      })
    });
    
    const result = await response.json();
    
    if (result.error) {
      alert('❌ Error: ' + result.error);
    } else {
      alert(`✅ Update executed! ${result.affectedRows || 0} rows affected.`);
      closeCrudModal();
      loadTables();
    }
  } catch (err) {
    alert('Failed to execute update: ' + err.message);
  }
}

function showDeleteModal(tableName) {
  const modal = document.getElementById('crudModal');
  const title = document.getElementById('crudModalTitle');
  const content = document.getElementById('crudModalContent');
  
  title.textContent = `🗑️ Delete from ${tableName}`;
  
  content.innerHTML = `
    <p class="hint">Use plain English to delete rows. Examples:</p>
    <ul class="hint-list">
      <li>"Delete where id = 5"</li>
      <li>"Remove all rows where status = 'inactive'"</li>
    </ul>
    <form onsubmit="executeDeleteViaAI(event, '${tableName}')">
      <textarea name="deleteQuery" rows="3" placeholder="Describe what to delete..." required></textarea>
      <div class="modal-actions">
        <button type="submit" class="btn-danger">Execute Delete</button>
      </div>
    </form>
  `;
  
  modal.style.display = 'flex';
}

async function executeDeleteViaAI(event, tableName) {
  event.preventDefault();
  const query = event.target.deleteQuery.value;
  
  if (!confirm('⚠️ This will permanently delete data. Continue?')) {
    return;
  }
  
  try {
    const response = await fetch('http://localhost:5000/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tables: [tableName],
        question: query
      })
    });
    
    const result = await response.json();
    
    if (result.error) {
      alert('❌ Error: ' + result.error);
    } else {
      alert(`✅ Delete executed! ${result.affectedRows || 0} rows affected.`);
      closeCrudModal();
      loadTables();
    }
  } catch (err) {
    alert('Failed to execute delete: ' + err.message);
  }
}

function confirmDropTable(tableName) {
  const modal = document.getElementById('confirmModal');
  const message = document.getElementById('confirmMessage');
  const confirmBtn = document.getElementById('confirmBtn');
  
  message.textContent = `Are you sure you want to DROP table "${tableName}"? This cannot be undone!`;
  
  confirmBtn.onclick = async () => {
    try {
      const response = await fetch('http://localhost:5000/crud', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'DROP',
          tableName: tableName
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Table dropped successfully!');
        closeConfirmModal();
        removeTableFromWorkspace(tableName);
        loadTables();
      } else {
        alert('❌ Error: ' + result.error);
      }
    } catch (err) {
      alert('Failed to drop table: ' + err.message);
    }
  };
  
  modal.style.display = 'flex';
}

function closeCrudModal() {
  document.getElementById('crudModal').style.display = 'none';
}

function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('uploadStatus');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.style.display = 'block';
  
  if (type === 'success') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}
