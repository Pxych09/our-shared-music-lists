// ===== Config =====
const CONFIG = {
  BASE_URL: 'https://script.google.com/macros/s/AKfycbzlql7i4j5c1yrBrywuAsTqxmsciAaZopjkzTtM15KR4g-_S8W9F6VgfO-cW-HtMfE/exec'
};

// ===== Loading State Management =====
let activeRequests = 0;
let loadingTimeout = null;

const showLoading = (show) => {
  const loadingEl = document.getElementById('loading');
  if (!loadingEl) return;

  if (show) {
    activeRequests++;
    // Clear any pending hide timeout
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      loadingTimeout = null;
    }
    // Show loading immediately
    loadingEl.classList.remove('hidden');
  } else {
    activeRequests--;
    if (activeRequests <= 0) {
      activeRequests = 0; // Prevent negative values
      // Add small delay before hiding to prevent flickering
      loadingTimeout = setTimeout(() => {
        loadingEl.classList.add('hidden');
      }, 100);
    }
  }
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
let ALL_COMMENTS = []; // Store all comments globally

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

const timeAgo = (isoString) => {
  if (!isoString) return "";

  const now = new Date();
  const past = new Date(isoString);
  const diffInMs = now - past;
  const diffInSeconds = Math.floor(diffInMs / 1000);

  if (diffInSeconds < 60) {
    return diffInSeconds <= 1 ? "just now" : `${diffInSeconds}s ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? "1 min ago" : `${diffInMinutes} mins ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hr ago" : `${diffInHours} hrs ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? "1 week ago" : `${diffInWeeks} weeks ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "1 month ago" : `${diffInMonths} months ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
};

// ===== Comment helpers =====
const getCommentsForSong = (songId) => {
  return ALL_COMMENTS.filter(comment => String(comment.id) === String(songId));
};

const addCommentToSong = async (songId, commentText) => {
  if (!commentText.trim()) {
    toast('Please enter a comment', 'error');
    return false;
  }

  const result = await post({
    action: 'addcomment',
    id: songId,
    user: CURRENT_USER,
    comment: commentText.trim()
  });

  if (result.ok) {
    toast('Comment added!', 'success');
    // Reload comments and refresh the list
    await loadList();
    return true;
  } else {
    toast(result.error || 'Failed to add comment', 'error');
    return false;
  }
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

  const commentRemark = document.createElement('div');
  const ulComments = document.createElement('div');
  const statComments = document.createElement('div');

  containerSong.classList.add('song-container')
  listButtons.classList.add('list-buttons')
  accordionDetail.classList.add('accordion')
  songDetail.classList.add('song')
  artistDetail.classList.add('artist')
  timestampDetail.classList.add('timestamp')
  panelDetails.classList.add('panel')
  commentRemark.classList.add('commentRemark')
  ulComments.classList.add('ul-comments')
  statComments.classList.add('stats-comments') // total comments in a song or per song

  songDetail.innerHTML = `${row.song || row.Song || 'Unknown Song'}`
  artistDetail.innerHTML = `${row.artist || row.Artist || 'Unknown Artist'}`
  panelDetails.innerHTML = `Created by: <span>${row['created by'] || row['Created By'] || "-"}</span><br>Edited by: <span>${row['edited by'] || row['Edited By'] || "-"}</span>`
  timestampDetail.innerHTML = `${formatDateTime(row.timestamp || row.Timestamp)} <img src="https://cdn-icons-png.flaticon.com/512/6255/6255820.png" alt="icon" width="10" height="10">`

  // Create comment input area
  const commentTextarea = document.createElement('textarea');
  commentTextarea.className = 'user-comment';
  commentTextarea.rows = 1;
  commentTextarea.name = 'comment-area'
  commentTextarea.placeholder = 'write a comment...';

  const commentBtn = document.createElement('button');
  commentBtn.textContent = 'Comment';
  commentBtn.className = 'comment-btn';

  commentRemark.appendChild(commentTextarea);
  commentRemark.appendChild(commentBtn);

  // Add comment button handler
  commentBtn.addEventListener('click', async () => {
    const songId = row.id || row.ID;
    const success = await addCommentToSong(songId, commentTextarea.value);
    if (success) {
      commentTextarea.value = ''; // Clear the textarea
    }
  });

  // Load and display existing comments for this song
  const songId = row.id || row.ID;
  const songComments = getCommentsForSong(songId);
  ulComments.innerHTML = ''; // Clear previous comments
  
  // ===== UPDATED: Show actual comment count =====
  const commentCount = songComments.length;
  if (commentCount === 0) {
    statComments.innerHTML = "No comments yet.";
  } else if (commentCount === 1) {
    statComments.innerHTML = "1 comment.";
  } else {
    statComments.innerHTML = `${commentCount} comments.`;
  }

  if (songComments.length === 0) {
    const noComments = document.createElement('div');
    noComments.className = 'no-comments';
    noComments.textContent = '';
    ulComments.classList.add('has-no-comments');
    ulComments.appendChild(noComments);
  } else {
    songComments.forEach(comment => {
      const commentDiv = document.createElement('div');
      commentDiv.className = 'li-comments';
      commentDiv.innerHTML = `
        <div class="comment-user"><strong>${comment.username || 'Anonymous'}: </strong></div>
        <div class="comment-text">${comment.comment || ''} <span>(${timeAgo(comment.timestamp)})</span></div>
      `;
      ulComments.classList.remove('has-no-comments')
      ulComments.appendChild(commentDiv);
    });
  }

  songDetail.addEventListener('click', e => {
    e.preventDefault();
    accordionDetail.classList.toggle('toggle-panel');
    timestampDetail.classList.toggle('toggle-panel');
  });

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-success';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', async () => {
    const currentSong = row.song || row.Song || '';
    const currentArtist = row.artist || row.Artist || '';
    const songId = row.id || row.ID;
    
    const newSong = prompt('New song title:', currentSong);
    if (newSong === null) return;
    const newArtist = prompt('New artist:', currentArtist);
    if (newArtist === null) return;

    const r = await post({ action: 'editsong', id: songId, song: newSong, artist: newArtist, user: CURRENT_USER });
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
    const songId = row.id || row.ID;
    const r = await post({ action: 'deletesong', id: songId });
    if (r.ok) {
      toast('Song deleted!', 'success');
      await loadList();
    } else {
      toast(r.error || 'Failed to delete', 'error');
    }
  });

  listButtons.append(editBtn, delBtn);
  accordionDetail.append(panelDetails);
  containerSong.append(songDetail, artistDetail, listButtons, accordionDetail, timestampDetail, commentRemark, ulComments, statComments);
  return containerSong;
}

// ===== Data loaders =====
const loadList = async () => {
  listEl.innerHTML = '<p class="muted fetch-mute">Fetching for lists of music, please wait...</p>';
  
  // Load songs and comments simultaneously for better performance
  const [songsResponse, commentsResponse] = await Promise.all([
    getJSON({ action: 'lists' }),
    getJSON({ action: "getcomments" })
  ]);
  
  console.log('Comments loaded:', commentsResponse);
  
  if (commentsResponse.ok) {
    ALL_COMMENTS = commentsResponse.comments || [];
  } else {
    console.error('Failed to load comments:', commentsResponse.error);
    ALL_COMMENTS = [];
  }

  // Update count display
  if(songsResponse.data.length >= 2) {
    countData.innerText = `There are currently ${songsResponse.data.length} songs in your lists.`
  } else if (songsResponse.data.length == 1) {
    countData.innerText = `There is only ${songsResponse.data.length} song in your list. I suggest, add more!`
  } else {
    countData.innerText = `There is none or ${songsResponse.data.length} data in your list. Add a list now?`
  }

  if (songsResponse.ok) {
    listEl.innerHTML = '';
    songsResponse.data.forEach(row => listEl.append(songItem(row)));
  } else {
    listEl.innerHTML = `<p class="muted">${songsResponse.error || 'Failed to load list.'}</p>`;
  }
};

// ===== Auth flow with session timeout =====
let sessionTimer = null;
let warningTimer = null;
let countdownInterval = null;

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const WARNING_TIME = 30 * 1000;        // warn 30s before

function resetSessionTimer() {
  if (!CURRENT_USER) return; // ✅ only run if logged in

  if (sessionTimer) clearTimeout(sessionTimer);
  if (warningTimer) clearTimeout(warningTimer);
  if (countdownInterval) clearInterval(countdownInterval);

  const now = new Date();
  const warnAt = new Date(now.getTime() + (SESSION_TIMEOUT - WARNING_TIME));
  const expireAt = new Date(now.getTime() + SESSION_TIMEOUT);

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