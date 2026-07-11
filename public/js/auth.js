// ==========================================================
// auth.js
// Register / Login Logic
// ==========================================================

// Tab මාරු කිරීම
function showLogin() {
  document.getElementById('loginTab').classList.add('active');
  document.getElementById('registerTab').classList.remove('active');
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('registerForm').classList.add('hidden');
}

function showRegister() {
  document.getElementById('registerTab').classList.add('active');
  document.getElementById('loginTab').classList.remove('active');
  document.getElementById('registerForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
}

// ==========================================================
// REGISTER
// ==========================================================
document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;
  const errorEl = document.getElementById('registerError');
  errorEl.textContent = '';

  if (password !== confirmPassword) {
    errorEl.textContent = 'මුරපද දෙක සමාන නැහැ';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'මුරපදය අකුරු 6කට වඩා දිග විය යුතුයි';
    return;
  }

  try {
    // Firebase Auth එකේ account එකක් හදනවා
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Firestore එකේ user profile එකක් හදනවා
    await db.collection('users').doc(user.uid).set({
      username: username,
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      botStatus: false,          // Admin approve කරන තුරු bot එක OFF
      accountApproved: false,    // Admin approval අවශ්‍යයි
      paymentStatus: 'pending',  // pending / partial / done
      amountDue: 0,
      amountPaid: 0,
      businessInfo: '',          // AI ට දෙන user ගේ business/personal විස්තර
      welcomeMessage: 'ආයුබෝවන්! අපිට ලියන්න ස්තූතියි 😊',
      connectedPlatforms: {
        whatsapp: { connected: false },
        facebook: { connected: false },
        instagram: { connected: false }
      }
    });

    alert('ලියාපදිංචිය සාර්ථකයි! Admin approval එකෙන් පස්සේ bot එක වැඩ කරයි.');
    window.location.href = 'user-dashboard.html';

  } catch (error) {
    errorEl.textContent = translateFirebaseError(error.code);
  }
});

// ==========================================================
// LOGIN
// ==========================================================
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Admin email එකද කියලා check කරනවා
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'user-dashboard.html';
    }

  } catch (error) {
    errorEl.textContent = translateFirebaseError(error.code);
  }
});

// ==========================================================
// Firebase error messages සිංහලෙන්
// ==========================================================
function translateFirebaseError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'මේ email එක දැනටමත් register වෙලා';
    case 'auth/invalid-email':
      return 'Email format එක වැරදියි';
    case 'auth/weak-password':
      return 'මුරපදය ලෙහෙසියි';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email එක හෝ මුරපදය වැරදියි';
    case 'auth/too-many-requests':
      return 'උත්සාහ කිරීම් වැඩියි. පොඩ්ඩක් ඉඳලා try කරන්න';
    default:
      return 'දෝෂයක් සිදු වුණා. ආයෙත් try කරන්න';
  }
}

// ==========================================================
// දැනටමත් login වෙලා ඉන්නවනම්, කෙළින්ම dashboard එකට යැවීම
// ==========================================================
auth.onAuthStateChanged(function(user) {
  const currentPage = window.location.pathname.split('/').pop();
  
  if (user && (currentPage === 'index.html' || currentPage === '')) {
    if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      window.location.href = 'admin-dashboard.html';
    } else {
      window.location.href = 'user-dashboard.html';
    }
  }
});
