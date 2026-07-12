// ==========================================================
// admin-dashboard.js
// Admin Dashboard Logic (DEBUG VERSION)
// ==========================================================

let allUsers = [];
let allPayments = [];
let selectedUserId = null;

// Admin login check
auth.onAuthStateChanged(async function(user) {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  if (user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    window.location.href = 'user-dashboard.html';
    return;
  }

  await loadAllUsers();
  await loadPendingPayments();
});

// ==========================================================
// සියලුම Users Load කිරීම (DEBUG MODE)
// ==========================================================
async function loadAllUsers() {
  const debugBox = document.createElement('div');
  debugBox.style.cssText = 'background:#fff;color:#000;padding:15px;margin:10px 0;border-radius:8px;font-size:12px;word-break:break-all;';
  debugBox.id = 'debugBox';
  document.querySelector('.dashboard-container').prepend(debugBox);

  try {
    debugBox.innerHTML = 'STEP 1: Checking auth... UID=' + (auth.currentUser ? auth.currentUser.uid : 'NULL') + ' Email=' + (auth.currentUser ? auth.currentUser.email : 'NULL');

    const snapshot = await db.collection('users').get();

    debugBox.innerHTML += '<br>STEP 2: Query success. Docs found=' + snapshot.size;

    allUsers = [];
    snapshot.forEach(doc => {
      allUsers.push({ id: doc.id, ...doc.data() });
    });

    debugBox.innerHTML += '<br>STEP 3: allUsers array length=' + allUsers.length;
    if (allUsers.length > 0) {
      debugBox.innerHTML += '<br>First user data: ' + JSON.stringify(allUsers[0]);
    }

    renderUsersTable(allUsers);
    renderSummary();

    debugBox.innerHTML += '<br>STEP 4: Render complete.';

  } catch (error) {
    debugBox.innerHTML += '<br><strong style="color:red;">ERROR: ' + error.code + ' - ' + error.message + '</strong>';
  }
}

function renderSummary() {
  document.getElementById('totalUsers').textContent = allUsers.length;
  document.getElementById('pendingUsers').textContent = allUsers.filter(u => !u.accountApproved).length;
  document.getElementById('activeBots').textContent = allUsers.filter(u => u.botStatus).length;
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#9ec9a8;">Users කිසිවක් නැහැ</td></tr>';
    return;
  }

  users.forEach(u => {
    const remaining = (u.amountDue || 0) - (u.amountPaid || 0);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(u.username || '-')}</td>
      <td>${escapeHtml(u.email || '-')}</td>
      <td><span class="badge ${u.botStatus ? 'on' : 'off'}">${u.botStatus ? 'ON' : 'OFF'}</span></td>
      <td><span class="badge ${u.accountApproved ? 'approved' : 'pending'}">${u.accountApproved ? 'Yes' : 'No'}</span></td>
      <td><span class="badge ${u.paymentStatus === 'done' ? 'done' : 'pending'}">${u.paymentStatus || 'pending'}</span></td>
      <td>${remaining > 0 ? 'රු.' + remaining + ' ඉතිරි' : (u.amountDue ? 'සම්පූර්ණයි' : '-')}</td>
      <td>
        <button class="action-btn approve" onclick="approveUser('${u.id}')">Approve</button>
        <button class="action-btn reject" onclick="rejectUser('${u.id}')">Reject</button>
        <button class="action-btn toggle" onclick="toggleBot('${u.id}', ${!u.botStatus})">Bot ${u.botStatus ? 'OFF' : 'ON'} කරන්න</button>
        <button class="action-btn toggle" onclick="openUserModal('${u.id}')">Details</button>
        <button class="action-btn delete" onclick="deleteUser('${u.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==========================================================
// Search/Filter
// ==========================================================
function filterUsers() {
  const query = document.getElementById('searchUser').value.toLowerCase();
  const filtered = allUsers.filter(u =>
    (u.username || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query)
  );
  renderUsersTable(filtered);
}

// ==========================================================
// Approve / Reject User
// ==========================================================
async function approveUser(userId) {
  try {
    await db.collection('users').doc(userId).update({
      accountApproved: true,
      botStatus: true
    });
    alert('User approve උනා. Bot එකත් ON උනා.');
    await loadAllUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function rejectUser(userId) {
  if (!confirm('මේ user ගේ ගිණුම reject/revoke කරන්නද? Bot එක OFF වෙනවා.')) return;

  try {
    await db.collection('users').doc(userId).update({
      accountApproved: false,
      botStatus: false
    });
    alert('User reject/revoke කරලා. Bot එක OFF උනා.');
    await loadAllUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ==========================================================
// Bot ON/OFF Toggle
// ==========================================================
async function toggleBot(userId, newStatus) {
  try {
    await db.collection('users').doc(userId).update({
      botStatus: newStatus
    });
    await loadAllUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ==========================================================
// User Delete කිරීම
// ==========================================================
async function deleteUser(userId) {
  if (!confirm('මේ user ගේ ගිණුම සම්පූර්ණයෙන්ම delete කරන්නද? මේක undo කරන්න බැහැ!')) return;

  try {
    await db.collection('users').doc(userId).delete();
    alert('User ගිණුම delete උනා.');
    await loadAllUsers();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ==========================================================
// User Modal (Details + Amount Due + AI Test)
// ==========================================================
function openUserModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  selectedUserId = userId;

  document.getElementById('modalUsername').textContent = user.username || 'Unknown';
  document.getElementById('modalEmail').textContent = user.email || '';
  document.getElementById('modalAmountDue').value = user.amountDue || 0;
  document.getElementById('modalBusinessInfo').textContent = user.businessInfo || 'තවම business info දාලා නැහැ';
  document.getElementById('aiTestResult').style.display = 'none';
  document.getElementById('testMessage').value = '';

  document.getElementById('userModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('userModal').classList.add('hidden');
  selectedUserId = null;
}

// ==========================================================
// Amount Due Update කිරීම
// ==========================================================
async function updateAmountDue() {
  const amount = parseFloat(document.getElementById('modalAmountDue').value);

  if (isNaN(amount) || amount < 0) {
    alert('වලංගු ගානක් දාන්න');
    return;
  }

  try {
    const user = allUsers.find(u => u.id === selectedUserId);
    const paid = user.amountPaid || 0;

    let paymentStatus = 'pending';
    if (paid >= amount && amount > 0) paymentStatus = 'done';
    else if (paid > 0) paymentStatus = 'partial';

    await db.collection('users').doc(selectedUserId).update({
      amountDue: amount,
      paymentStatus: paymentStatus
    });

    alert('Amount due update උනා!');
    await loadAllUsers();
    closeModal();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ==========================================================
// AI Reply Test කිරීම
// ==========================================================
async function testAIReply() {
  const testMsg = document.getElementById('testMessage').value.trim();
  const resultEl = document.getElementById('aiTestResult');

  if (!testMsg) {
    alert('Test message එකක් ටයිප් කරන්න');
    return;
  }

  const user = allUsers.find(u => u.id === selectedUserId);
  resultEl.style.display = 'block';
  resultEl.textContent = 'AI Response එක ලබාගනිමින්...';

  try {
    const response = await fetch('https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/testAIReply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: testMsg,
        businessInfo: user.businessInfo || '',
        welcomeMessage: user.welcomeMessage || ''
      })
    });

    const data = await response.json();
    resultEl.textContent = 'AI Reply: ' + data.reply;

  } catch (error) {
    resultEl.textContent = 'Error: Cloud Function එක තවම deploy කරලා නැහැ, හෝ URL එක වැරදියි.';
  }
}

// ==========================================================
// Pending Payments Load කිරීම
// ==========================================================
async function loadPendingPayments() {
  const container = document.getElementById('pendingPayments');

  try {
    const snapshot = await db.collection('payments')
      .where('status', '==', 'pending_review')
      .get();

    if (snapshot.empty) {
      container.innerHTML = '<p style="color:#9ec9a8;">සමීක්ෂණය කරන්න payments නැහැ</p>';
      return;
    }

    container.innerHTML = '';
    snapshot.forEach(doc => {
      const p = doc.data();
      const div = document.createElement('div');
      div.className = 'payment-item';
      div.innerHTML = `
        <strong>${escapeHtml(p.userEmail)}</strong> - රු.${p.paidAmount}<br>
        <a href="${p.fileUrl}" target="_blank" style="color:#4ade80;">Slip එක බලන්න</a><br>
        <button class="action-btn approve" onclick="approvePayment('${doc.id}')">Payment Approve කරන්න</button>
        <button class="action-btn reject" onclick="rejectPayment('${doc.id}')">Reject කරන්න</button>
      `;
      container.appendChild(div);
    });

  } catch (error) {
    console.error('Error loading payments:', error);
  }
}

async function approvePayment(paymentId) {
  try {
    await db.collection('payments').doc(paymentId).update({ status: 'approved' });
    alert('Payment approve උනා!');
    await loadPendingPayments();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function rejectPayment(paymentId) {
  try {
    await db.collection('payments').doc(paymentId).update({ status: 'rejected' });
    alert('Payment reject උනා.');
    await loadPendingPayments();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ==========================================================
// Logout
// ==========================================================
function logout() {
  auth.signOut().then(() => {
    window.location.href = 'index.html';
  });
}
