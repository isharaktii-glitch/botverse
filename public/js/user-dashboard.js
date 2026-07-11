// ==========================================================
// user-dashboard.js
// User Dashboard Logic
// ==========================================================

let currentUser = null;
let currentUserData = null;

// User login වෙලාද කියලා check කරනවා
auth.onAuthStateChanged(async function(user) {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }

  // Admin කෙනා accidentally මෙතනට ආවොත් admin dashboard එකට redirect කරනවා
  if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    window.location.href = 'admin-dashboard.html';
    return;
  }

  currentUser = user;
  await loadUserData();
});

// ==========================================================
// User ගේ data Firestore එකෙන් load කිරීම
// ==========================================================
async function loadUserData() {
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (!doc.exists) return;

    currentUserData = doc.data();
    renderDashboard();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

function renderDashboard() {
  const data = currentUserData;

  // Status badge (navbar)
  document.getElementById('statusBadge').textContent = data.accountApproved ? 'Approved ✓' : 'Approval අවසර බලාපොරොත්තුවෙන්';

  // Bot status
  const botStatusEl = document.getElementById('botStatusText');
  botStatusEl.textContent = data.botStatus ? 'ON' : 'OFF';
  botStatusEl.className = 'badge ' + (data.botStatus ? 'on' : 'off');

  // Payment status
  const paymentStatusEl = document.getElementById('paymentStatusText');
  const paymentLabels = { pending: 'Pending', partial: 'Partially Paid', done: 'Paid' };
  paymentStatusEl.textContent = paymentLabels[data.paymentStatus] || 'Pending';
  paymentStatusEl.className = 'badge ' + (data.paymentStatus === 'done' ? 'done' : 'pending');

  // Approval hint
  const hintEl = document.getElementById('approvalHint');
  if (!data.accountApproved) {
    hintEl.textContent = '⚠️ ගිණුම admin අනුමත කරන තුරු bot එක වැඩ කරන්නේ නෑ. Payment එක upload කරන්න පහළින්.';
  } else {
    hintEl.textContent = '';
  }

  // Business info
  document.getElementById('businessInfo').value = data.businessInfo || '';

  // Welcome message
  document.getElementById('welcomeMsg').value = data.welcomeMessage || '';

  // Amount due
  const amountDueEl = document.getElementById('amountDueDisplay');
  if (data.amountDue > 0) {
    const remaining = data.amountDue - (data.amountPaid || 0);
    amountDueEl.textContent = `මුළු ගාන: රු.${data.amountDue} | ගෙවලා ඇත: රු.${data.amountPaid || 0} | ඉතිරි: රු.${remaining}`;
  } else {
    amountDueEl.textContent = 'ගෙවිය යුතු ගාන admin විසින් තවම සකසා නැත';
  }

  // Platform connection statuses
  const platforms = data.connectedPlatforms || {};
  updatePlatformStatus('wa', platforms.whatsapp);
  updatePlatformStatus('fb', platforms.facebook);
  updatePlatformStatus('ig', platforms.instagram);

  // Payment history load කිරීම
  loadPaymentHistory();
}

function updatePlatformStatus(prefix, platformData) {
  const statusEl = document.getElementById(prefix + 'Status');
  if (platformData && platformData.connected) {
    statusEl.textContent = 'Connected ✓';
    statusEl.classList.add('connected');
  } else {
    statusEl.textContent = 'Not Connected';
    statusEl.classList.remove('connected');
  }
}

// ==========================================================
// Business Info Save කිරීම
// ==========================================================
async function saveBusinessInfo() {
  const businessInfo = document.getElementById('businessInfo').value.trim();
  const msgEl = document.getElementById('businessSaveMsg');

  try {
    await db.collection('users').doc(currentUser.uid).update({
      businessInfo: businessInfo
    });
    msgEl.textContent = '✓ Save උනා!';
    setTimeout(() => msgEl.textContent = '', 3000);
  } catch (error) {
    msgEl.textContent = 'Error: ' + error.message;
  }
}

// ==========================================================
// Welcome Message Save කිරීම
// ==========================================================
async function saveWelcomeMsg() {
  const welcomeMsg = document.getElementById('welcomeMsg').value.trim();
  const msgEl = document.getElementById('welcomeSaveMsg');

  try {
    await db.collection('users').doc(currentUser.uid).update({
      welcomeMessage: welcomeMsg
    });
    msgEl.textContent = '✓ Save උනා!';
    setTimeout(() => msgEl.textContent = '', 3000);
  } catch (error) {
    msgEl.textContent = 'Error: ' + error.message;
  }
}

// ==========================================================
// Platform Connect කිරීම (WhatsApp / Facebook / Instagram)
// ==========================================================
async function connectPlatform(platform) {
  let updateData = {};

  if (platform === 'whatsapp') {
    const phoneId = document.getElementById('waPhoneId').value.trim();
    const token = document.getElementById('waToken').value.trim();
    const businessId = document.getElementById('waBusinessId').value.trim();

    if (!phoneId || !token || !businessId) {
      alert('කරුණාකර WhatsApp details සම්පූර්ණයෙන් දාන්න');
      return;
    }

    updateData = {
      'connectedPlatforms.whatsapp': {
        connected: true,
        phoneId: phoneId,
        accessToken: token,
        businessAccountId: businessId,
        connectedAt: firebase.firestore.FieldValue.serverTimestamp()
      }
    };
  }

  if (platform === 'facebook') {
    const pageId = document.getElementById('fbPageId').value.trim();
    const token = document.getElementById('fbToken').value.trim();

    if (!pageId || !token) {
      alert('කරුණාකර Facebook details සම්පූර්ණයෙන් දාන්න');
      return;
    }

    updateData = {
      'connectedPlatforms.facebook': {
        connected: true,
        pageId: pageId,
        accessToken: token,
        connectedAt: firebase.firestore.FieldValue.serverTimestamp()
      }
    };
  }

  if (platform === 'instagram') {
    const accountId = document.getElementById('igAccountId').value.trim();
    const token = document.getElementById('igToken').value.trim();

    if (!accountId || !token) {
      alert('කරුණාකර Instagram details සම්පූර්ණයෙන් දාන්න');
      return;
    }

    updateData = {
      'connectedPlatforms.instagram': {
        connected: true,
        accountId: accountId,
        accessToken: token,
        connectedAt: firebase.firestore.FieldValue.serverTimestamp()
      }
    };
  }

  try {
    await db.collection('users').doc(currentUser.uid).update(updateData);
    alert(platform + ' සාර්ථකව Connect උනා!');
    await loadUserData();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ==========================================================
// Payment Slip Upload කිරීම
// ==========================================================
async function uploadPaymentSlip() {
  const fileInput = document.getElementById('paymentSlip');
  const paidAmount = parseFloat(document.getElementById('paidAmount').value);
  const msgEl = document.getElementById('paymentUploadMsg');

  if (!fileInput.files[0]) {
    msgEl.textContent = 'කරුණාකර file එකක් තෝරන්න';
    return;
  }

  if (!paidAmount || paidAmount <= 0) {
    msgEl.textContent = 'කරුණාකර ගෙවපු ගාන දාන්න';
    return;
  }

  const file = fileInput.files[0];
  msgEl.textContent = 'Upload වෙමින්...';

  try {
    // Firebase Storage එකට file එක upload කිරීම
    const fileName = `payment-slips/${currentUser.uid}/${Date.now()}_${file.name}`;
    const storageRef = storage.ref(fileName);
    await storageRef.put(file);
    const fileUrl = await storageRef.getDownloadURL();

    // Firestore එකේ payment record එකක් හදනවා
    await db.collection('payments').add({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      fileUrl: fileUrl,
      fileName: file.name,
      paidAmount: paidAmount,
      status: 'pending_review',
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // User document එකේ total paid amount එක update කිරීම
    const newTotalPaid = (currentUserData.amountPaid || 0) + paidAmount;
    const amountDue = currentUserData.amountDue || 0;

    let paymentStatus = 'partial';
    if (amountDue > 0 && newTotalPaid >= amountDue) {
      paymentStatus = 'done';
    } else if (newTotalPaid === 0) {
      paymentStatus = 'pending';
    }

    await db.collection('users').doc(currentUser.uid).update({
      amountPaid: newTotalPaid,
      paymentStatus: paymentStatus
    });

    msgEl.textContent = '✓ Upload සාර්ථකයි! Admin review කරයි.';
    fileInput.value = '';
    document.getElementById('paidAmount').value = '';

    await loadUserData();

  } catch (error) {
    msgEl.textContent = 'Error: ' + error.message;
  }
}

// ==========================================================
// Payment History Load කිරීම
// ==========================================================
async function loadPaymentHistory() {
  const container = document.getElementById('paymentHistory');

  try {
    const snapshot = await db.collection('payments')
      .where('userId', '==', currentUser.uid)
      .orderBy('submittedAt', 'desc')
      .get();

    if (snapshot.empty) {
      container.innerHTML = '<p style="color:#9ec9a8;font-size:0.85rem;">තවම payment ඉතිහාසයක් නැහැ</p>';
      return;
    }

    container.innerHTML = '';
    snapshot.forEach(doc => {
      const p = doc.data();
      const statusLabel = { pending_review: 'සමීක්ෂණය කරමින්', approved: 'අනුමතයි ✓', rejected: 'ප්‍රතික්ෂේපිතයි' }[p.status] || p.status;
      container.innerHTML += `
        <div class="payment-item">
          රු.${p.paidAmount} - ${p.fileName}<br>
          තත්ත්වය: ${statusLabel}
        </div>
      `;
    });
  } catch (error) {
    console.error('Error loading payment history:', error);
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
