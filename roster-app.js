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

const INITIAL_PLAYERS = [
  { id: "paddy-ramanathan", firstName: "Paddy", lastName: "Ramanathan" },
  { id: "steve-ronan", firstName: "Steve", lastName: "Ronan" },
  { id: "nate-chessin", firstName: "Nate", lastName: "Chessin" },
  { id: "robert-fletcher", firstName: "Robert", lastName: "Fletcher" },
  { id: "anubhav-gupta", firstName: "Anubhav", lastName: "Gupta" },
  { id: "arvind-gupta", firstName: "Arvind", lastName: "Gupta" },
  { id: "david-lewis", firstName: "David", lastName: "Lewis" },
  { id: "jatinder-marwaha", firstName: "Jatinder", lastName: "Marwaha" },
  { id: "david-nosal", firstName: "David", lastName: "Nosal" },
  { id: "neel-palle", firstName: "Neel", lastName: "Palle" },
  { id: "amilcar-perez", firstName: "Amilcar", lastName: "Perez" },
  { id: "prithvi-raj", firstName: "Prithvi", lastName: "Raj" },
  { id: "shraven-songani", firstName: "Shraven", lastName: "Songani" },
  { id: "brian-steffi", firstName: "Brian", lastName: "Steffi" },
  { id: "steve-zelenswski", firstName: "Steve", lastName: "Zelenswski" },
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
const playersAdminGrid = document.getElementById("players-admin-grid");
const adminUserEmail = document.getElementById("admin-user-email");
const adminHelperText = document.getElementById("admin-helper-text");
const adminSignIn = document.getElementById("admin-sign-in");
const adminSignOut = document.getElementById("admin-sign-out");
const adminCardTemplate = document.getElementById("admin-card-template");
const playerAdminTemplate = document.getElementById("player-admin-template");
const gameTemplate = document.getElementById("game-card-template");
const playerTemplate = document.getElementById("player-row-template");

let selectedPlayerId = "";
let players = [];
let games = [];
let savingState = false;
let adminUser = null;
let isApprovedAdmin = false;

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

playerSelect.addEventListener("change", (event) => {
  selectedPlayerId = event.target.value;
  const selectedPlayer = getPlayerById(selectedPlayerId);
  selectedPlayerName.textContent = selectedPlayer?.fullName ?? "None selected";
  renderGames();
});

function normalizeEmail(email) {
  return (email ?? "").trim().toLowerCase();
}

function userIsApprovedAdmin(user) {
  return APPROVED_ADMIN_EMAILS.has(normalizeEmail(user?.email));
}

function buildFullName(firstName, lastName) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildPlayerId(firstName, lastName) {
  const base = slugify(buildFullName(firstName, lastName));
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "player"}-${suffix}`;
}

function getPlayerById(playerId) {
  return players.find((player) => player.id === playerId) ?? null;
}

function getActivePlayers() {
  return players.filter((player) => player.active);
}

function getLegacyAttendanceKeys(player) {
  return [player.id, player.fullName, ...(player.legacyNames ?? [])];
}

function getAttendanceStatus(game, player) {
  for (const key of getLegacyAttendanceKeys(player)) {
    const status = game.attendance?.[key];
    if (status) {
      return status;
    }
  }

  return "unknown";
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
    adminHelperText.textContent = "This account can manage players and edit the live game schedule.";
  } else if (adminUser) {
    adminHelperText.textContent = "This Google account is signed in, but it is not on the approved admin list.";
  } else {
    adminHelperText.textContent = "Sign in with an approved Google account to manage the roster and schedule.";
  }
}

function createDefaultAttendance(playerList = getActivePlayers()) {
  return playerList.reduce((accumulator, player) => {
    accumulator[player.id] = "unknown";
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

function normalizePlayer(docSnapshot) {
  const data = docSnapshot.data();
  const firstName = (data.firstName ?? "").trim();
  const lastName = (data.lastName ?? "").trim();

  return {
    id: docSnapshot.id,
    firstName,
    lastName,
    fullName: data.fullName ?? buildFullName(firstName, lastName),
    active: data.active !== false,
    legacyNames: data.legacyNames ?? [],
  };
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
    attendance: data.attendance ?? {},
  };
}

function renderPlayerSelect() {
  const activePlayers = getActivePlayers();
  playerSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = activePlayers.length ? "Select your name" : "No active players yet";
  playerSelect.append(defaultOption);

  activePlayers.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.fullName;
    if (player.id === selectedPlayerId) {
      option.selected = true;
    }
    playerSelect.append(option);
  });

  if (selectedPlayerId && !getPlayerById(selectedPlayerId)?.active) {
    selectedPlayerId = "";
  }

  const selectedPlayer = getPlayerById(selectedPlayerId);
  selectedPlayerName.textContent = selectedPlayer?.fullName ?? "None selected";
  playersCount.textContent = String(activePlayers.length);
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

function buildSummary(game) {
  const counts = { in: 0, out: 0, unknown: 0 };

  getActivePlayers().forEach((player) => {
    const status = getAttendanceStatus(game, player);
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

async function seedPlayersIfNeeded() {
  const snapshot = await getDocs(collection(db, "players"));
  if (!snapshot.empty) {
    return;
  }

  const writes = INITIAL_PLAYERS.map((player) =>
    setDoc(doc(db, "players", player.id), {
      ...player,
      fullName: buildFullName(player.firstName, player.lastName),
      legacyNames: [buildFullName(player.firstName, player.lastName)],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  await Promise.all(writes);
}

async function seedGamesIfNeeded() {
  const snapshot = await getDocs(collection(db, "games"));
  if (!snapshot.empty) {
    return;
  }

  const seedPlayers = getActivePlayers().length
    ? getActivePlayers()
    : INITIAL_PLAYERS.map((player) => ({
        id: player.id,
      }));

  const writes = MOCK_GAMES.map((game) =>
    setDoc(doc(db, "games", game.id), {
      ...game,
      attendance: createDefaultAttendance(seedPlayers),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  await Promise.all(writes);
}

function buildAdminGameCard(game, options = {}) {
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

function buildAdminPlayerCard(player, options = {}) {
  const fragment = playerAdminTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".admin-card");
  const title = fragment.querySelector('[data-role="player-title"]');
  const meta = fragment.querySelector('[data-role="player-meta"]');
  const badge = fragment.querySelector('[data-role="player-badge"]');
  const form = fragment.querySelector('[data-role="player-form"]');
  const actions = fragment.querySelector('[data-role="player-actions"]');
  const firstNameInput = fragment.querySelector('[data-role="first-name-input"]');
  const lastNameInput = fragment.querySelector('[data-role="last-name-input"]');

  title.textContent = options.title ?? player.fullName;
  meta.textContent = options.meta ?? "Edit player name and active roster status.";
  badge.textContent = player.active ? "Active" : "Inactive";
  firstNameInput.value = player.firstName;
  lastNameInput.value = player.lastName;

  return {
    card,
    form,
    actions,
    firstNameInput,
    lastNameInput,
  };
}

function renderPlayersAdminControls() {
  playersAdminGrid.innerHTML = "";

  if (!isApprovedAdmin) {
    return;
  }

  const createCard = buildAdminPlayerCard(
    {
      firstName: "",
      lastName: "",
      fullName: "New player",
      active: true,
    },
    {
      title: "Add player",
      meta: "Create a new roster entry with first and last name.",
    },
  );

  createCard.card.classList.add("admin-card--create");

  const createButton = document.createElement("button");
  createButton.type = "submit";
  createButton.className = "action-btn action-btn--active";
  createButton.textContent = "Create player";
  createButton.disabled = savingState;

  createCard.actions.append(createButton);
  createCard.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createPlayer({
      firstName: createCard.firstNameInput.value,
      lastName: createCard.lastNameInput.value,
    });
  });

  playersAdminGrid.append(createCard.card);

  if (!players.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No players are loaded yet. Use the card above to create the first player.";
    playersAdminGrid.append(empty);
    return;
  }

  players.forEach((player) => {
    const adminCard = buildAdminPlayerCard(player);

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.className = "action-btn";
    resetButton.textContent = "Reset";
    resetButton.disabled = savingState;
    resetButton.addEventListener("click", () => {
      adminCard.firstNameInput.value = player.firstName;
      adminCard.lastNameInput.value = player.lastName;
    });

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "action-btn action-btn--active";
    saveButton.textContent = "Save";
    saveButton.disabled = savingState;

    const activeToggleButton = document.createElement("button");
    activeToggleButton.type = "button";
    activeToggleButton.className = player.active ? "action-btn action-btn--danger" : "action-btn";
    activeToggleButton.textContent = player.active ? "Deactivate" : "Reactivate";
    activeToggleButton.disabled = savingState;
    activeToggleButton.addEventListener("click", async () => {
      await setPlayerActiveState(player.id, !player.active, player.fullName);
    });

    adminCard.actions.append(resetButton, saveButton, activeToggleButton);
    adminCard.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await updatePlayer(player, {
        firstName: adminCard.firstNameInput.value,
        lastName: adminCard.lastNameInput.value,
      });
    });

    playersAdminGrid.append(adminCard.card);
  });
}

function renderGamesAdminControls() {
  adminGrid.innerHTML = "";

  if (!isApprovedAdmin) {
    return;
  }

  const createCard = buildAdminGameCard(
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
    const adminCard = buildAdminGameCard(game);

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

  const activePlayers = getActivePlayers();

  if (!games.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No games available yet. An approved admin can sign in and seed the schedule.";
    gamesGrid.append(empty);
    return;
  }

  if (!activePlayers.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No active players are on the roster yet. An admin can add players in the roster manager.";
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

    const summary = buildSummary(game);

    dateNode.textContent = game.dateLabel;
    titleNode.textContent = game.opponent;
    metaNode.textContent = `${game.timeLabel} • ${game.location}`;
    inCountNode.textContent = String(summary.in);
    outCountNode.textContent = String(summary.out);
    pendingCountNode.textContent = String(summary.unknown);

    activePlayers.forEach((player) => {
      const rowFragment = playerTemplate.content.cloneNode(true);
      const row = rowFragment.querySelector(".player-row");
      const nameNode = rowFragment.querySelector(".player-row__name");
      const badgeNode = rowFragment.querySelector(".player-row__badge");
      const actionsNode = rowFragment.querySelector('[data-role="player-actions"]');
      const status = getAttendanceStatus(game, player);
      const meta = getStatusMeta(status);
      const isSelected = selectedPlayerId && selectedPlayerId === player.id;

      nameNode.textContent = player.fullName;
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
          if (!selectedPlayerId) {
            setStatus("Select your name first so you can update your attendance.", "warning");
            return;
          }

          await updateAttendance(game.id, selectedPlayerId, buttonStatus);
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

async function updateAttendance(gameId, playerId, status) {
  if (!playerId) {
    return;
  }

  savingState = true;
  const player = getPlayerById(playerId);
  setStatus(`Saving ${player?.fullName ?? "player"}'s response...`, "warning");
  renderGames();
  renderPlayersAdminControls();
  renderGamesAdminControls();

  try {
    await updateDoc(doc(db, "games", gameId), {
      [`attendance.${playerId}`]: status,
      updatedAt: serverTimestamp(),
    });
    setStatus(`${player?.fullName ?? "Player"}'s availability was updated.`, "success");
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not save attendance to Firebase. Check Firestore rules and that the site is served over HTTP/HTTPS.",
      "error",
    );
  } finally {
    savingState = false;
    renderGames();
    renderPlayersAdminControls();
    renderGamesAdminControls();
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
  renderGamesAdminControls();
  renderPlayersAdminControls();

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
    renderGamesAdminControls();
    renderPlayersAdminControls();
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
  renderGamesAdminControls();
  renderPlayersAdminControls();

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
    renderGamesAdminControls();
    renderPlayersAdminControls();
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
  renderGamesAdminControls();
  renderPlayersAdminControls();

  try {
    await deleteDoc(doc(db, "games", gameId));
    setAdminStatus("Game deleted.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not delete the game. Check Firestore admin write access.", "error");
  } finally {
    savingState = false;
    renderGames();
    renderGamesAdminControls();
    renderPlayersAdminControls();
  }
}

async function createPlayer(updates) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in with an approved Google account before creating a player.", "error");
    return;
  }

  const firstName = updates.firstName.trim();
  const lastName = updates.lastName.trim();
  const fullName = buildFullName(firstName, lastName);

  if (!firstName || !lastName) {
    setAdminStatus("First name and last name are required to create a player.", "error");
    return;
  }

  savingState = true;
  setAdminStatus("Creating player...", "success");
  renderGames();
  renderPlayersAdminControls();
  renderGamesAdminControls();

  try {
    const playerId = buildPlayerId(firstName, lastName);
    await setDoc(doc(db, "players", playerId), {
      firstName,
      lastName,
      fullName,
      legacyNames: [fullName],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedByAdmin: normalizeEmail(adminUser?.email),
    });
    setAdminStatus(`${fullName} was added to the roster.`, "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not create the player. Check Firestore admin write access.", "error");
  } finally {
    savingState = false;
    renderGames();
    renderPlayersAdminControls();
    renderGamesAdminControls();
  }
}

async function updatePlayer(player, updates) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in with an approved Google account before editing a player.", "error");
    return;
  }

  const firstName = updates.firstName.trim();
  const lastName = updates.lastName.trim();
  const fullName = buildFullName(firstName, lastName);

  if (!firstName || !lastName) {
    setAdminStatus("First name and last name are required.", "error");
    return;
  }

  savingState = true;
  setAdminStatus("Saving player details...", "success");
  renderGames();
  renderPlayersAdminControls();
  renderGamesAdminControls();

  try {
    const legacyNames = Array.from(new Set([...(player.legacyNames ?? []), player.fullName, fullName]));

    await updateDoc(doc(db, "players", player.id), {
      firstName,
      lastName,
      fullName,
      legacyNames,
      updatedAt: serverTimestamp(),
      updatedByAdmin: normalizeEmail(adminUser?.email),
    });
    setAdminStatus(`${fullName} was updated.`, "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not update the player. Check Firestore admin write access.", "error");
  } finally {
    savingState = false;
    renderGames();
    renderPlayersAdminControls();
    renderGamesAdminControls();
  }
}

async function setPlayerActiveState(playerId, active, fullName) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in with an approved Google account before changing roster status.", "error");
    return;
  }

  savingState = true;
  setAdminStatus(`${active ? "Reactivating" : "Deactivating"} ${fullName}...`, "success");
  renderGames();
  renderPlayersAdminControls();
  renderGamesAdminControls();

  try {
    await updateDoc(doc(db, "players", playerId), {
      active,
      updatedAt: serverTimestamp(),
      updatedByAdmin: normalizeEmail(adminUser?.email),
    });

    if (!active && selectedPlayerId === playerId) {
      selectedPlayerId = "";
    }

    setAdminStatus(`${fullName} is now ${active ? "active" : "inactive"}.`, "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not update roster status. Check Firestore admin write access.", "error");
  } finally {
    savingState = false;
    renderPlayerSelect();
    renderGames();
    renderPlayersAdminControls();
    renderGamesAdminControls();
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
        await seedPlayersIfNeeded();
        await seedGamesIfNeeded();
      } catch (error) {
        console.error(error);
        setAdminStatus("Signed in, but could not seed or load admin data. Check Firestore permissions.", "error");
      }
    } else if (user) {
      setAdminStatus(`${user.email} is signed in, but not on the approved admin list.`, "error");
    } else {
      setAdminStatus("Admin tools are locked. Sign in with an approved Google account.", "");
    }

    renderPlayersAdminControls();
    renderGamesAdminControls();
  });
}

function bootstrapPlayersListener() {
  onSnapshot(
    collection(db, "players"),
    (snapshot) => {
      players = snapshot.docs
        .map(normalizePlayer)
        .sort((left, right) => {
          const lastNameCompare = left.lastName.localeCompare(right.lastName);
          if (lastNameCompare !== 0) {
            return lastNameCompare;
          }
          return left.firstName.localeCompare(right.firstName);
        });

      renderPlayerSelect();
      renderGames();
      renderPlayersAdminControls();
      renderGamesAdminControls();
    },
    (error) => {
      console.error(error);
      setStatus("Could not load the player roster from Firebase.", "error");
    },
  );
}

function bootstrapGamesListener() {
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
      renderGamesAdminControls();
    },
    (error) => {
      console.error(error);
      setStatus(
        "Firebase load failed. Make sure Firestore is enabled and your rules allow reads.",
        "error",
      );
    },
  );
}

renderPlayerSelect();
renderGames();
refreshAdminSessionUi();
setAdminStatus("Admin tools are locked. Sign in with an approved Google account.", "");
bootstrapPlayersListener();
bootstrapGamesListener();
initializeAdminAuth();
