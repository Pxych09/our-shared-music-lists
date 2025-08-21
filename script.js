// ===== Config =====
const CONFIG = {
  BASE_URL: 'https://script.google.com/macros/s/AKfycbzlql7i4j5c1yrBrywuAsTqxmsciAaZopjkzTtM15KR4g-_S8W9F6VgfO-cW-HtMfE/exec'
};

// ===== Fetch helpers =====
const post = async (payload) => {
  try {
    showLoading(true);
    const res = await fetch(CONFIG.BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // avoids preflight
      body: JSON.stringify(payload),
    });
    return res.json();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Network error' };
  } finally {
    showLoading(false);
  }
};

const getJSON = async (params = {}) => {
  try {
    showLoading(true);
    const url = new URL(CONFIG.BASE_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { method: 'GET' });
    return res.json();
  } catch (err) {
    console.error(err);
    return { ok: false, error: 'Network error' };
  } finally {
    showLoading(false);
  }
};

// ===== State =====
let CURRENT_USER = null;

// ===== DOM =====
const $ = (sel) => document.querySelector(sel);
const auth = $('#auth');
const app = $('#app');
const who = $('#who');
const loginForm = $('#loginForm');
const addForm = $('#addForm');
const countData = $('#countData');

// Modal elements
const sessionModal = document.getElementById("sessionModal");
const countdownEl = document.getElementById("countdown");
const stayLoggedInBtn = document.getElementById("stayLoggedInBtn");
const logoutNowBtn = document.getElementById("logoutNowBtn");

// ===== UI helpers =====
const show = (el, yes) => el.classList.toggle('hidden', !yes);

const toast = (msg, type = 'info') => {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 50);
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, 2500);
};

// ===== Loading UI =====
const showLoading = (yes) => {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.classList.toggle('hidden', !yes);
};

// =======================
// Format Date Utility
// =======================
const formatDateTime = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }) + " | " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

const listEl = $('#list'); 
const songItem = (row) => {
  const containerSong = document.createElement('div');
  const listButtons = document.createElement('div');
  const panelDetails = document.createElement('div');
  const songDetail = document.createElement('div');
  const artistDetail = document.createElement('div');
  const timestampDetail = document.createElement('div');
  const accordionDetail = document.createElement('div');
  containerSong.classList.add('song-container')
  listButtons.classList.add('list-buttons')
  accordionDetail.classList.add('accordion')
  songDetail.classList.add('song')
  artistDetail.classList.add('artist')
  timestampDetail.classList.add('timestamp')
  panelDetails.classList.add('panel')

  songDetail.innerHTML = `${row.Song}`
  artistDetail.innerHTML = `${row.Artist}`
  panelDetails.innerHTML = `Created by: <span>${row['Created By'] || "-"}</span><br>Edited by: <span>${row['Edited By']|| "-"}</span>`
  timestampDetail.innerHTML = `${formatDateTime(row['Timestamp'])} <img src="https://cdn-icons-png.flaticon.com/512/6255/6255820.png" alt="icon" width="10" height="10">`

  songDetail.addEventListener('click', e => {
    e.preventDefault();
    accordionDetail.classList.toggle('toggle-panel');
    timestampDetail.classList.toggle('toggle-panel');
  });

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-success';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', async () => {
    const newSong = prompt('New song title:', row.Song);
    if (newSong === null) return;
    const newArtist = prompt('New artist:', row.Artist);
    if (newArtist === null) return;

    const r = await post({ action: 'editsong', id: row.ID, song: newSong, artist: newArtist, user: CURRENT_USER });
    if (r.ok) {
      toast('Song updated!', 'success');
      await loadList();
    } else {
      toast(r.error || 'Failed to edit', 'error');
    }
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-danger';
  delBtn.textContent = 'Delete';
  delBtn.addEventListener('click', async () => {
    if (!confirm('Delete this item?')) return;
    const r = await post({ action: 'deletesong', id: row.ID });
    if (r.ok) {
      toast('Song deleted!', 'success');
      await loadList();
    } else {
      toast(r.error || 'Failed to delete', 'error');
    }
  });

  listButtons.append(editBtn, delBtn);
  accordionDetail.append(panelDetails);
  containerSong.append(songDetail, artistDetail, listButtons, accordionDetail, timestampDetail);
  return containerSong;
}

// ===== Data loaders =====
const loadList = async () => {
  listEl.innerHTML = '<p class="muted fetch-mute">Fetching for lists of music, please wait...</p>';
  const r = await getJSON({ action: 'lists' });

  if(r.data.length >= 2) {
    countData.innerText = `There are currently ${r.data.length} songs in your lists.`
  } else if (r.data.length == 1) {
    countData.innerText = `There is only ${r.data.length} song in your list. I suggest, add more!`
  } else {
    countData.innerText = `There is none or ${r.data.length} data in your list. Add a list now?`
  }

  if (r.ok) {
    listEl.innerHTML = '';
    r.data.forEach(row => listEl.append(songItem(row)));
  } else {
    listEl.innerHTML = `<p class="muted">${r.error || 'Failed to load list.'}</p>`;
  }
};

// ===== Auth flow with session timeout =====
let sessionTimer = null;
let warningTimer = null;
let countdownInterval = null;

const SESSION_TIMEOUT = 1 * 60 * 1000; // 1 minute
const WARNING_TIME = 30 * 1000;        // warn 30s before

function resetSessionTimer() {
  if (!CURRENT_USER) return; // ✅ only run if logged in

  if (sessionTimer) clearTimeout(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  const now = new Date();
  const warnAt = new Date(now.getTime() + (SESSION_TIMEOUT - WARNING_TIME));
  const expireAt = new Date(now.getTime() + SESSION_TIMEOUT);

  console.log(`[Session] Reset at ${now.toLocaleTimeString()}`);
  console.log(`[Session] Warning at ${warnAt.toLocaleTimeString()}`);
  console.log(`[Session] Expire at ${expireAt.toLocaleTimeString()}`);

  // ⏳ Warning before timeout
  warningTimer = setTimeout(() => {
    if (!CURRENT_USER) return; // double-check
    console.warn("⚠️ Session expiring soon...");
    sessionModal.classList.remove("hidden");
    document.body.classList.add("modal-open"); // ✅ add blur

    let remaining = WARNING_TIME / 1000; // in seconds
    countdownEl.textContent = remaining;

    countdownInterval = setInterval(() => {
      remaining--;
      countdownEl.textContent = remaining;
      if (remaining <= 0) clearInterval(countdownInterval);
    }, 1000);
  }, SESSION_TIMEOUT - WARNING_TIME);

  // 🚪 Auto logout
  sessionTimer = setTimeout(() => {
    if (!CURRENT_USER) return;
    console.warn("⏱️ Session expired, logging out...");
    doLogout("⏱️ Session expired. Please log in again.");
  }, SESSION_TIMEOUT);
}

function doLogout(msg = "👋 Logged out") {
  CURRENT_USER = null;
  localStorage.removeItem("loggedUser");
  show(app, false);
  show(auth, true);
  who.textContent = "";

  // clear timers + hide modal
  if (sessionTimer) clearTimeout(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  sessionModal.classList.add("hidden");
  document.body.classList.remove("modal-open"); // ✅ remove blur

  toast(msg, "error");
}

// ✅ Modal button actions
stayLoggedInBtn.addEventListener("click", () => {
  sessionModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  resetSessionTimer();
});
logoutNowBtn.addEventListener("click", () => {
  doLogout("👋 You logged out.");
});

// ✅ On page load, check localStorage & redirect correctly
window.addEventListener("DOMContentLoaded", async () => {
  const savedUser = localStorage.getItem("loggedUser");
  if (savedUser) {
    CURRENT_USER = savedUser;
    who.textContent = CURRENT_USER;
    show(auth, false);
    show(app, true);
    await loadList();
    resetSessionTimer(); // ✅ only starts if logged in
  } else {
    show(auth, true);
    show(app, false);
  }
});

// ✅ Reset session only on activity *if logged in*
["click", "keypress", "mousemove", "scroll"].forEach(evt => {
  window.addEventListener(evt, () => {
    if (CURRENT_USER) resetSessionTimer();
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#username').value.trim();
  const password = $('#password').value.trim();

  const r = await post({ action: 'login', username, password });
  if (r.ok) {
    CURRENT_USER = r.user;
    localStorage.setItem("loggedUser", CURRENT_USER);
    who.textContent = `${CURRENT_USER}`;
    show(auth, false);
    show(app, true);
    loginForm.reset();
    await loadList();
    toast('✅ Login successful!', 'success');
    runConfetti();
    resetSessionTimer();
  } else {
    toast(r.error || '❌ Login failed', 'error');
  }
});

$('#logoutBtn').addEventListener('click', () => {
  doLogout("👋 Logged out");
  if (sessionTimer) clearTimeout(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
});

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const song = $('#song').value.trim();
  const artist = $('#artist').value.trim();
  if (!song || !artist || !CURRENT_USER) return;

  const r = await post({ action: 'addsong', song, artist, user: CURRENT_USER });
  if (r.ok) {
    addForm.reset();
    await loadList();
    toast('Song added!', 'success');
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  } else {
    toast(r.error || 'Failed to add', 'error');
  }
});

function runConfetti() {
  const duration = 1.5 * 1000;
  const animationEnd = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });

    if (Date.now() < animationEnd) {
      requestAnimationFrame(frame);
    }
  })();
}

// ===== Go To Top =====
const goTopBtn = document.getElementById("goTopBtn");

window.onscroll = function () {
  if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
    goTopBtn.style.display = "block";
  } else {
    goTopBtn.style.display = "none";
  }
};

// Smooth scroll to top
goTopBtn.onclick = function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
};
