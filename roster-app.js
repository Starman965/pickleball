import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
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

const APPROVED_ADMIN_EMAILS = new Set([
  "demandgendave@gmail.com",
  "ronan@flycurrent.ai",
]);
const DEFAULT_NEW_GAME_TIME = "12:00";

const VIEW_META = {
  members: {
    label: "The Team",
    eyebrow: "Current roster",
    title: "The Team",
    copy: "Meet the Hawk'n'Roll players who make up the team this season.",
  },
  schedule: {
    label: "Schedule",
    eyebrow: "Blackhawk Country Club",
    title: "Team Schedule",
    copy:
      "See every matchup on the calendar, monitor live availability, and keep the roster aligned for each date.",
  },
  availability: {
    label: "Availability",
    eyebrow: "Player response",
    title: "Availability Board",
    copy:
      "Choose your name once and update your response for each matchup without leaving the schedule flow.",
  },
  roster: {
    label: "Game Rosters",
    eyebrow: "Captain planning",
    title: "Game Rosters",
    copy:
      "Select who is in for each matchup and keep the captain roster visible alongside availability counts.",
  },
  team: {
    label: "Team Standing",
    eyebrow: "Results",
    title: "Team Standing",
    copy:
      "Final matchup scores roll up into win-loss tracking against each opponent as results are entered.",
  },
  "player-admin": {
    label: "Player Mgmt",
    eyebrow: "Operations",
    title: "Player Mgmt",
    copy: "Add players, update names, and manage who is active on the team.",
  },
  "schedule-admin": {
    label: "Schedule Mgmt",
    eyebrow: "Operations",
    title: "Schedule Mgmt",
    copy: "Create matchups, update details, and enter final scores.",
  },
};

const PT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "America/Los_Angeles",
});

const PT_TIME_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Los_Angeles",
});

const PACIFIC_TZ = "America/Los_Angeles";

const PACIFIC_CLOCK_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: PACIFIC_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

const navToggle = document.getElementById("nav-toggle");
const navOverlay = document.getElementById("nav-overlay");
const sideNav = document.getElementById("side-nav");
const navButtons = Array.from(document.querySelectorAll("[data-view-target]"));
const playerAdminNav = document.getElementById("nav-player-admin");
const scheduleAdminNav = document.getElementById("nav-schedule-admin");
const viewSections = Array.from(document.querySelectorAll(".view-section"));
const topbarLabel = document.getElementById("topbar-label");
const heroStats = document.getElementById("hero-stats");
const matchesStatCard = document.getElementById("matches-stat-card");
const rosterStatCard = document.getElementById("roster-stat-card");

const membersGrid = document.getElementById("members-grid");
const scheduleGrid = document.getElementById("schedule-grid");
const playerSelect = document.getElementById("player-select");
const selectedPlayerName = document.getElementById("selected-player-name");
const statusBanner = document.getElementById("status-banner");
const gamesGrid = document.getElementById("games-grid");
const gamesPager = document.getElementById("games-pager");
const gamesPrev = document.getElementById("games-prev");
const gamesNext = document.getElementById("games-next");
const gamesPagerLabel = document.getElementById("games-pager-label");
const rosterGrid = document.getElementById("roster-grid");
const rosterPager = document.getElementById("roster-pager");
const rosterPrev = document.getElementById("roster-prev");
const rosterNext = document.getElementById("roster-next");
const rosterPagerLabel = document.getElementById("roster-pager-label");
const rosterViewEyebrow = document.getElementById("roster-view-eyebrow");
const rosterViewCopy = document.getElementById("roster-view-copy");
const teamStandingGrid = document.getElementById("team-standing-grid");
const teamStandingNote = document.getElementById("team-standing-note");
const gamesCount = document.getElementById("games-count");
const playersCount = document.getElementById("players-count");

const adminStatus = document.getElementById("admin-status");
const adminGrid = document.getElementById("admin-grid");
const adminGamesPager = document.getElementById("admin-games-pager");
const adminGamesPrev = document.getElementById("admin-games-prev");
const adminGamesNext = document.getElementById("admin-games-next");
const adminGamesPagerLabel = document.getElementById("admin-games-pager-label");
const playersAdminGrid = document.getElementById("players-admin-grid");
const playersAdminPager = document.getElementById("players-admin-pager");
const playersAdminPrev = document.getElementById("players-admin-prev");
const playersAdminNext = document.getElementById("players-admin-next");
const playersAdminPagerLabel = document.getElementById("players-admin-pager-label");
const adminUserEmail = document.getElementById("admin-user-email");
const adminHelperText = document.getElementById("admin-helper-text");
const adminSignIn = document.getElementById("admin-sign-in");
const adminSignOut = document.getElementById("admin-sign-out");

const scheduleCardTemplate = document.getElementById("schedule-card-template");
const availabilityCardTemplate = document.getElementById("availability-card-template");
const rosterCardTemplate = document.getElementById("roster-card-template");
const adminCardTemplate = document.getElementById("admin-card-template");
const playerAdminTemplate = document.getElementById("player-admin-template");
const playerTemplate = document.getElementById("player-row-template");

let activeView = "schedule";
let navOpen = false;
let selectedPlayerId = "";
let players = [];
let games = [];
let savingState = false;
let gameBoardIndex = 0;
let lastGamesSignature = "";
let rosterBoardIndex = 0;
let lastRosterSignature = "";
let gameAdminIndex = 0;
let lastGamesAdminSignature = "";
let playerAdminIndex = 0;
let lastPlayersSignature = "";
let adminUser = null;
let isApprovedAdmin = false;
let lastAuthFlowEvent = "No Firebase auth event yet";
let lastAuthStateEvent = "Firebase auth state has not reported yet";

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

function buildPlayerInitials(player) {
  const initials = `${player.firstName?.[0] ?? ""}${player.lastName?.[0] ?? ""}`.trim();
  if (initials) {
    return initials.toUpperCase();
  }

  return (player.fullName?.slice(0, 2) ?? "TM").toUpperCase();
}

function getPlayerById(playerId) {
  return players.find((player) => player.id === playerId) ?? null;
}

function getPlayerNameById(playerId) {
  return getPlayerById(playerId)?.fullName ?? "Former player";
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
  if (!statusBanner) {
    return;
  }

  statusBanner.textContent = message;
  statusBanner.className = "status-banner";
  if (tone === "warning" || tone === "error") {
    statusBanner.classList.add(`is-${tone}`);
  } else {
    statusBanner.classList.add("is-hidden");
  }
}

function setAdminStatus(message, tone = "") {
  if (!adminStatus) {
    return;
  }

  adminStatus.textContent = message;
  adminStatus.className = "admin-status";
  if (tone === "warning" || tone === "error") {
    adminStatus.classList.add(`is-${tone}`);
  } else {
    adminStatus.classList.add("is-hidden");
  }
}

function refreshAdminSessionUi() {
  if (adminUserEmail) {
    adminUserEmail.textContent = adminUser?.email ?? "Not signed in";
  }
  if (adminSignIn) {
    adminSignIn.hidden = Boolean(adminUser);
  }
  if (adminSignOut) {
    adminSignOut.hidden = !adminUser;
  }

  if (!adminHelperText) {
    return;
  }

  if (isApprovedAdmin) {
    adminHelperText.textContent = "";
  } else if (adminUser) {
    adminHelperText.textContent = "This account is signed in, but it is not on the approved admin list.";
  } else {
    adminHelperText.textContent =
      "Sign in with an approved admin account to manage players, rosters, and scores.";
  }
}

function setNavOpen(nextOpen) {
  navOpen = nextOpen;
  document.body.classList.toggle("nav-open", navOpen);
  if (sideNav) {
    sideNav.classList.toggle("is-open", navOpen);
  }
  if (navOverlay) {
    navOverlay.hidden = !navOpen;
  }
  if (navToggle) {
    navToggle.setAttribute("aria-expanded", String(navOpen));
  }
}

function setActiveView(viewId) {
  if (!VIEW_META[viewId]) {
    return;
  }
  if ((viewId === "player-admin" || viewId === "schedule-admin") && !isApprovedAdmin) {
    return;
  }
  activeView = viewId;
  setNavOpen(false);
  renderApp();
}

function syncAdminNavAccess() {
  const adminViewsVisible = isApprovedAdmin;

  if (playerAdminNav) {
    playerAdminNav.hidden = !adminViewsVisible;
  }

  if (scheduleAdminNav) {
    scheduleAdminNav.hidden = !adminViewsVisible;
  }

  if (!adminViewsVisible && (activeView === "player-admin" || activeView === "schedule-admin")) {
    activeView = "schedule";
  }
}

function updateViewUi() {
  syncAdminNavAccess();
  const meta = VIEW_META[activeView];
  if (topbarLabel) {
    topbarLabel.textContent = meta.label;
  }

  if (heroStats) {
    const showStats = !["availability", "team", "roster"].includes(activeView);
    const showMatchesStat = activeView === "schedule" || activeView === "schedule-admin";
    const showRosterStat = activeView === "player-admin" || activeView === "members";

    heroStats.hidden = !showStats;

    if (matchesStatCard) {
      matchesStatCard.hidden = !showMatchesStat;
    }

    if (rosterStatCard) {
      rosterStatCard.hidden = !showRosterStat;
    }

    heroStats.classList.toggle("hero__stats--single", showStats && showMatchesStat !== showRosterStat);
  }

  navButtons.forEach((button) => {
    const isActive = button.dataset.viewTarget === activeView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  viewSections.forEach((section) => {
    section.hidden = section.id !== `view-${activeView}`;
  });
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((entry) => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeNullableNumber(value) {
  if (value === "" || value === null || typeof value === "undefined") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMatchStatus(value) {
  return value === "completed" ? "completed" : "scheduled";
}

function deriveMatchResult(matchStatus, teamScore, opponentScore) {
  if (matchStatus !== "completed") {
    return "pending";
  }
  if (teamScore === null || opponentScore === null) {
    return "pending";
  }
  if (teamScore > opponentScore) {
    return "win";
  }
  if (teamScore < opponentScore) {
    return "loss";
  }
  return "tie";
}

function hasFinalScore(game) {
  return game.teamScore !== null && game.opponentScore !== null;
}

function createDefaultAttendance(playerList = getActivePlayers()) {
  return playerList.reduce((accumulator, player) => {
    accumulator[player.id] = "unknown";
    return accumulator;
  }, {});
}

function normalizeTimeHHMM(value) {
  if (!value || typeof value !== "string") {
    return "10:00";
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return "10:00";
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return "10:00";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function readPacificClock(utcMs) {
  const parts = PACIFIC_CLOCK_FORMATTER.formatToParts(new Date(utcMs));
  const pick = (type) => Number(parts.find((part) => part.type === type)?.value ?? NaN);

  return {
    y: pick("year"),
    mo: pick("month"),
    d: pick("day"),
    h: pick("hour"),
    m: pick("minute"),
  };
}

function pacificDateKeyFromUtcMs(utcMs) {
  const z = readPacificClock(utcMs);
  if (Number.isNaN(z.y) || Number.isNaN(z.mo) || Number.isNaN(z.d)) {
    return "";
  }

  return `${String(z.y).padStart(4, "0")}-${String(z.mo).padStart(2, "0")}-${String(z.d).padStart(2, "0")}`;
}

function pacificDateKeyFromIso(isoDateStr) {
  const ms = Date.parse(isoDateStr);
  if (Number.isNaN(ms)) {
    return "";
  }
  return pacificDateKeyFromUtcMs(ms);
}

function pacificWallTimeToUtcMs(dateValue, timeHHMM) {
  const [y, mo, d] = dateValue.split("-").map(Number);
  const [h, mi] = timeHHMM.split(":").map(Number);
  const dayStart = Date.UTC(y, mo - 1, d, 0, 0, 0);

  for (let ms = dayStart - 12 * 3600 * 1000; ms < dayStart + 36 * 3600 * 1000; ms += 60 * 1000) {
    const z = readPacificClock(ms);
    if (z.y === y && z.mo === mo && z.d === d && z.h === h && z.m === mi) {
      return ms;
    }
  }

  return dayStart;
}

function pacificTimeInputValueFromIso(isoDateStr) {
  const ms = Date.parse(isoDateStr);
  if (Number.isNaN(ms)) {
    return "10:00";
  }

  const z = readPacificClock(ms);
  if (Number.isNaN(z.h) || Number.isNaN(z.m)) {
    return "10:00";
  }

  return `${String(z.h).padStart(2, "0")}:${String(z.m).padStart(2, "0")}`;
}

function buildScheduleFields(dateValue, timeHHMM = "10:00") {
  const time = normalizeTimeHHMM(timeHHMM);
  const utcMs = pacificWallTimeToUtcMs(dateValue, time);
  const instant = new Date(utcMs);

  return {
    isoDate: instant.toISOString(),
    dateLabel: PT_DATE_FORMATTER.format(instant),
    timeLabel: `${PT_TIME_LABEL_FORMATTER.format(instant)} PT`,
  };
}

function buildBlankGameDraft() {
  return {
    isoDate: "",
    dateLabel: "Date TBD",
    timeLabel: "Time TBD",
    dateTbd: true,
    location: "Blackhawk Country Club",
    opponent: "New matchup",
    matchStatus: "scheduled",
    teamScore: null,
    opponentScore: null,
  };
}

function createGameId(dateValue, opponent, location) {
  const safeDateValue = (dateValue || "tbd").trim() || "tbd";
  const slugSource = `${opponent}-${location}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${safeDateValue}-${slugSource || "game"}-${suffix}`;
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
    legacyNames: normalizeStringArray(data.legacyNames),
  };
}

function normalizeGame(docSnapshot) {
  const data = docSnapshot.data();
  const rosterPlayerIds = normalizeStringArray(data.rosterPlayerIds);
  const teamScore = normalizeNullableNumber(data.teamScore);
  const opponentScore = normalizeNullableNumber(data.opponentScore);
  const matchStatus = normalizeMatchStatus(data.matchStatus);
  const dateTbd = data.dateTbd === true || (!data.isoDate && data.dateLabel === "Date TBD");

  return {
    id: docSnapshot.id,
    dateLabel: data.dateLabel ?? (dateTbd ? "Date TBD" : "Game Date"),
    isoDate: data.isoDate ?? "",
    timeLabel: data.timeLabel ?? (dateTbd ? "Time TBD" : "10:00 AM PT"),
    dateTbd,
    location: data.location ?? "Location TBD",
    opponent: data.opponent ?? "Team Session",
    attendance: data.attendance ?? {},
    rosterPlayerIds,
    matchStatus,
    teamScore,
    opponentScore,
    result: data.result ?? deriveMatchResult(matchStatus, teamScore, opponentScore),
  };
}

function buildSummary(game, playerList = getActivePlayers()) {
  const counts = { in: 0, out: 0, unknown: 0 };

  playerList.forEach((player) => {
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

function getRosterPlayerIds(game) {
  return normalizeStringArray(game.rosterPlayerIds);
}

function getRosterPlayers(game) {
  return getRosterPlayerIds(game).map((playerId) => ({
    id: playerId,
    fullName: getPlayerNameById(playerId),
  }));
}

function buildRosterStatusChipMeta(status) {
  if (status === "in") {
    return {
      chipClassName: "roster-chip--status-in",
      chipPrefix: "✓ ",
    };
  }

  if (status === "out") {
    return {
      chipClassName: "roster-chip--status-out",
      chipPrefix: "- ",
    };
  }

  return {
    chipClassName: "roster-chip--status-unknown",
    chipPrefix: "? ",
  };
}

function getNextUpcomingFromSortedList(sortedList) {
  if (!sortedList.length) {
    return null;
  }

  const todayKey = pacificDateKeyFromUtcMs(Date.now());
  for (let i = 0; i < sortedList.length; i += 1) {
    const gameDateKey = pacificDateKeyFromIso(sortedList[i].isoDate);
    if (gameDateKey && gameDateKey >= todayKey) {
      return sortedList[i];
    }
  }

  const firstTbdGame = sortedList.find((game) => game.dateTbd);
  if (firstTbdGame) {
    return firstTbdGame;
  }

  return sortedList[sortedList.length - 1];
}

function findNextUpcomingGameIndex() {
  if (!games.length) {
    return 0;
  }

  const todayKey = pacificDateKeyFromUtcMs(Date.now());
  const index = games.findIndex((game) => {
    const gameDateKey = pacificDateKeyFromIso(game.isoDate);
    return gameDateKey && gameDateKey >= todayKey;
  });

  if (index !== -1) {
    return index;
  }

  const firstTbdIndex = games.findIndex((game) => game.dateTbd);
  return firstTbdIndex === -1 ? games.length - 1 : firstTbdIndex;
}

function syncGameBoardIndex() {
  const signature = games.map((game) => game.id).join("\n");
  if (signature !== lastGamesSignature) {
    lastGamesSignature = signature;
    gameBoardIndex = findNextUpcomingGameIndex();
    return;
  }

  if (!games.length) {
    gameBoardIndex = 0;
    return;
  }

  if (gameBoardIndex < 0 || gameBoardIndex >= games.length) {
    gameBoardIndex = findNextUpcomingGameIndex();
  }
}

function syncRosterBoardIndex() {
  const signature = games.map((game) => game.id).join("\n");
  if (signature !== lastRosterSignature) {
    lastRosterSignature = signature;
    rosterBoardIndex = findNextUpcomingGameIndex();
    return;
  }

  if (!games.length) {
    rosterBoardIndex = 0;
    return;
  }

  if (rosterBoardIndex < 0 || rosterBoardIndex >= games.length) {
    rosterBoardIndex = findNextUpcomingGameIndex();
  }
}

function syncGameAdminIndex() {
  const signature = games.map((game) => game.id).join("\n");
  if (signature !== lastGamesAdminSignature) {
    lastGamesAdminSignature = signature;
    gameAdminIndex = 0;
    return;
  }

  if (!games.length) {
    gameAdminIndex = 0;
    return;
  }

  if (gameAdminIndex < 0 || gameAdminIndex >= games.length) {
    gameAdminIndex = 0;
  }
}

function syncPlayerAdminIndex() {
  const signature = players.map((player) => player.id).join("\n");
  if (signature !== lastPlayersSignature) {
    lastPlayersSignature = signature;
    playerAdminIndex = 0;
    return;
  }

  if (!players.length) {
    playerAdminIndex = 0;
    return;
  }

  if (playerAdminIndex < 0 || playerAdminIndex >= players.length) {
    playerAdminIndex = 0;
  }
}

function getStatusMeta(status) {
  if (status === "in") {
    return { label: "Available", className: "status-badge status-badge--in" };
  }
  if (status === "out") {
    return { label: "Unavailable", className: "status-badge status-badge--out" };
  }
  return { label: "No response", className: "status-badge" };
}

function createRosterGroup(title, players, emptyMessage, options = {}) {
  const group = document.createElement("section");
  group.className = "roster-group";

  const titleNode = document.createElement("h4");
  titleNode.className = "roster-group__title";
  titleNode.textContent = title;
  group.append(titleNode);

  const list = document.createElement("div");
  list.className = "roster-group__list";

  if (players.length) {
    players.forEach((player) => {
      const chip = document.createElement(options.interactive ? "button" : "span");
      chip.className = `roster-chip ${options.chipClassName ?? ""}`.trim();
      if (player.chipClassName) {
        chip.classList.add(player.chipClassName);
      }
      chip.textContent = `${player.chipPrefix ?? ""}${player.fullName}`;
      if (options.interactive) {
        chip.type = "button";
        chip.classList.add("roster-chip--button");
        chip.disabled = Boolean(options.disabled);
        chip.addEventListener("click", () => {
          options.onChipClick?.(player);
        });
      }
      list.append(chip);
    });
  } else {
    const emptyChip = document.createElement("span");
    emptyChip.className = "roster-chip roster-chip--empty";
    emptyChip.textContent = emptyMessage;
    list.append(emptyChip);
  }

  group.append(list);
  return group;
}

function sortPlayersByName(playerList) {
  return [...playerList].sort((left, right) => left.fullName.localeCompare(right.fullName));
}

function getGameBadgeMeta(game) {
  if (game.dateTbd) {
    return { label: "TBD", className: "game-card__badge game-card__badge--muted" };
  }

  const todayKey = pacificDateKeyFromUtcMs(Date.now());
  const gameDateKey = pacificDateKeyFromIso(game.isoDate);

  if (game.matchStatus === "completed") {
    if (game.result === "win") {
      return { label: "Win", className: "game-card__badge game-card__badge--win" };
    }
    if (game.result === "loss") {
      return { label: "Loss", className: "game-card__badge game-card__badge--loss" };
    }
    if (game.result === "tie") {
      return { label: "Tie", className: "game-card__badge game-card__badge--tie" };
    }
    return { label: "Completed", className: "game-card__badge game-card__badge--muted" };
  }

  if (gameDateKey && gameDateKey === todayKey) {
    return { label: "Today", className: "game-card__badge game-card__badge--today" };
  }

  if (gameDateKey && gameDateKey < todayKey) {
    return { label: "Past", className: "game-card__badge game-card__badge--muted" };
  }

  return { label: "Upcoming", className: "game-card__badge" };
}

function compareGamesForDisplay(left, right) {
  if (left.dateTbd !== right.dateTbd) {
    return left.dateTbd ? 1 : -1;
  }

  if (left.dateTbd && right.dateTbd) {
    const opponentCompare = left.opponent.localeCompare(right.opponent);
    if (opponentCompare !== 0) {
      return opponentCompare;
    }
    return left.location.localeCompare(right.location);
  }

  return left.isoDate.localeCompare(right.isoDate);
}

function renderPlayerSelect() {
  const activePlayers = getActivePlayers();
  if (playerSelect) {
    playerSelect.innerHTML = "";
  }

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = activePlayers.length ? "Select your name" : "No active players yet";
  if (playerSelect) {
    playerSelect.append(defaultOption);
  }

  activePlayers.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.fullName;
    option.selected = player.id === selectedPlayerId;
    if (playerSelect) {
      playerSelect.append(option);
    }
  });

  if (selectedPlayerId && !getPlayerById(selectedPlayerId)?.active) {
    selectedPlayerId = "";
  }

  const selectedPlayer = getPlayerById(selectedPlayerId);
  if (selectedPlayerName) {
    selectedPlayerName.textContent = selectedPlayer?.fullName ?? "None selected";
  }
  if (playersCount) {
    playersCount.textContent = String(activePlayers.length);
  }
}

function buildScheduleCardElement(game) {
  const fragment = scheduleCardTemplate.content.cloneNode(true);

  fragment.querySelector('[data-role="schedule-date"]').textContent = game.dateLabel;
  fragment.querySelector('[data-role="schedule-title"]').textContent = game.opponent;
  fragment.querySelector('[data-role="schedule-meta"]').textContent = `${game.timeLabel} • ${game.location}`;

  return fragment;
}

function buildAvailabilityCardElement(game, activePlayers) {
  const fragment = availabilityCardTemplate.content.cloneNode(true);
  const badge = getGameBadgeMeta(game);
  const summary = buildSummary(game, activePlayers);
  const badgeNode = fragment.querySelector('[data-role="availability-badge"]');
  const playerListNode = fragment.querySelector('[data-role="player-list"]');
  const availabilityLocked = game.dateTbd === true;

  fragment.querySelector(".game-card__date").textContent = game.dateLabel;
  fragment.querySelector(".game-card__title").textContent = game.opponent;
  fragment.querySelector(".game-card__meta").textContent = `${game.timeLabel} • ${game.location}`;
  badgeNode.textContent = badge.label;
  badgeNode.className = badge.className;
  fragment.querySelector('[data-role="in-count"]').textContent = String(summary.in);
  fragment.querySelector('[data-role="out-count"]').textContent = String(summary.out);
  fragment.querySelector('[data-role="pending-count"]').textContent = String(summary.unknown);

  activePlayers.forEach((player) => {
    const rowFragment = playerTemplate.content.cloneNode(true);
    const row = rowFragment.querySelector(".player-row");
    const nameNode = rowFragment.querySelector(".player-row__name");
    const badgeNodeInner = rowFragment.querySelector(".player-row__badge");
    const actionsNode = rowFragment.querySelector('[data-role="player-actions"]');
    const status = getAttendanceStatus(game, player);
    const statusMeta = getStatusMeta(status);
    const isSelected = selectedPlayerId && selectedPlayerId === player.id;

    nameNode.textContent = player.fullName;
    badgeNodeInner.textContent = statusMeta.label;
    badgeNodeInner.className = statusMeta.className;

    if (isSelected) {
      row.classList.add("player-row--selected");
      badgeNodeInner.classList.add("status-badge--selected");
    }

    actionsNode.querySelectorAll("button").forEach((button) => {
      const buttonStatus = button.dataset.status;
      if (buttonStatus === status) {
        button.classList.add("action-btn--active");
      }
      button.disabled = savingState || availabilityLocked;
      if (availabilityLocked) {
        button.title = "Availability opens once the matchup date and time are set.";
      }
      button.addEventListener("click", async () => {
        if (!selectedPlayerId) {
          setStatus("Select your name first so you can update your availability.", "warning");
          return;
        }
        if (availabilityLocked) {
          setStatus("Availability is locked for this matchup until the date and time are set.", "warning");
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

  return fragment;
}

function buildRosterCardElement(game) {
  const fragment = rosterCardTemplate.content.cloneNode(true);
  const badge = getGameBadgeMeta(game);
  const activePlayers = getActivePlayers();
  const summary = buildSummary(game, activePlayers);
  const rosterPlayerIds = getRosterPlayerIds(game);
  const toggleListNode = fragment.querySelector('[data-role="roster-toggle-list"]');
  const selectedNode = fragment.querySelector('[data-role="roster-selected"]');
  const helperNode = fragment.querySelector('[data-role="roster-helper"]');

  fragment.querySelector('[data-role="roster-date"]').textContent = game.dateLabel;
  fragment.querySelector('[data-role="roster-title"]').textContent = game.opponent;
  fragment.querySelector('[data-role="roster-meta"]').textContent = `${game.timeLabel} • ${game.location}`;
  fragment.querySelector('[data-role="roster-selected-count"]').textContent = String(rosterPlayerIds.length);
  fragment.querySelector('[data-role="roster-in-count"]').textContent = String(summary.in);
  fragment.querySelector('[data-role="roster-pending-count"]').textContent = String(summary.unknown);

  const badgeNode = fragment.querySelector('[data-role="roster-badge"]');
  badgeNode.textContent = badge.label;
  badgeNode.className = badge.className;

  helperNode.textContent = isApprovedAdmin
    ? "Tap a player to move them between Playing and Not playing this match."
    : "See who is playing in this matchup and who is not playing.";

  const playingPlayers = sortPlayersByName(
    rosterPlayerIds.map((playerId) => {
      const player = getPlayerById(playerId);
      const availabilityStatus = player ? getAttendanceStatus(game, player) : "unknown";
      return {
        id: playerId,
        fullName: player?.fullName ?? "Former player",
        availabilityStatus,
        ...buildRosterStatusChipMeta(availabilityStatus),
      };
    }),
  );

  const benchPlayers = sortPlayersByName(
    activePlayers
      .filter((player) => !rosterPlayerIds.includes(player.id))
      .map((player) => {
        const availabilityStatus = getAttendanceStatus(game, player);
        return {
          id: player.id,
          fullName: player.fullName,
          availabilityStatus,
          ...buildRosterStatusChipMeta(availabilityStatus),
        };
      }),
  );

  if (!activePlayers.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "games-grid__empty";
    emptyState.textContent = "No active players are available to assign yet.";
    selectedNode.append(emptyState);
    toggleListNode.hidden = true;
    return fragment;
  }

  const playingGroup = createRosterGroup("Playing", playingPlayers, "Roster has not been set yet", {
    interactive: isApprovedAdmin,
    disabled: savingState,
    onChipClick: async (player) => {
      await updateGameRoster(
        game.id,
        rosterPlayerIds.filter((playerId) => playerId !== player.id),
      );
    },
  });

  const notPlayingGroup = createRosterGroup(
    "Not playing this match",
    benchPlayers,
    "Everyone is currently playing",
    {
      interactive: isApprovedAdmin,
      disabled: savingState,
      onChipClick: async (player) => {
        await updateGameRoster(game.id, [...rosterPlayerIds, player.id]);
      },
    },
  );

  selectedNode.append(playingGroup, notPlayingGroup);
  toggleListNode.hidden = true;

  return fragment;
}

function createStandingCard(title, body, meta = "") {
  const card = document.createElement("article");
  card.className = "game-card standing-card";

  const titleNode = document.createElement("h3");
  titleNode.className = "standing-card__title";
  titleNode.textContent = title;

  const bodyNode = document.createElement("p");
  bodyNode.className = "standing-card__body";
  bodyNode.textContent = body;

  card.append(titleNode, bodyNode);

  if (meta) {
    const metaNode = document.createElement("p");
    metaNode.className = "standing-card__meta";
    metaNode.textContent = meta;
    card.append(metaNode);
  }

  return card;
}

function buildTeamStandingRows() {
  const rows = new Map();

  games.forEach((game) => {
    if (game.matchStatus !== "completed" || game.result === "pending") {
      return;
    }

    const key = game.opponent || "Unknown opponent";
    const row = rows.get(key) ?? {
      opponent: key,
      wins: 0,
      losses: 0,
      ties: 0,
      matches: 0,
      pointsFor: 0,
      pointsAgainst: 0,
    };

    row.matches += 1;
    if (game.result === "win") {
      row.wins += 1;
    } else if (game.result === "loss") {
      row.losses += 1;
    } else if (game.result === "tie") {
      row.ties += 1;
    }

    row.pointsFor += game.teamScore ?? 0;
    row.pointsAgainst += game.opponentScore ?? 0;
    rows.set(key, row);
  });

  return Array.from(rows.values()).sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }
    if (left.losses !== right.losses) {
      return left.losses - right.losses;
    }
    return left.opponent.localeCompare(right.opponent);
  });
}

function renderScheduleView() {
  if (!scheduleGrid) {
    return;
  }

  scheduleGrid.innerHTML = "";

  if (!games.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No matchups are scheduled yet.";
    scheduleGrid.append(empty);
    return;
  }

  games.forEach((game) => {
    scheduleGrid.append(buildScheduleCardElement(game));
  });
}

function buildTeamMemberCard(player) {
  const card = document.createElement("article");
  card.className = "game-card team-member-card";

  const top = document.createElement("div");
  top.className = "team-member-card__top";

  const avatar = document.createElement("div");
  avatar.className = "team-member-card__avatar";
  avatar.textContent = buildPlayerInitials(player);

  const badge = document.createElement("span");
  badge.className = `game-card__badge ${player.active ? "" : "game-card__badge--muted"}`.trim();
  badge.textContent = player.active ? "Active" : "Inactive";

  top.append(avatar, badge);

  const name = document.createElement("h3");
  name.className = "team-member-card__name";
  name.textContent = player.fullName || "Team player";

  const meta = document.createElement("p");
  meta.className = "team-member-card__meta";
  meta.textContent = player.active ? "Current team player" : "Not currently active";

  card.append(top, name, meta);
  return card;
}

function updateGamesPager() {
  if (!gamesPager || !gamesPagerLabel || !gamesPrev || !gamesNext) {
    return;
  }

  const total = games.length;

  if (total <= 1 || !selectedPlayerId) {
    gamesPager.classList.add("is-hidden");
    return;
  }

  gamesPager.classList.remove("is-hidden");
  gamesPagerLabel.textContent = `Matchup ${gameBoardIndex + 1} of ${total}`;
  gamesPrev.disabled = gameBoardIndex <= 0 || savingState;
  gamesNext.disabled = gameBoardIndex >= total - 1 || savingState;
}

function updateRosterPager() {
  if (!rosterPager || !rosterPagerLabel || !rosterPrev || !rosterNext) {
    return;
  }

  const total = games.length;

  if (total <= 1) {
    rosterPager.classList.add("is-hidden");
    return;
  }

  rosterPager.classList.remove("is-hidden");
  rosterPagerLabel.textContent = `Matchup ${rosterBoardIndex + 1} of ${total}`;
  rosterPrev.disabled = rosterBoardIndex <= 0 || savingState;
  rosterNext.disabled = rosterBoardIndex >= total - 1 || savingState;
}

function renderAvailabilityView() {
  if (!gamesGrid) {
    return;
  }

  syncGameBoardIndex();
  gamesGrid.innerHTML = "";
  const activePlayers = getActivePlayers();

  if (!games.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No matchups are scheduled yet.";
    gamesGrid.append(empty);
    updateGamesPager();
    return;
  }

  if (!activePlayers.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No active players are on the roster yet. An admin can add players in Admin.";
    gamesGrid.append(empty);
    updateGamesPager();
    return;
  }

  if (!selectedPlayerId) {
    updateGamesPager();
    return;
  }

  gamesGrid.append(buildAvailabilityCardElement(games[gameBoardIndex], activePlayers));
  updateGamesPager();
}

function renderRosterView() {
  if (!rosterGrid) {
    return;
  }

  syncRosterBoardIndex();
  rosterGrid.innerHTML = "";

  if (rosterViewEyebrow && rosterViewCopy) {
    rosterViewEyebrow.textContent = isApprovedAdmin ? "Captain view" : "Team view";
    rosterViewCopy.textContent = isApprovedAdmin
      ? "Choose which active players are in for each matchup."
      : "See who is playing in each matchup and who is not playing.";
  }

  if (!games.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No matchups are available for roster planning yet.";
    rosterGrid.append(empty);
    updateRosterPager();
    return;
  }

  rosterGrid.append(buildRosterCardElement(games[rosterBoardIndex]));
  updateRosterPager();
}

function renderTeamStandingView() {
  if (!teamStandingGrid || !teamStandingNote) {
    return;
  }

  teamStandingGrid.innerHTML = "";

  const completedGames = games.filter((game) => game.matchStatus === "completed" && game.result !== "pending");
  if (!completedGames.length) {
    teamStandingNote.hidden = false;
    return;
  }

  teamStandingNote.hidden = true;

  const wins = completedGames.filter((game) => game.result === "win").length;
  const losses = completedGames.filter((game) => game.result === "loss").length;
  const ties = completedGames.filter((game) => game.result === "tie").length;
  const winPct = completedGames.length ? ((wins + ties * 0.5) / completedGames.length).toFixed(3) : "0.000";

  teamStandingGrid.append(
    createStandingCard("Overall record", `${wins}-${losses}${ties ? `-${ties}` : ""}`, `${completedGames.length} completed matchups`),
    createStandingCard("Win %", winPct, "Wins plus half ties over completed matchups"),
  );

  buildTeamStandingRows().forEach((row) => {
    teamStandingGrid.append(
      createStandingCard(
        row.opponent,
        `${row.wins}-${row.losses}${row.ties ? `-${row.ties}` : ""}`,
        `PF ${row.pointsFor} • PA ${row.pointsAgainst}`,
      ),
    );
  });
}

function renderMembersView() {
  if (!membersGrid) {
    return;
  }

  membersGrid.innerHTML = "";

  if (!players.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No players are on the roster yet.";
    membersGrid.append(empty);
    return;
  }

  players.forEach((player) => {
    membersGrid.append(buildTeamMemberCard(player));
  });
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
  const timeInput = fragment.querySelector('[data-role="time-input"]');
  const tbdInput = fragment.querySelector('[data-role="tbd-input"]');
  const locationInput = fragment.querySelector('[data-role="location-input"]');
  const opponentInput = fragment.querySelector('[data-role="opponent-input"]');
  const statusInput = fragment.querySelector('[data-role="status-input"]');
  const teamScoreInput = fragment.querySelector('[data-role="team-score-input"]');
  const opponentScoreInput = fragment.querySelector('[data-role="opponent-score-input"]');

  title.textContent = options.title ?? game.opponent;
  meta.textContent = options.meta ?? `${game.dateLabel} • ${game.location}`;
  if (options.hideBadge) {
    badge.hidden = true;
  } else {
    badge.hidden = false;
    badge.textContent = hasFinalScore(game) ? `Final ${game.teamScore}-${game.opponentScore}` : (game.dateTbd ? "TBD" : game.timeLabel);
  }

  dateInput.value = game.dateTbd ? "" : (game.isoDate ? game.isoDate.slice(0, 10) : "");
  timeInput.value = game.dateTbd ? "" : pacificTimeInputValueFromIso(game.isoDate);
  tbdInput.checked = game.dateTbd === true;
  locationInput.value = game.location;
  opponentInput.value = game.opponent;
  statusInput.value = game.matchStatus ?? "scheduled";
  teamScoreInput.value = game.teamScore ?? "";
  opponentScoreInput.value = game.opponentScore ?? "";

  const syncTbdUi = () => {
    const isTbd = tbdInput.checked;
    dateInput.disabled = isTbd;
    timeInput.disabled = isTbd;

    if (!isTbd && !timeInput.value) {
      timeInput.value = DEFAULT_NEW_GAME_TIME;
    }
  };

  syncTbdUi();
  tbdInput.addEventListener("change", syncTbdUi);

  return {
    card,
    form,
    actions,
    dateInput,
    timeInput,
    tbdInput,
    locationInput,
    opponentInput,
    statusInput,
    teamScoreInput,
    opponentScoreInput,
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
  meta.textContent = options.meta ?? "Update a player's name or remove them from the active list.";
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

function updatePlayersAdminPager() {
  if (!playersAdminPager || !playersAdminPagerLabel || !playersAdminPrev || !playersAdminNext) {
    return;
  }

  const total = players.length;

  if (total <= 1 || !isApprovedAdmin) {
    playersAdminPager.classList.add("is-hidden");
    return;
  }

  playersAdminPager.classList.remove("is-hidden");
  playersAdminPagerLabel.textContent = `Player ${playerAdminIndex + 1} of ${total}`;
  playersAdminPrev.disabled = playerAdminIndex <= 0 || savingState;
  playersAdminNext.disabled = playerAdminIndex >= total - 1 || savingState;
}

function buildExistingPlayerAdminCard(player) {
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

  return adminCard.card;
}

function renderPlayersAdminControls() {
  if (!playersAdminGrid) {
    return;
  }

  syncPlayerAdminIndex();
  playersAdminGrid.innerHTML = "";

  if (!isApprovedAdmin) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "Sign in with an approved admin account to manage the roster.";
    playersAdminGrid.append(empty);
    updatePlayersAdminPager();
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
      meta: "Add a new player to the roster.",
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

  if (!players.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No players are loaded yet. Use the card above to create the first player.";
    playersAdminGrid.append(empty, createCard.card);
    updatePlayersAdminPager();
    return;
  }

  playersAdminGrid.append(buildExistingPlayerAdminCard(players[playerAdminIndex]), createCard.card);
  updatePlayersAdminPager();
}

function updateGamesAdminPager() {
  if (!adminGamesPager || !adminGamesPagerLabel || !adminGamesPrev || !adminGamesNext) {
    return;
  }

  const total = games.length;

  if (total <= 1 || !isApprovedAdmin) {
    adminGamesPager.classList.add("is-hidden");
    return;
  }

  adminGamesPager.classList.remove("is-hidden");
  adminGamesPagerLabel.textContent = `Matchup ${gameAdminIndex + 1} of ${total}`;
  adminGamesPrev.disabled = gameAdminIndex <= 0 || savingState;
  adminGamesNext.disabled = gameAdminIndex >= total - 1 || savingState;
}

function buildExistingGameAdminCard(game) {
  const adminCard = buildAdminGameCard(game);

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "action-btn";
  resetButton.textContent = "Reset";
  resetButton.disabled = savingState;
  resetButton.addEventListener("click", () => {
    adminCard.dateInput.value = game.dateTbd ? "" : game.isoDate.slice(0, 10);
    adminCard.timeInput.value = game.dateTbd ? "" : pacificTimeInputValueFromIso(game.isoDate);
    adminCard.tbdInput.checked = game.dateTbd === true;
    adminCard.dateInput.disabled = game.dateTbd === true;
    adminCard.timeInput.disabled = game.dateTbd === true;
    adminCard.locationInput.value = game.location;
    adminCard.opponentInput.value = game.opponent;
    adminCard.statusInput.value = game.matchStatus;
    adminCard.teamScoreInput.value = game.teamScore ?? "";
    adminCard.opponentScoreInput.value = game.opponentScore ?? "";
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
      scheduledTime: adminCard.timeInput.value,
      dateTbd: adminCard.tbdInput.checked,
      location: adminCard.locationInput.value.trim(),
      opponent: adminCard.opponentInput.value.trim(),
      matchStatus: adminCard.statusInput.value,
      teamScore: adminCard.teamScoreInput.value,
      opponentScore: adminCard.opponentScoreInput.value,
    });
  });

  return adminCard.card;
}

function renderGamesAdminControls() {
  if (!adminGrid) {
    return;
  }

  syncGameAdminIndex();
  adminGrid.innerHTML = "";

  if (!isApprovedAdmin) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "Sign in with an approved admin account to manage matchups and scores.";
    adminGrid.append(empty);
    updateGamesAdminPager();
    return;
  }

  const createCard = buildAdminGameCard(buildBlankGameDraft(), {
    title: "Create matchup",
    meta: "Add a new matchup to the live team schedule.",
    hideBadge: true,
  });

  createCard.card.classList.add("admin-card--create");

  const createButton = document.createElement("button");
  createButton.type = "submit";
  createButton.className = "action-btn action-btn--active";
  createButton.textContent = "Create matchup";
  createButton.disabled = savingState;

  createCard.actions.append(createButton);
  createCard.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await createGame({
      scheduledDate: createCard.dateInput.value,
      scheduledTime: createCard.timeInput.value,
      dateTbd: createCard.tbdInput.checked,
      location: createCard.locationInput.value.trim(),
      opponent: createCard.opponentInput.value.trim(),
      matchStatus: createCard.statusInput.value,
      teamScore: createCard.teamScoreInput.value,
      opponentScore: createCard.opponentScoreInput.value,
    });
  });

  if (!games.length) {
    const empty = document.createElement("div");
    empty.className = "games-grid__empty";
    empty.textContent = "No matchups are available to edit yet. Use the card above to create the first one.";
    adminGrid.append(empty, createCard.card);
    updateGamesAdminPager();
    return;
  }

  adminGrid.append(buildExistingGameAdminCard(games[gameAdminIndex]), createCard.card);
  updateGamesAdminPager();
}

function buildGamePersistencePayload(updates) {
  const scheduledDate = updates.scheduledDate;
  const scheduledTime = updates.scheduledTime;
  const dateTbd = updates.dateTbd === true;
  const location = updates.location.trim();
  const opponent = updates.opponent.trim();

  if ((!dateTbd && (!scheduledDate || !scheduledTime)) || !location || !opponent) {
    return { error: "Location and match label are required, and dated matchups need a date and time." };
  }

  const teamScore = normalizeNullableNumber(updates.teamScore);
  const opponentScore = normalizeNullableNumber(updates.opponentScore);
  const scorePairIsIncomplete = (teamScore === null) !== (opponentScore === null);

  if (scorePairIsIncomplete) {
    return { error: "Enter both final scores or leave both score fields empty." };
  }

  const requestedStatus = normalizeMatchStatus(updates.matchStatus);
  if (dateTbd && requestedStatus === "completed") {
    return { error: "Set the real date and time before marking a matchup completed." };
  }
  if (requestedStatus === "completed" && (teamScore === null || opponentScore === null)) {
    return { error: "Completed matchups need both final scores." };
  }

  const matchStatus =
    requestedStatus === "completed" || (teamScore !== null && opponentScore !== null) ? "completed" : "scheduled";

  return {
    scheduledDate,
    scheduledTime,
    dateTbd,
    location,
    opponent,
    matchStatus,
    teamScore,
    opponentScore,
    result: deriveMatchResult(matchStatus, teamScore, opponentScore),
  };
}

async function beginAdminSignIn() {
  try {
    lastAuthFlowEvent = "Trying popup sign-in flow";
    refreshAdminSessionUi();
    setAdminStatus("Opening Google sign-in...", "warning");
    const result = await signInWithPopup(auth, googleProvider);
    lastAuthFlowEvent = `Popup sign-in completed for ${result.user.email ?? "unknown email"}`;
    refreshAdminSessionUi();
  } catch (error) {
    console.error(error);

    const fallbackCodes = new Set([
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/cancelled-popup-request",
      "auth/operation-not-supported-in-this-environment",
    ]);

    if (fallbackCodes.has(error.code)) {
      try {
        lastAuthFlowEvent = `Popup failed with ${error.code}; falling back to redirect`;
        refreshAdminSessionUi();
        setAdminStatus("Sign-in popup was blocked. Trying redirect sign-in...", "warning");
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        console.error(redirectError);
        lastAuthFlowEvent = `Redirect fallback failed with ${redirectError.code ?? "unknown error"}`;
        refreshAdminSessionUi();
        setAdminStatus("Sign-in could not start. Check the Firebase sign-in setup.", "error");
        return;
      }
    }

    lastAuthFlowEvent = `Popup sign-in failed with ${error.code ?? "unknown error"}`;
    refreshAdminSessionUi();
    setAdminStatus("Sign-in could not start. Check the Firebase sign-in setup.", "error");
  }
}

async function updateAttendance(gameId, playerId, status) {
  if (!playerId) {
    return;
  }

  const game = games.find((item) => item.id === gameId);
  if (game?.dateTbd) {
    setStatus("Availability is locked for this matchup until the date and time are set.", "warning");
    return;
  }

  savingState = true;
  const player = getPlayerById(playerId);
  setStatus(`Saving ${player?.fullName ?? "player"}'s response...`, "warning");
  renderApp();

  try {
    await updateDoc(doc(db, "games", gameId), {
      [`attendance.${playerId}`]: status,
      updatedAt: serverTimestamp(),
    });
    setStatus(`${player?.fullName ?? "Player"}'s availability was updated.`, "success");
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not save availability to Firebase. Check Firestore rules and that the site is served over HTTP/HTTPS.",
      "error",
    );
  } finally {
    savingState = false;
    renderApp();
  }
}

async function updateGameRoster(gameId, rosterPlayerIds) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in first to update matchup rosters.", "error");
    return;
  }

  savingState = true;
  setAdminStatus("Saving roster selection...", "warning");
  renderApp();

  try {
    await updateDoc(doc(db, "games", gameId), {
      rosterPlayerIds: normalizeStringArray(rosterPlayerIds),
      updatedAt: serverTimestamp(),
      updatedByAdmin: normalizeEmail(adminUser?.email),
    });
    setAdminStatus("Roster selection saved.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not save that roster selection right now.", "error");
  } finally {
    savingState = false;
    renderApp();
  }
}

async function updateGameDetails(gameId, updates) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in first to update the schedule.", "error");
    return;
  }

  const normalized = buildGamePersistencePayload(updates);
  if (normalized.error) {
    setAdminStatus(normalized.error, "error");
    return;
  }

  savingState = true;
  setAdminStatus("Saving matchup details...", "warning");
  renderApp();

  try {
    await updateDoc(doc(db, "games", gameId), {
      ...(normalized.dateTbd
        ? {
            isoDate: "",
            dateLabel: "Date TBD",
            timeLabel: "Time TBD",
            dateTbd: true,
          }
        : {
            ...buildScheduleFields(normalized.scheduledDate, normalized.scheduledTime),
            dateTbd: false,
          }),
      location: normalized.location,
      opponent: normalized.opponent,
      matchStatus: normalized.matchStatus,
      teamScore: normalized.teamScore,
      opponentScore: normalized.opponentScore,
      result: normalized.result,
      completedAt: normalized.matchStatus === "completed" ? serverTimestamp() : null,
      completedByAdmin:
        normalized.matchStatus === "completed" ? normalizeEmail(adminUser?.email) : null,
      updatedAt: serverTimestamp(),
      updatedByAdmin: normalizeEmail(adminUser?.email),
    });
    setAdminStatus("Matchup details saved to Firebase.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not save those changes right now.", "error");
  } finally {
    savingState = false;
    renderApp();
  }
}

async function createGame(updates) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in first to add a matchup.", "error");
    return;
  }

  const normalized = buildGamePersistencePayload(updates);
  if (normalized.error) {
    setAdminStatus(normalized.error, "error");
    return;
  }

  savingState = true;
  setAdminStatus("Creating matchup...", "warning");
  renderApp();

  const gameId = createGameId(normalized.scheduledDate, normalized.opponent, normalized.location);

  try {
    await setDoc(doc(db, "games", gameId), {
      id: gameId,
      ...(normalized.dateTbd
        ? {
            isoDate: "",
            dateLabel: "Date TBD",
            timeLabel: "Time TBD",
            dateTbd: true,
          }
        : {
            ...buildScheduleFields(normalized.scheduledDate, normalized.scheduledTime),
            dateTbd: false,
          }),
      location: normalized.location,
      opponent: normalized.opponent,
      attendance: createDefaultAttendance(),
      rosterPlayerIds: [],
      matchStatus: normalized.matchStatus,
      teamScore: normalized.teamScore,
      opponentScore: normalized.opponentScore,
      result: normalized.result,
      completedAt: normalized.matchStatus === "completed" ? serverTimestamp() : null,
      completedByAdmin:
        normalized.matchStatus === "completed" ? normalizeEmail(adminUser?.email) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdByAdmin: normalizeEmail(adminUser?.email),
      updatedByAdmin: normalizeEmail(adminUser?.email),
    });
    setAdminStatus("New matchup created.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not create that matchup right now.", "error");
  } finally {
    savingState = false;
    renderApp();
  }
}

async function deleteGame(gameId, gameName) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in first to delete a matchup.", "error");
    return;
  }

  savingState = true;
  setAdminStatus(`Deleting ${gameName}...`, "warning");
  renderApp();

  try {
    await deleteDoc(doc(db, "games", gameId));
    setAdminStatus("Matchup deleted.", "success");
  } catch (error) {
    console.error(error);
    setAdminStatus("Could not delete that matchup right now.", "error");
  } finally {
    savingState = false;
    renderApp();
  }
}

async function createPlayer(updates) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in first to add a player.", "error");
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
  setAdminStatus("Creating player...", "warning");
  renderApp();

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
    setAdminStatus("Could not add that player right now.", "error");
  } finally {
    savingState = false;
    renderApp();
  }
}

async function updatePlayer(player, updates) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in first to edit a player.", "error");
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
  setAdminStatus("Saving player details...", "warning");
  renderApp();

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
    setAdminStatus("Could not update that player right now.", "error");
  } finally {
    savingState = false;
    renderApp();
  }
}

async function setPlayerActiveState(playerId, active, fullName) {
  if (!isApprovedAdmin) {
    setAdminStatus("Sign in first to update the roster.", "error");
    return;
  }

  savingState = true;
  setAdminStatus(`${active ? "Reactivating" : "Deactivating"} ${fullName}...`, "warning");
  renderApp();

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
    setAdminStatus("Could not update that player right now.", "error");
  } finally {
    savingState = false;
    renderApp();
  }
}

async function initializeAdminAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      lastAuthFlowEvent = `Redirect sign-in completed for ${redirectResult.user.email ?? "unknown email"}`;
    } else {
      lastAuthFlowEvent = "No redirect result was returned";
    }
  } catch (error) {
    console.error(error);
    lastAuthFlowEvent = `Redirect sign-in failed with ${error.code ?? "unknown error"}`;
    refreshAdminSessionUi();
    setAdminStatus("Google sign-in is not ready yet. Check the Firebase sign-in setup.", "error");
  }

  onAuthStateChanged(auth, async (user) => {
    adminUser = user;
    isApprovedAdmin = userIsApprovedAdmin(user);
    lastAuthStateEvent = user
      ? `Firebase auth state is signed in as ${user.email ?? "unknown email"}`
      : "Firebase auth state is signed out";
    refreshAdminSessionUi();

    if (isApprovedAdmin) {
      setAdminStatus(`Signed in as ${user.email}.`, "success");
    } else if (user) {
      setAdminStatus(`${user.email} is signed in, but it is not an approved admin account.`, "error");
    } else {
      setAdminStatus("Sign in to make changes.", "");
    }

    renderApp();
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

      renderApp();
    },
    (error) => {
      console.error(error);
      setStatus("Could not load the player roster from Firebase.", "error");
    },
  );
}

function bootstrapGamesListener() {
  gamesCount.textContent = "0";
  setStatus("Connecting to Firebase and loading schedule...", "warning");

  onSnapshot(
    collection(db, "games"),
    (snapshot) => {
      games = snapshot.docs
        .map(normalizeGame)
        .sort(compareGamesForDisplay);

      gamesCount.textContent = String(games.length);
      setStatus("Live schedule connected. Availability and roster updates are ready.", "success");
      renderApp();
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

function renderApp() {
  updateViewUi();
  refreshAdminSessionUi();
  renderPlayerSelect();
  renderMembersView();
  renderScheduleView();
  renderAvailabilityView();
  renderRosterView();
  renderTeamStandingView();
  renderPlayersAdminControls();
  renderGamesAdminControls();
}

if (navToggle) {
  navToggle.addEventListener("click", () => {
    setNavOpen(!navOpen);
  });
}

if (navOverlay) {
  navOverlay.addEventListener("click", () => {
    setNavOpen(false);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navOpen) {
    setNavOpen(false);
  }
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.viewTarget);
  });
});

if (adminSignIn) {
  adminSignIn.addEventListener("click", async () => {
    await beginAdminSignIn();
  });
}

if (adminSignOut) {
  adminSignOut.addEventListener("click", async () => {
    try {
      await signOut(auth);
      setAdminStatus("Signed out of admin access.", "");
    } catch (error) {
      console.error(error);
      setAdminStatus("Could not sign out right now.", "error");
    }
  });
}

if (playerSelect) {
  playerSelect.addEventListener("change", (event) => {
    selectedPlayerId = event.target.value;
    renderApp();
  });
}

if (gamesPrev) {
  gamesPrev.addEventListener("click", () => {
    if (gameBoardIndex > 0) {
      gameBoardIndex -= 1;
      renderAvailabilityView();
    }
  });
}

if (gamesNext) {
  gamesNext.addEventListener("click", () => {
    if (gameBoardIndex < games.length - 1) {
      gameBoardIndex += 1;
      renderAvailabilityView();
    }
  });
}

if (rosterPrev) {
  rosterPrev.addEventListener("click", () => {
    if (rosterBoardIndex > 0) {
      rosterBoardIndex -= 1;
      renderRosterView();
    }
  });
}

if (rosterNext) {
  rosterNext.addEventListener("click", () => {
    if (rosterBoardIndex < games.length - 1) {
      rosterBoardIndex += 1;
      renderRosterView();
    }
  });
}

if (adminGamesPrev) {
  adminGamesPrev.addEventListener("click", () => {
    if (gameAdminIndex > 0) {
      gameAdminIndex -= 1;
      renderGamesAdminControls();
    }
  });
}

if (adminGamesNext) {
  adminGamesNext.addEventListener("click", () => {
    if (gameAdminIndex < games.length - 1) {
      gameAdminIndex += 1;
      renderGamesAdminControls();
    }
  });
}

if (playersAdminPrev) {
  playersAdminPrev.addEventListener("click", () => {
    if (playerAdminIndex > 0) {
      playerAdminIndex -= 1;
      renderPlayersAdminControls();
    }
  });
}

if (playersAdminNext) {
  playersAdminNext.addEventListener("click", () => {
    if (playerAdminIndex < players.length - 1) {
      playerAdminIndex += 1;
      renderPlayersAdminControls();
    }
  });
}

renderApp();
setAdminStatus("Sign in to make changes.", "");
bootstrapPlayersListener();
bootstrapGamesListener();
initializeAdminAuth();
