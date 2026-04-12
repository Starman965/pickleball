import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-U1iMe59o2i9ZQe5Z_eMFX-9WIFYS4mc",
  authDomain: "bcc-men-league.firebaseapp.com",
  projectId: "bcc-men-league",
  storageBucket: "bcc-men-league.firebasestorage.app",
  messagingSenderId: "1037647483069",
  appId: "1:1037647483069:web:f82d7da424b6611b7067d4",
};

const PLAYERS = [
  "Paddy Ramanathan",
  "Steve Ronan",
  "Nate Chessin",
  "Robert Fletcher",
  "Anubhav Gupta",
  "Arvind Gupta",
  "David Lewis",
  "Jatinder Marwaha",
  "David Nosal",
  "Neel Palle",
  "Amilcar Perez",
  "Prithvi Raj",
  "Shraven Songani",
  "Brian Steffi",
  "Steve Zelenswski",
];

const APPROVED_ADMIN_EMAILS = new Set([
  "demandgendave@gmail.com",
  "ronan@flycurrent.ai",
]);

const PT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});

const MOCK_GAMES = [
  {
    id: "2026-04-18-canyon-club",
    dateLabel: "Saturday, April 18",
    isoDate: "2026-04-18T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - Canyon Courts",
    opponent: "Open Ladder Session",
  },
  {
    id: "2026-04-25-lakeside",
    dateLabel: "Saturday, April 25",
    isoDate: "2026-04-25T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - Lakeside Courts",
    opponent: "Club Scrimmage",
  },
  {
    id: "2026-05-02-east-courts",
    dateLabel: "Saturday, May 2",
    isoDate: "2026-05-02T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - East Courts",
    opponent: "Pickle Hawks Warmup",
  },
  {
    id: "2026-05-02-stadium-court",
    dateLabel: "Saturday, May 2",
    isoDate: "2026-05-02T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - Stadium Court",
    opponent: "Bonus Match Play",
  },
  {
    id: "2026-05-09-canyon-club",
    dateLabel: "Saturday, May 9",
    isoDate: "2026-05-09T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - Canyon Courts",
    opponent: "Spring Team Challenge",
  },
  {
    id: "2026-05-16-garden-courts",
    dateLabel: "Saturday, May 16",
    isoDate: "2026-05-16T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - Garden Courts",
    opponent: "Round Robin Session",
  },
  {
    id: "2026-05-16-lakeside",
    dateLabel: "Saturday, May 16",
    isoDate: "2026-05-16T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - Lakeside Courts",
    opponent: "Extra Court Rotation",
  },
  {
    id: "2026-05-23-west-courts",
    dateLabel: "Saturday, May 23",
    isoDate: "2026-05-23T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - West Courts",
    opponent: "Memorial Weekend Mixer",
  },
  {
    id: "2026-05-30-center-court",
    dateLabel: "Saturday, May 30",
    isoDate: "2026-05-30T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - Center Court",
    opponent: "Season Finale Match Day",
  },
  {
    id: "2026-05-30-championship-court",
    dateLabel: "Saturday, May 30",
    isoDate: "2026-05-30T10:00:00-07:00",
    timeLabel: "10:00 AM PT",
    location: "Blackhawk Country Club - Championship Court",
    opponent: "Captain's Pick Showcase",
  },
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

const playerSelect = document.getElementById("player-select");
const selectedPlayerName = document.getElementById("selected-player-name");
const statusBanner = document.getElementById("status-banner");
const gamesGrid = document.getElementById("games-grid");
const gamesCount = document.getElementById("games-count");
const playersCount = document.getElementById("players-count");
const nextGame = document.getElementById("next-game");
const adminStatus = document.getElementById("admin-status");
const adminGrid = document.getElementById("admin-grid");
const adminUserEmail = document.getElementById("admin-user-email");
const adminHelperText = document.getElementById("admin-helper-text");
const adminSignIn = document.getElementById("admin-sign-in");
const adminSignOut = document.getElementById("admin-sign-out");
const adminCardTemplate = document.getElementById("admin-card-template");
const gameTemplate = document.getElementById("game-card-template");
const playerTemplate = document.getElementById("player-row-template");

let selectedPlayer = "";
let games = [];
let savingState = false;
let adminUser = null;
let isApprovedAdmin = false;

PLAYERS.forEach((player) => {
  const option = document.createElement("option");
  option.value = player;
  option.textContent = player;
  playerSelect.append(option);
});

playersCount.textContent = String(PLAYERS.length);

playerSelect.addEventListener("change", (event) => {
  selectedPlayer = event.target.value;
  selectedPlayerName.textContent = selectedPlayer || "None selected";
  renderGames();
});

adminSignIn.addEventListener("click", async () => {
  try {
    setAdminStatus("Redirecting to Google sign-in...", "success");
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error(error);
    setAdminStatus("Google sign-in could not start. Verify Google Auth is enabled in Firebase.", "error");
  }
});

adminSignOut.addEventListener("click", async () => {
  try {
    await signOut(auth);
    setAdminStatus("Signed out of admin access.", "");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not sign out right now.", "error");
  }
});

function normalizeEmail(email) {
  return (email ?? "").trim().toLowerCase();
}

function userIsApprovedAdmin(user) {
  return APPROVED_ADMIN_EMAILS.has(normalizeEmail(user?.email));
}

function setStatus(message, tone = "") {
  statusBanner.textContent = message;
  statusBanner.className = "status-banner";
  if (tone) {
    statusBanner.classList.add(`is-${tone}`);
  }
}

function setAdminStatus(message, tone = "") {
  adminStatus.textContent = message;
  adminStatus.className = "admin-status";
  if (tone) {
    adminStatus.classList.add(`is-${tone}`);
  }
}

function refreshAdminSessionUi() {
  adminUserEmail.textContent = adminUser?.email ?? "Not signed in";
  adminSignIn.hidden = Boolean(adminUser);
  adminSignOut.hidden = !adminUser;

  if (isApprovedAdmin) {
    adminHelperText.textContent = "This account can edit the live game schedule.";
  } else if (adminUser) {
    adminHelperText.textContent = "This Google account is signed in, but it is not on the approved admin list.";
  } else {
    adminHelperText.textContent = "Sign in with an approved Google account to manage the schedule.";
  }
}

function createDefaultAttendance() {
  return PLAYERS.reduce((accumulator, player) => {
    accumulator[player] = "unknown";
    return accumulator;
  }, {});
}

function buildScheduleFields(dateValue) {
  const isoDate = `${dateValue}T10:00:00-07:00`;
  const dateLabel = PT_DATE_FORMATTER.format(new Date(isoDate));

  return {
    isoDate,
    dateLabel,
    timeLabel: "10:00 AM PT",
  };
}

function createGameId(dateValue, opponent, location) {
  const slugSource = `${opponent}-${location}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${dateValue}-${slugSource || "game"}-${suffix}`;
}

async function seedGamesIfNeeded() {
  const snapshot = await getDocs(collection(db, "games"));
  if (!snapshot.empty) {
    return;
  }

  const writes = MOCK_GAMES.map((game) =>
    setDoc(doc(db, "games", game.id), {
      ...game,
      attendance: createDefaultAttendance(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  await Promise.all(writes);
}

function normalizeGame(docSnapshot) {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    dateLabel: data.dateLabel ?? "Game Date",
    isoDate: data.isoDate ?? "",
    timeLabel: data.timeLabel ?? "10:00 AM PT",
    location: data.location ?? "Location TBD",
    opponent: data.opponent ?? "Team Session",
    attendance: {
      ...createDefaultAttendance(),
      ...(data.attendance ?? {}),
    },
  };
}

function getStatusMeta(status) {
  if (status === "in") {
    return { label: "Playing", className: "status-badge status-badge--in" };
  }

  if (status === "out") {
    return { label: "Out", className: "status-badge status-badge--out" };
  }

  return { label: "No response", className: "status-badge" };
}

function buildSummary(attendance) {
  const counts = { in: 0, out: 0, unknown: 0 };

  PLAYERS.forEach((player) => {
    const status = attendance[player] ?? "unknown";
    if (status === "in") {
      counts.in += 1;
    } else if (status === "out") {
      counts.out += 1;
    } else {
      counts.unknown += 1;
    }
  });

  return counts;
}

function buildAdminCard(game, options = {}) {
  const fragment = adminCardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".admin-card");
  const title = fragment.querySelector('[data-role="admin-title"]');
  const meta = fragment.querySelector('[data-role="admin-meta"]');
  const badge = fragment.querySelector('[data-role="admin-badge"]');
  const form = fragment.querySelector('[data-role="admin-form"]');
  const actions = fragment.querySelector('[data-role="admin-actions"]');
  const dateInput = fragment.querySelector('[data-role="date-input"]');
  const locationInput = fragment.querySelector('[data-role="location-input"]');
  const opponentInput = fragment.querySelector('[data-role="opponent-input"]');

  title.textContent = options.title ?? game.opponent;
  meta.textContent = options.meta ?? `${game.dateLabel} • ${game.location}`;
  badge.textContent = game.timeLabel;
  dateInput.value = game.isoDate.slice(0, 10);
  locationInput.value = game.location;
  opponentInput.value = game.opponent;

  return {
    card,
    form,
    actions,
    dateInput,
    locationInput,
    opponentInput,
  };
}

function renderAdminControls() {
  adminGrid.innerHTML = "";

  if (!isApprovedAdmin) {
    return;
  }

  const createCard = buildAdminCard(
    {
      isoDate: MOCK_GAMES[0].isoDate,
      location: "Blackhawk Country Club - Court Assignment TBD",
      opponent: "New Match Day",
      timeLabel: "10:00 AM PT",
      dateLabel: MOCK_GAMES[0].dateLabel,
    },
    {
      title: "Create new game",
      meta: "Add a new game date to the live schedule.",
    },
  );

  createCard.card.classList.add("admin-card--create");

  const createButton = document.createElement("button");
  createButton.type = "submit";
  createButton.className = "action-btn action-btn--active";
  createButton.textContent = "Create game";
  createButton.disabled = savingState;

  createCard.actions.append(createButton);
  createCard.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createGame({
      scheduledDate: createCard.dateInput.value,
      location: createCard.locationInput.value.trim(),
      opponent: createCard.opponentInput.value.trim(),
    });
  });

  adminGrid.append(createCard.card);

  if (!games.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No games available to edit yet. Use the card above to create the first one.";
    adminGrid.append(empty);
    return;
  }

  games.forEach((game) => {
    const adminCard = buildAdminCard(game);
    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "action-btn";
    resetButton.textContent = "Reset";
    resetButton.disabled = savingState;
    resetButton.addEventListener("click", () => {
      adminCard.dateInput.value = game.isoDate.slice(0, 10);
      adminCard.locationInput.value = game.location;
      adminCard.opponentInput.value = game.opponent;
    });

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "action-btn action-btn--active";
    saveButton.textContent = "Save";
    saveButton.disabled = savingState;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-btn action-btn--danger";
    deleteButton.textContent = "Delete";
    deleteButton.disabled = savingState;
    deleteButton.addEventListener("click", async () => {
      const confirmed = window.confirm(`Delete "${game.opponent}" on ${game.dateLabel}?`);
      if (!confirmed) {
        return;
      }

      await deleteGame(game.id, game.opponent);
    });

    adminCard.actions.append(resetButton, saveButton, deleteButton);
    adminCard.form.addEventListener("submit", async (event) => {
      event.preventDefault();

      await updateGameDetails(game.id, {
        scheduledDate: adminCard.dateInput.value,
        location: adminCard.locationInput.value.trim(),
        opponent: adminCard.opponentInput.value.trim(),
      });
    });

    adminGrid.append(adminCard.card);
  });
}

function renderGames() {
  gamesGrid.innerHTML = "";

  if (!games.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No games available yet. An approved admin can sign in and seed the schedule.";
    gamesGrid.append(empty);
    return;
  }

  games.forEach((game) => {
    const cardFragment = gameTemplate.content.cloneNode(true);
    const card = cardFragment.querySelector(".game-card");
    const dateNode = cardFragment.querySelector(".game-card__date");
    const titleNode = cardFragment.querySelector(".game-card__title");
    const metaNode = cardFragment.querySelector(".game-card__meta");
    const inCountNode = cardFragment.querySelector('[data-role="in-count"]');
    const outCountNode = cardFragment.querySelector('[data-role="out-count"]');
    const pendingCountNode = cardFragment.querySelector('[data-role="pending-count"]');
    const playerListNode = cardFragment.querySelector('[data-role="player-list"]');

    const summary = buildSummary(game.attendance);

    dateNode.textContent = game.dateLabel;
    titleNode.textContent = game.opponent;
    metaNode.textContent = `${game.timeLabel} • ${game.location}`;
    inCountNode.textContent = String(summary.in);
    outCountNode.textContent = String(summary.out);
    pendingCountNode.textContent = String(summary.unknown);

    PLAYERS.forEach((player) => {
      const rowFragment = playerTemplate.content.cloneNode(true);
      const row = rowFragment.querySelector(".player-row");
      const nameNode = rowFragment.querySelector(".player-row__name");
      const badgeNode = rowFragment.querySelector(".player-row__badge");
      const actionsNode = rowFragment.querySelector('[data-role="player-actions"]');
      const status = game.attendance[player] ?? "unknown";
      const meta = getStatusMeta(status);
      const isSelected = selectedPlayer && selectedPlayer === player;

      nameNode.textContent = player;
      badgeNode.textContent = meta.label;
      badgeNode.className = meta.className;

      if (isSelected) {
        row.classList.add("player-row--selected");
        badgeNode.classList.add("status-badge--selected");
      }

      actionsNode.querySelectorAll("button").forEach((button) => {
        const buttonStatus = button.dataset.status;

        if (buttonStatus === status) {
          button.classList.add("action-btn--active");
        }

        button.disabled = savingState;
        button.addEventListener("click", async () => {
          if (!selectedPlayer) {
            setStatus("Select your name first so you can update your attendance.", "warning");
            return;
          }

          await updateAttendance(game.id, selectedPlayer, buttonStatus);
        });
      });

      if (!isSelected) {
        actionsNode.remove();
      }

      playerListNode.append(rowFragment);
    });

    gamesGrid.append(card);
  });
}

async function updateAttendance(gameId, player, status) {
  if (!player) {
    return;
  }

  savingState = true;
  setStatus(`Saving ${player}'s response...`, "warning");
  renderGames();

  try {
    await updateDoc(doc(db, "games", gameId), {
      [`attendance.${player}`]: status,
      updatedAt: serverTimestamp(),
    });
    setStatus(`${player}'s availability was updated.`, "success");
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not save attendance to Firebase. Check Firestore rules and that the site is served over HTTP/HTTPS.",
      "error",
    );
  } finally {
    savingState = false;
    renderGames();
    renderAdminControls();
  }
}

async function updateGameDetails(gameId, updates) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in with an approved Google account before editing the schedule.", "error");
    return;
  }

  if (!updates.scheduledDate || !updates.location || !updates.opponent) {
    setAdminStatus("Date, location, and match label are required.", "error");
    return;
  }

  savingState = true;
  setAdminStatus("Saving game details...", "success");
  renderGames();
  renderAdminControls();

  try {
    await updateDoc(doc(db, "games", gameId), {
      ...buildScheduleFields(updates.scheduledDate),
      location: updates.location,
      opponent: updates.opponent,
      updatedAt: serverTimestamp(),
      updatedByAdmin: normalizeEmail(adminUser?.email),
    });
    setAdminStatus("Game details saved to Firebase.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not save game details. Check Firestore admin write access.", "error");
  } finally {
    savingState = false;
    renderGames();
    renderAdminControls();
  }
}

async function createGame(updates) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in with an approved Google account before creating a game.", "error");
    return;
  }

  if (!updates.scheduledDate || !updates.location || !updates.opponent) {
    setAdminStatus("Date, location, and match label are required to create a game.", "error");
    return;
  }

  savingState = true;
  setAdminStatus("Creating game...", "success");
  renderGames();
  renderAdminControls();

  const gameId = createGameId(updates.scheduledDate, updates.opponent, updates.location);

  try {
    await setDoc(doc(db, "games", gameId), {
      id: gameId,
      ...buildScheduleFields(updates.scheduledDate),
      location: updates.location,
      opponent: updates.opponent,
      attendance: createDefaultAttendance(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdByAdmin: normalizeEmail(adminUser?.email),
      updatedByAdmin: normalizeEmail(adminUser?.email),
    });
    setAdminStatus("New game created.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not create the game. Check Firestore admin write access.", "error");
  } finally {
    savingState = false;
    renderGames();
    renderAdminControls();
  }
}

async function deleteGame(gameId, gameName) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in with an approved Google account before deleting a game.", "error");
    return;
  }

  savingState = true;
  setAdminStatus(`Deleting ${gameName}...`, "success");
  renderGames();
  renderAdminControls();

  try {
    await deleteDoc(doc(db, "games", gameId));
    setAdminStatus("Game deleted.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not delete the game. Check Firestore admin write access.", "error");
  } finally {
    savingState = false;
    renderGames();
    renderAdminControls();
  }
}

async function initializeAdminAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    await getRedirectResult(auth);
  } catch (error) {
    console.error(error);
    setAdminStatus("Google sign-in is not ready. Enable Google Auth and add your site domain in Firebase.", "error");
  }

  onAuthStateChanged(auth, async (user) => {
    adminUser = user;
    isApprovedAdmin = userIsApprovedAdmin(user);
    refreshAdminSessionUi();

    if (isApprovedAdmin) {
      setAdminStatus(`Signed in as ${user.email}. Admin tools are enabled.`, "success");
      try {
        await seedGamesIfNeeded();
      } catch (error) {
        console.error(error);
        setAdminStatus("Signed in, but could not seed or load the admin schedule. Check Firestore permissions.", "error");
      }
    } else if (user) {
      setAdminStatus(`${user.email} is signed in, but not on the approved admin list.`, "error");
    } else {
      setAdminStatus("Admin tools are locked. Sign in with an approved Google account.", "");
    }

    renderAdminControls();
  });
}

function bootstrapGamesListener() {
  try {
    gamesCount.textContent = String(MOCK_GAMES.length);
    nextGame.textContent = `${MOCK_GAMES[0].dateLabel} • ${MOCK_GAMES[0].timeLabel}`;
    setStatus("Connecting to Firebase and loading schedule...", "warning");

    onSnapshot(
      collection(db, "games"),
      (snapshot) => {
        games = snapshot.docs
          .map(normalizeGame)
          .sort((left, right) => left.isoDate.localeCompare(right.isoDate));

        gamesCount.textContent = String(games.length);
        nextGame.textContent = games[0]
          ? `${games[0].dateLabel} • ${games[0].timeLabel}`
          : "No games scheduled";
        setStatus("Live attendance is connected. Pick your name to update your availability.", "success");
        renderGames();
        renderAdminControls();
      },
      (error) => {
        console.error(error);
        setStatus(
          "Firebase load failed. Make sure Firestore is enabled and your rules allow reads.",
          "error",
        );
      },
    );
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not initialize the schedule. Verify Firestore is created in the Firebase console.",
      "error",
    );
    renderGames();
  }
}

renderGames();
refreshAdminSessionUi();
setAdminStatus("Admin tools are locked. Sign in with an approved Google account.", "");
bootstrapGamesListener();
initializeAdminAuth();
