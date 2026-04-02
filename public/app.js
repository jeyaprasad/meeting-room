let rooms = [];
let bookings = [];
let currentUser = JSON.parse(localStorage.getItem('meto_user') || 'null');

const placeholderImages = {
  1: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600",
  2: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?auto=format&fit=crop&q=80&w=600",
  3: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=600",
  4: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&q=80&w=600",
  5: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600",
  6: "https://images.unsplash.com/photo-1591970669426-0143eb662b78?q=80&w=600"
};

function navTo(sect, param = null) {
  document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
  document.getElementById(`sec-${sect}`).classList.add('active');
  if (sect === 'auth') {
    const page = document.getElementById('authPage');
    if (param === 'register') page.classList.add('register-mode');
    else page.classList.remove('register-mode');
  }
}

function toggleSlide() { document.getElementById('authPage').classList.toggle('register-mode'); }

// SECURE BACKEND LOGIN
async function submitAuth(type) {
  const isLogin = type === 'login';
  const email = document.getElementById(isLogin ? 'loginEmail' : 'regEmail').value;
  const password = document.getElementById(isLogin ? 'loginPassword' : 'regPassword').value;

  if (!email || !password) { showToast('Email and Password required', 'error'); return; }

  const payload = { email, password };
  if (!isLogin) {
    const name = document.getElementById('regName').value;
    if (!name) { showToast('Name required', 'error'); return; }
    payload.name = name;
  }

  try {
    const endpoint = isLogin ? '/api/login' : '/api/register';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      currentUser = data.user;
      localStorage.setItem('meto_user', JSON.stringify(currentUser));
      checkAuthSetup();
      navTo('app');

      // Clear password fields
      if(isLogin) document.getElementById('loginPassword').value = '';
      else document.getElementById('regPassword').value = '';
    } else {
      showToast(data.error || 'Authentication failed', 'error');
    }
  } catch (e) {
    showToast('Network error during authentication', 'error');
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('meto_user');
  sessionStorage.removeItem('meto_history');
  sessionStorage.removeItem('meto_active_tab');
  sessionStorage.removeItem('meto_active_title');
  location.reload();
}

async function checkAuthSetup() {
  if (currentUser) {
    document.getElementById('navUserName').innerText = currentUser.name;
    document.getElementById('navUserRole').innerText = "Member";
    document.getElementById('bookName').value = currentUser.name;
    document.getElementById('logoutBtn').innerText = "Log Out";

    try {
      const resR = await fetch('/rooms');
      rooms = await resR.json();
      await fetchBookings();

      const lastTab = sessionStorage.getItem('meto_active_tab') || 'rooms';
      const lastTitle = sessionStorage.getItem('meto_active_title') || 'Dashboard';
      switchAppTab(lastTab, lastTitle, true);
    } catch(e) { showToast('Error fetching backend', 'error'); }
  }
}

async function fetchBookings() {
  if (!currentUser) return;
  try {
    const res = await fetch('/bookings?email=' + encodeURIComponent(currentUser.email));
    bookings = await res.json();
    if(document.getElementById('view-rooms').classList.contains('active')) renderHeroStats();
    renderRooms();
    if(document.getElementById('view-bookings').classList.contains('active')) renderBookings();
  } catch(e) {}
}

function renderHeroStats() {
  const today = new Date().toISOString().split('T')[0];
  const busyIds = new Set(bookings.filter(b => b.date === today && b.room).map(b => b.roomId));
  document.getElementById('heroStats').innerHTML = `
    <div class="card stat-card"><div class="stat-val">${rooms.length}</div><div class="stat-lbl">Network Assets</div></div>
    <div class="card stat-card"><div class="stat-val" style="color:var(--success)">${rooms.length - busyIds.size}</div><div class="stat-lbl">Active Availability</div></div>
    <div class="card stat-card"><div class="stat-val" style="color:var(--primary)">${bookings.length}</div><div class="stat-lbl">Your System Load</div></div>
  `;
}

function renderRooms() {
  const roomSelect = document.getElementById('bookRoom');
  roomSelect.innerHTML = rooms.map(r => `<option value="${r.id}">${r.name} - ${r.location}</option>`).join('');

  document.getElementById('roomsGrid').innerHTML = rooms.map(r => {
    const features = r.amenities || [];
    return `
      <div class="card room-card" onclick="quickBook(${r.id})">
        <div class="room-visual">
          <img src="${placeholderImages[r.id % 6 + 1]}" alt="${r.name}">
        </div>
        <div class="room-body">
          <div class="room-name">${r.name}</div>
          <div style="font-size:0.85rem; color:var(--text-soft); font-weight:600; margin-bottom:6px;">📍 ${r.location}</div>
          <div class="room-cap">👤 Cap: ${r.capacity} Personnel &bull; ${r.emoji || '🏢'}</div>
          <div class="room-features">
            ${features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

function quickBook(id) {
  document.getElementById('bookRoom').value = id;
  switchAppTab('book', 'New Reservation');
}

async function checkAvailability() {
  const date = document.getElementById('availDate').value;
  const from = document.getElementById('availFrom').value;
  const duration = document.getElementById('availDuration').value;
  const loc = document.getElementById('availLocation') ? document.getElementById('availLocation').value : '';

  if(!date) { showToast('Required: Date parameter.', 'error'); return; }

  const todayStr = new Date().toISOString().split('T')[0];
  if (date === todayStr) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [h, m] = from.split(':').map(Number);
    if (h * 60 + m < currentMins) {
      showToast('Cannot search availability for past times.', 'error');
      return;
    }
  }

  try {
    let url = `/rooms/available?date=${date}&time=${from}&duration=${duration}`;
    if (loc) url += `&location=${encodeURIComponent(loc)}`;
    const res = await fetch(url);
    const data = await res.json();
    const avail = data.available_rooms || [];

    const list = document.getElementById('availableList');
    if(!avail.length) {
      list.innerHTML = `<div class="card" style="padding:40px; text-align:center; color:var(--danger); font-weight:600;">No assets match query parameters.</div>`;
      return;
    }

    list.innerHTML = avail.map(r => `
      <div class="card">
        <div style="padding:24px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap: 20px;">
            <div style="font-size:2rem; width:60px; height:60px; background:#f1f5f9; border-radius:12px; display:flex; align-items:center; justify-content:center;">${r.emoji || '🏢'}</div>
            <div>
              <div style="font-size:1.2rem; font-weight:800; color:var(--text);">${r.name}</div>
              <div style="font-size:0.9rem; color:var(--primary); font-weight:700; margin-top:2px;">📍 ${r.location}</div>
              <div style="font-size:0.9rem; color:var(--text-soft); font-weight:500; margin-top:4px;">Cap: ${r.capacity} &bull; ₹${r.price}/hr</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="selectAndBook(${r.id}, '${date}', '${from}', '${duration}')">Draft Requisition</button>
        </div>
      </div>
    `).join('');
  } catch(e) { showToast('Error fetching availability', 'error'); }
}

function selectAndBook(id, date, start, dur) {
  document.getElementById('bookRoom').value = id;
  document.getElementById('bookDate').value = date;
  document.getElementById('bookStart').value = start;
  document.getElementById('bookEnd').value = dur;
  switchAppTab('book', 'New Reservation');
}

async function createBooking() {
  const roomId = parseInt(document.getElementById('bookRoom').value);
  const title = document.getElementById('bookTitle').value.trim();
  const date = document.getElementById('bookDate').value;
  const start = document.getElementById('bookStart').value;
  const hrs = document.getElementById('bookEnd').value;

  if(!roomId || !title || !date || !start || !hrs) { showToast('Incomplete payload.', 'error'); return; }

  const todayStr = new Date().toISOString().split('T')[0];
  if (date === todayStr) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [h, m] = start.split(':').map(Number);
    if (h * 60 + m < currentMins) {
      showToast('Cannot create a booking in the past.', 'error');
      return;
    }
  }

  const room = rooms.find(r => r.id === roomId);
  const totalCost = room.price * parseInt(hrs);

  const payload = {
    ref: 'REQ-' + Math.random().toString(36).substr(2,6).toUpperCase(),
    roomId, title, date, time: start, hrs: hrs,
    total: totalCost, name: currentUser.name, email: currentUser.email
  };

  try {
    const res = await fetch('/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      fetchBookings();
      showToast(`Booking Confirmed.`, 'success');
      clearForm();
      setTimeout(() => switchAppTab('bookings', 'My Schedule'), 800);
    } else { showToast('Conflict detected', 'error'); }
  } catch(e) { showToast('Network Error', 'error'); }
}

function clearForm() {
  document.getElementById('bookTitle').value = '';
  const todayStr = new Date().toISOString().split('T')[0];
  const bookDateEl = document.getElementById('bookDate');
  bookDateEl.value = todayStr;
  bookDateEl.min = todayStr;
  document.getElementById('bookStart').value = "09:00";
  document.getElementById('bookEnd').value = 1;
}

function renderBookings() {
  const el = document.getElementById('bookingsContent');
  if(!bookings.length) {
    el.innerHTML = `<div style="padding:60px; text-align:center; color:var(--muted); font-weight:500;">Database query returned empty.</div>`;
    return;
  }
  el.innerHTML = `
    <table>
      <thead>
        <tr><th>Ref ID</th><th>Asset Node</th><th>Date</th><th>Duration</th><th>Total Cost</th><th>Status</th><th>Revoke</th></tr>
      </thead>
      <tbody>
        ${bookings.map(b => `
        <tr>
          <td><span style="font-family:monospace; color:var(--primary); font-weight:600;">${b.ref || b.id}</span></td>
          <td style="font-weight:700">${b.room || b.roomName}<br><span style="font-size:0.8rem; font-weight:600; color:var(--text-soft)">📍 ${b.location || 'Unknown Location'}</span></td>
          <td>${b.date}</td>
          <td><span style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-weight:600;">${b.time} (${b.hrs} hr)</span></td>
          <td>₹${b.total.toLocaleString()}</td>
          <td><span style="padding:4px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; background:#ecfdf5; color:var(--success);">CONFIRMED</span></td>
          <td><button class="delete-btn" onclick="deleteBooking(${b.id})">Revoke</button></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function deleteBooking(id) {
  try {
    const res = await fetch(`/bookings/${id}`, { method: 'DELETE' });
    if (res.ok) { fetchBookings(); showToast('Constraint expunged.', 'success'); }
    else { showToast('Operation failed.', 'error'); }
  } catch(e) { showToast('Command failed.', 'error'); }
}

function showToast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.innerHTML = `<span>${msg}</span>`;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

let appHistory = JSON.parse(sessionStorage.getItem('meto_history') || '[]');

function switchAppTab(id, titleText = '', isBack = false) {
  if (!currentUser && (id === 'book' || id === 'bookings' || id === 'profile')) {
    navTo('auth');
    showToast('Please sign in to access this feature.', 'error');
    return;
  }

  const ids = ['rooms', 'available', 'book', 'bookings', 'profile'];

  const activeTab = document.querySelector('.app-view.active');
  const activeId = activeTab ? activeTab.id.replace('view-', '') : null;
  const activeTitle = document.getElementById('pageTitle').innerText;

  if (!isBack && activeId && activeId !== id) {
    appHistory.push({ id: activeId, title: activeTitle });
    sessionStorage.setItem('meto_history', JSON.stringify(appHistory));
  }

  const backBtn = document.getElementById('headerBackBtn');
  if(backBtn) backBtn.style.display = appHistory.length > 0 ? 'inline-block' : 'none';

  sessionStorage.setItem('meto_active_tab', id);
  if(titleText) sessionStorage.setItem('meto_active_title', titleText);

  document.querySelectorAll('.nav-item').forEach((t, i) => { if (t) t.classList.toggle('active', ids[i] === id); });
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');

  if(titleText) document.getElementById('pageTitle').innerText = titleText;

  if(id === 'rooms') renderHeroStats();
  if(id === 'bookings') renderBookings();
  if(id === 'book') clearForm();
  if(id === 'profile') renderProfile();
}

function goBack() {
  if (appHistory.length > 0) {
    const prev = appHistory.pop();
    sessionStorage.setItem('meto_history', JSON.stringify(appHistory));
    switchAppTab(prev.id, prev.title, true);
  }
}

function renderProfile() {
  document.getElementById('profileAvatar').innerText = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('profileName').innerText = currentUser.name;
  document.getElementById('profileEmail').innerText = currentUser.email || 'No email associated';

  const totalSpent = bookings.reduce((sum, b) => sum + Number(b.total), 0);

  document.getElementById('profileTotalSpent').innerText = `₹${totalSpent.toLocaleString('en-IN')}`;
  document.getElementById('profileTotalBookings').innerText = bookings.length;
}

function init() {
  document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
  const todayStr = new Date().toISOString().split('T')[0];
  const availDateEl = document.getElementById('availDate');
  availDateEl.value = todayStr;
  availDateEl.min = todayStr;

  const bookDateEl = document.getElementById('bookDate');
  bookDateEl.value = todayStr;
  bookDateEl.min = todayStr;

  if (currentUser) {
    checkAuthSetup();
  } else {
    navTo('auth');
  }
}

init();