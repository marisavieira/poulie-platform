import config from "./config.json" with { type: "json" };

const state = {
  currentDayKey: getDayKey(),
  currentSprint: 0,
  sprintOpen: false,
  activeUser: null,
  visible: true,
  hideTimeout: null,
  lastStampedIndex: null,
  showConfetti: false,
  isStamping: false,
  stampingIndex: null,
  users: {
    poulie: createUser("poulie", 4),
  },
};

function createUser(username, stamps = 0) {
  return {
    username,
    stamps,
    checkedInSprint: false,
    completedToday: false,
    updatedAt: Date.now(),
  };
}

function getDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ensureDayReset() {
  const today = getDayKey();

  if (today !== state.currentDayKey) {
    state.currentDayKey = today;
    state.currentSprint = 0;
    state.sprintOpen = false;
    state.activeUser = null;
    state.users = {};
  }
}

function getOrCreateUser(username) {
  const key = username.toLowerCase();

  if (!state.users[key]) {
    state.users[key] = createUser(username);
  }

  return state.users[key];
}

function openSprint() {
  ensureDayReset();

  state.currentSprint += 1;
  state.sprintOpen = true;

  Object.values(state.users).forEach((user) => {
    user.checkedInSprint = false;
  });

  render();
}

function checkInUser(username) {
  ensureDayReset();

  if (!state.sprintOpen) {
    console.log("[focus-card] Sprint ainda não foi aberta com !card");
    return;
  }

  const user = getOrCreateUser(username);

  if (user.checkedInSprint) {
    console.log(`[focus-card] ${username} já usou !i nesta sprint`);
    return;
  }

  if (state.isStamping) {
    return;
  }

  user.checkedInSprint = true;
  user.updatedAt = Date.now();

  state.activeUser = user.username;
  showForDuration();

  const stampedIndex = user.stamps;
  state.stampingIndex = stampedIndex;
  state.isStamping = true;

  render();

  setTimeout(() => {
    user.stamps += 1;
    state.lastStampedIndex = stampedIndex;
    state.isStamping = false;
    state.stampingIndex = null;

    if (user.stamps >= config.totalStamps) {
      state.showConfetti = true;

      render();

      setTimeout(() => {
        user.stamps = 0;
        user.completedToday = true;
        state.showConfetti = false;
        state.lastStampedIndex = null;
        render();
      }, 1400);

      return;
    }

    render();

    setTimeout(() => {
      state.lastStampedIndex = null;
    }, 350);
  }, 520);
}

function showForDuration() {
  state.visible = true;

  if (state.hideTimeout) {
    clearTimeout(state.hideTimeout);
  }

  state.hideTimeout = setTimeout(() => {
    state.visible = false;
    render();
  }, config.displayDurationMs);
}

function getActiveUser() {
  if (!state.activeUser) return null;
  return state.users[state.activeUser.toLowerCase()] || null;
}

function renderStamps(total, filled) {
  return Array.from({ length: total }, (_, index) => {
    const isFilled = index < filled;
    const isNew = isFilled && index === state.lastStampedIndex;
    const displayFilled = state.isStamping ? filled : filled;

    return `
      <div class="focus-card__stamp ${isFilled ? "is-filled" : "is-empty"} ${isNew ? "is-new" : ""}">
        <div class="focus-card__stamp-inner">
          ${isFilled ? ` 
            <img src="/assets/images/panda.svg"/>       
          `: ""}
        </div>
      </div>
    `;
  }).join("");
}

function render() {
  const root = document.getElementById("app");
  if (!root) return;

  const user = getActiveUser();

  if (!state.visible || !user) {
    root.innerHTML = "";
    return;
  }

  root.innerHTML = `
    <section class="focus-card">
      <div class="focus-card__header">
        <div class="focus-card__smile">
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="35" viewBox="0 8 34 18" fill="none">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M32.4469 2.31662C26.0148 14.277 13.1659 19.1396 1.23212 12.4062C0.834844 12.182 0.33105 12.3222 0.106836 12.7145C-0.117378 13.1139 0.0227709 13.6184 0.42005 13.8426C13.2115 21.0665 27.0069 15.9166 33.9015 3.10137C34.1173 2.70198 33.9667 2.19743 33.5652 1.98023C33.1637 1.77003 32.6627 1.91724 32.4469 2.31662Z" fill="#535F76"/>
                <path d="M11.2747 7.27662C12.6034 7.27662 13.6805 6.19954 13.6805 4.87087C13.6805 3.5422 12.6034 2.46512 11.2747 2.46512C9.94604 2.46512 8.86896 3.5422 8.86896 4.87087C8.86896 6.19954 9.94604 7.27662 11.2747 7.27662Z" fill="#535F76"/>
                <path d="M21.2341 4.71746C22.5368 4.71746 23.5929 3.66143 23.5929 2.35873C23.5929 1.05603 22.5368 0 21.2341 0C19.9314 0 18.8754 1.05603 18.8754 2.35873C18.8754 3.66143 19.9314 4.71746 21.2341 4.71746Z" fill="#535F76"/>
            </svg>
        </div>
        <div>
          <h1 class="focus-card__title">${user.username} ${config.titleSuffix}</h1>
          <p class="focus-card__subtitle">${config.checkInCommand} para ganhar seu selo</p>
        </div>
      </div>

      <div class="focus-card__grid-wrap">
        <div class="focus-card__grid">
          ${renderStamps(config.totalStamps, user.stamps)}
        </div>

        ${state.isStamping ? renderStampOverlay(state.stampingIndex) : ""}
      </div>

      ${state.showConfetti ? renderConfetti() : ""}
    </section>
  `;

  if (state.lastStampedIndex !== null) {
    setTimeout(() => {
      state.lastStampedIndex = null;
    }, 350);
  }
}

function renderStampOverlay(index) {
  const col = index % 3;
  const row = Math.floor(index / 3);

  return `
    <div class="focus-card__stamp-overlay">
      <div
        class="focus-card__stamp-ghost"
        style="--stamp-col:${col}; --stamp-row:${row};"
      >
        <div class="focus-card__stamp-ghost-inner">
          <img src="/assets/images/panda.svg" alt=""/>
        </div>
      </div>
    </div>
  `;
}

function renderConfetti() {
  return `
    <div class="focus-card__confetti" aria-hidden="true">
      ${Array.from({ length: 18 }, (_, i) => {
        const left = Math.random() * 100;
        const delay = (Math.random() * 0.5).toFixed(2);
        const duration = (0.9 + Math.random() * 0.8).toFixed(2);
        const size = 6 + Math.floor(Math.random() * 6);

        return `
          <span
            class="focus-card__confetti-piece"
            style="
              left:${left}%;
              animation-delay:${delay}s;
              animation-duration:${duration}s;
              width:${size}px;
              height:${size * 1.4}px;
            "
          ></span>
        `;
      }).join("")}
    </div>
  `;
}

function bindDebugCommands() {
  window.focusCardDebug = {
    openSprint,
    checkInUser,
    state,
  };

  console.log("[focus-card] Debug disponível em window.focusCardDebug");
  console.log("Use:");
  console.log("window.focusCardDebug.openSprint()");
  console.log("window.focusCardDebug.checkInUser('poulie')");
}

function handleChatCommand(username, message) {
  const text = String(message).trim().toLowerCase();

  if (text === config.openSprintCommand.toLowerCase()) {
    openSprint();
    return;
  }

  if (text === config.checkInCommand.toLowerCase()) {
    checkInUser(username);
  }
}

function bindStreamElementsEvents() {
  window.addEventListener("onWidgetLoad", () => {
    console.log("[focus-card] StreamElements carregado");
  });

  window.addEventListener("onEventReceived", (obj) => {
    const listener = obj?.detail?.listener;
    const event = obj?.detail?.event;

    if (!event) return;

    const username =
      event?.displayName ||
      event?.nick ||
      event?.name ||
      event?.data?.displayName ||
      event?.data?.nick ||
      event?.data?.name;

    const message =
      event?.text ||
      event?.msg ||
      event?.message ||
      event?.data?.text ||
      event?.data?.msg ||
      event?.data?.message;

    if (!username || !message) return;

    handleChatCommand(username, message);
  });
}

export function init(options = {}) {
  ensureDayReset();

  const {
    enableDebug = true,
    enableStreamElements = false,
  } = options;

  if (enableDebug) {
    bindDebugCommands();
  }

  if (enableStreamElements) {
    bindStreamElementsEvents();
  }

  render();
}