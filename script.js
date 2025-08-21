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
// const authMsg = $('#authMsg');
const loginForm = $('#loginForm');
const addForm = $('#addForm');
// const listEl = $('#list');
const countData = $('#countData');

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

// ===== Song item builder =====
/**const songItem = (row) => {
  const li = document.createElement('li');
  li.className = 'item';

  const details = document.createElement('div');
  details.innerHTML = `<strong>${row.Song}</strong> <strong>${row.Artist}</strong>`;

  const containerButtons = document.createElement('div');

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

  containerButtons.append(editBtn, delBtn);
  li.append(details, containerButtons);
  return li;
};
**/

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
  console.log(row)
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

  console.log(r.data, " => data")
  console.log(r.data.length, " => data length.")
  if (r.ok) {
    listEl.innerHTML = '';
    r.data.forEach(row => listEl.append(songItem(row)));
  } else {
    listEl.innerHTML = `<p class="muted">${r.error || 'Failed to load list.'}</p>`;
  }
};

// ===== Auth flow =====
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#username').value.trim();
  const password = $('#password').value.trim();

  const r = await post({ action: 'login', username, password });
  if (r.ok) {
    CURRENT_USER = r.user;
    who.textContent = `${CURRENT_USER}`;
    show(auth, false);
    show(app, true);
    loginForm.reset();
    await loadList();
    toast('Login successful!', 'success');

    // 🎉 Confetti effect
    runConfetti();

  } else {
    toast(r.error || 'Login failed', 'error');
  }
});

$('#logoutBtn').addEventListener('click', () => {
  CURRENT_USER = null;
  show(app, false);
  show(auth, true);
  toast('Logged out', 'info');
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
    // 🎉 Confetti effect
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

// Show button when user scrolls down
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