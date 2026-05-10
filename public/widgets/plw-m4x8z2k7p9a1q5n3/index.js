const config = {
  id: "plw-m4x8z2k7p9a1q5n3",

  commands: {
    add: "!add",
    done: "!done",
    delete: "!del",
    focus: "!focus",
    check: "!check",
    clear: "!clear",
    remove: "!remove"
  },
  rewards: {
    nameGlow: "Nome glowy",
    nameColor1: "Name color 1",
    nameColor2: "Name color 2",
    nameColor3: "Name color 3",
    nameColor4: "Name color 4",
    nameColor5: "Name color 5",
    nameColor6: "Name color 6",
  },
  jebaited: {
    token: "",
  },

  chatMessages: {
    noPendingTasks: "you currently have no pending tasks",
    pendingTasks: "here are your pending tasks:",
  },
  permissions: {
    allowEveryoneToAddTasks: true,
    allowFollowersToAddTasks: false,
    allowSubscribersToAddTasks: false,
    allowVipsToAddTasks: false,
    allowModeratorsToAddTasks: false,
    allowStreamerToAddTasks: true,
    blockedUsers: "",
    blockBotsFromAddingTasks: true,
  }
};

const state = {
  tasks: [],
  focusedTask: null,
  userStyles: {},
};

let widgetConfig = structuredClone(config);
let commandSliderIntervalId = null;
let loopScrollStartedAt = Date.now();

export function init(options = {}) {
  console.log("[chat-todo] iniciado");

  createLayout();
  applyFieldData(options.fieldData || {});

  if (widgetConfig.settings.commandSliderEnabled) {
    startCommandSlider();
  }

  if (options.enableStreamElements) {
    setupStreamElementsEvents();
  }
}

function getFieldValue(fieldData, key, fallback) {
  const field = fieldData?.[key];

  if (field && typeof field === "object" && "value" in field) {
    return field.value ?? fallback;
  }

  return field ?? fallback;
}

function applyTheme(fieldData = {}) {
  const root = document.documentElement;

  root.style.setProperty(
    "--widget-width",
    getFieldValue(fieldData, "widgetWidth", "420px")
  );

  root.style.setProperty(
    "--card",
    getFieldValue(fieldData, "backgroundColor", "#1f1f1f")
  );

  root.style.setProperty(
    "--text",
    getFieldValue(fieldData, "textColor", "#ffffff")
  );

  root.style.setProperty(
    "--muted",
    getFieldValue(fieldData, "mutedColor", "#9f9f9f")
  );

  root.style.setProperty(
    "--accent",
    getFieldValue(fieldData, "accentColor", "#ffd166")
  );

  root.style.setProperty(
    "--focus",
    getFieldValue(fieldData, "focusColor", "#8ecae6")
  );

  root.style.setProperty(
    "--radius",
    getFieldValue(fieldData, "borderRadius", "16px")
  );

  console.log("[chat-todo] cores aplicadas:", {
    card: getComputedStyle(root).getPropertyValue("--card"),
    text: getComputedStyle(root).getPropertyValue("--text"),
    accent: getComputedStyle(root).getPropertyValue("--accent"),
    focus: getComputedStyle(root).getPropertyValue("--focus"),
  });
}

function applyFieldData(fieldData) {
  widgetConfig.commands.add =
    getFieldValue(fieldData, "addCommand", widgetConfig.commands.add);

  widgetConfig.commands.done =
    getFieldValue(fieldData, "doneCommand", widgetConfig.commands.done);

  widgetConfig.commands.delete =
    getFieldValue(fieldData, "deleteCommand", widgetConfig.commands.delete);

  widgetConfig.commands.focus =
    getFieldValue(fieldData, "focusCommand", widgetConfig.commands.focus);

  widgetConfig.commands.check =
    getFieldValue(fieldData, "checkCommand", widgetConfig.commands.check);

  widgetConfig.commands.clear =
    getFieldValue(fieldData, "clearCommand", widgetConfig.commands.clear);
  
  widgetConfig.commands.remove =
    getFieldValue(fieldData, "removeCommand", widgetConfig.commands.remove);

  widgetConfig.rewards = {
    ...widgetConfig.rewards,
    nameGlow: getFieldValue(fieldData, "nameGlowReward", "Nome glowy"),
    nameColor1: getFieldValue(fieldData, "nameColorReward1", "Name color 1"),
    nameColor2: getFieldValue(fieldData, "nameColorReward2", "Name color 2"),
    nameColor3: getFieldValue(fieldData, "nameColorReward3", "Name color 3"),
    nameColor4: getFieldValue(fieldData, "nameColorReward4", "Name color 4"),
    nameColor5: getFieldValue(fieldData, "nameColorReward5", "Name color 5"),
    nameColor6: getFieldValue(fieldData, "nameColorReward6", "Name color 6"),
  };

  widgetConfig.namePalette = {
    color1: getFieldValue(fieldData, "nameColor1", "#CAD6EF"),
    color2: getFieldValue(fieldData, "nameColor2", "#9CABE2"),
    color3: getFieldValue(fieldData, "nameColor3", "#FFD166"),
    color4: getFieldValue(fieldData, "nameColor4", "#BFADFF"),
    color5: getFieldValue(fieldData, "nameColor5", "#8ECAE6"),
    color6: getFieldValue(fieldData, "nameColor6", "#F4A7B9"),
  };  
  
  widgetConfig.jebaited = {
    token: getFieldValue(fieldData, "jebaitedToken", ""),
  };

  widgetConfig.chatMessages = {
    noPendingTasks: getFieldValue(
      fieldData,
      "noPendingTasksMessage",
      widgetConfig.chatMessages.noPendingTasks
    ),
    pendingTasks: getFieldValue(
      fieldData,
      "pendingTasksMessage",
      widgetConfig.chatMessages.pendingTasks
    ),
  };

  widgetConfig.permissions = {
    allowEveryoneToAddTasks: getFieldValue(
      fieldData,
      "allowEveryoneToAddTasks",
      widgetConfig.permissions.allowEveryoneToAddTasks
    ),
    allowFollowersToAddTasks: getFieldValue(
      fieldData,
      "allowFollowersToAddTasks",
      widgetConfig.permissions.allowFollowersToAddTasks
    ),
    allowSubscribersToAddTasks: getFieldValue(
      fieldData,
      "allowSubscribersToAddTasks",
      widgetConfig.permissions.allowSubscribersToAddTasks
    ),
    allowVipsToAddTasks: getFieldValue(
      fieldData,
      "allowVipsToAddTasks",
      widgetConfig.permissions.allowVipsToAddTasks
    ),
    allowModeratorsToAddTasks: getFieldValue(
      fieldData,
      "allowModeratorsToAddTasks",
      widgetConfig.permissions.allowModeratorsToAddTasks
    ),
    allowStreamerToAddTasks: getFieldValue(
      fieldData,
      "allowStreamerToAddTasks",
      widgetConfig.permissions.allowStreamerToAddTasks
    ),
    blockedUsers: getFieldValue(
      fieldData,
      "blockedUsers",
      widgetConfig.permissions.blockedUsers
    ),
    blockBotsFromAddingTasks: getFieldValue(
      fieldData,
      "blockBotsFromAddingTasks",
      widgetConfig.permissions.blockBotsFromAddingTasks
    ),
  };

  widgetConfig.settings = {
    ...widgetConfig.settings,
    commandSliderEnabled:
      fieldData.commandSliderEnabled ?? true,
    commandSliderInterval:
      Number(fieldData.commandSliderInterval) || 3500,
    showCompletedTasks:
      fieldData.showCompletedTasks ?? true,
    showProgress:
      fieldData.showProgress ?? true,
    orderMode:
      fieldData.orderMode || "groupByUserTodoDone",
    maxTasksPerUser:
      Number(fieldData.maxTasksPerUser) || 10,
    maxTaskLength:
      Number(fieldData.maxTaskLength) || 80,
    defaultStreamerNameColor:
      getFieldValue(fieldData, "defaultStreamerNameColor", "#ffd166"),

    defaultViewerNameColor:
      getFieldValue(fieldData, "defaultViewerNameColor", "#ffffff"),
  };

  applyTheme(fieldData);
}

function createLayout() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="chatTodo">

      <div class="chatTodo__focus">
        <div class="chatTodo__focusLabel">
          o que poulie está fazendo agora
        </div>

        <div class="chatTodo__focusTask" id="focusTask">
          não ta fazendo nada
        </div>
      </div>

      <div class="chatTodo__meta">
        <div class="chatTodo__commandSlide" id="commandSlide">
          !add tarefa
        </div>

        <div class="chatTodo__progress" id="progressText">
          0/0 completadas
        </div>
      </div>

      <div class="chatTodo__listViewport">
        <div class="chatTodo__listTrack" id="taskList"></div>
      </div>

    </div>
  `;
}

function startCommandSlider() {
  if (commandSliderIntervalId) {
    clearInterval(commandSliderIntervalId);
    commandSliderIntervalId = null;
  }

  const commands = [
    `${widgetConfig.commands.add} task name`,
    `${widgetConfig.commands.done} task number`,
    `${widgetConfig.commands.delete} task number`,
    `${widgetConfig.commands.focus} task number`,
  ];

  const commandSlide = document.getElementById("commandSlide");

  if (!commandSlide) return;

  let index = 0;

  commandSlide.textContent = commands[index];

  commandSliderIntervalId = setInterval(() => {
    commandSlide.classList.add("is-changing");

    setTimeout(() => {
      index = (index + 1) % commands.length;
      commandSlide.textContent = commands[index];
      commandSlide.classList.remove("is-changing");
    }, 250);
  }, widgetConfig.settings.commandSliderInterval);
}

function handleNameColorRedemption(username, colorValue) {
  const color = String(colorValue || "").trim();

  if (!color.startsWith("#")) return;

  if (!state.userStyles[username]) {
    state.userStyles[username] = {};
  }

  state.userStyles[username].color = color;

  renderTasks();
}

function handleNameGlowRedemption(username) {
  if (!state.userStyles[username]) {
    state.userStyles[username] = {};
  }

  state.userStyles[username].glow = true;

  renderTasks();
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getRedemptionRewardTitle(data) {
  return (
    data.rewardTitle ||
    data.reward?.title ||
    data.reward?.name ||
    data.reward ||
    data.title ||
    data.name ||
    data.itemName ||
    data.redemption?.reward?.title ||
    data.redemption?.reward?.name ||
    data.redemption ||
    ""
  );
}

function handleRedemption(event) {
  const data = event?.data || event;

  const username =
    data.displayName ||
    data.nick ||
    data.username ||
    data.name ||
    data.redemption?.user?.displayName ||
    data.redemption?.user?.login ||
    "unknown";

  const rewardTitle = getRedemptionRewardTitle(data);

  console.log("[chat-todo] redemption recebido:", {
    username,
    rewardTitle,
    rewardsConfigurados: widgetConfig.rewards,
    palette: widgetConfig.namePalette,
    data,
  });

  const colorRewards = [
    {
      reward: widgetConfig.rewards.nameColor1,
      color: widgetConfig.namePalette.color1,
    },
    {
      reward: widgetConfig.rewards.nameColor2,
      color: widgetConfig.namePalette.color2,
    },
    {
      reward: widgetConfig.rewards.nameColor3,
      color: widgetConfig.namePalette.color3,
    },
    {
      reward: widgetConfig.rewards.nameColor4,
      color: widgetConfig.namePalette.color4,
    },
    {
      reward: widgetConfig.rewards.nameColor5,
      color: widgetConfig.namePalette.color5,
    },
    {
      reward: widgetConfig.rewards.nameColor6,
      color: widgetConfig.namePalette.color6,
    },
  ];

  const matchedColorReward = colorRewards.find((item) => {
    return normalizeText(item.reward) === normalizeText(rewardTitle);
  });

  if (matchedColorReward) {
    console.log("[chat-todo] cor aplicada:", matchedColorReward.color);
    handleNameColorRedemption(username, matchedColorReward.color);
    return;
  }

  if (
    normalizeText(rewardTitle) ===
    normalizeText(widgetConfig.rewards.nameGlow)
  ) {
    handleNameGlowRedemption(username);
  }
}

function setupStreamElementsEvents() {
  window.addEventListener("onWidgetLoad", (obj) => {
    console.log("[chat-todo] onWidgetLoad recebido");

    const fieldData = obj?.detail?.fieldData || {};

    console.log("[chat-todo] fieldData:", fieldData);

    applyFieldData(fieldData);

    renderTasks();

    if (widgetConfig.settings.commandSliderEnabled) {
      startCommandSlider();
    }
  });

  window.addEventListener("onEventReceived", (obj) => {
    console.log("[chat-todo] qualquer evento:", obj.detail);
    const listener = obj.detail.listener;

    console.log("[chat-todo] evento recebido:", obj.detail);

    if (
      listener === "event:test" ||
      listener === "event" ||
      listener?.includes("redemption") ||
      listener?.includes("reward")
    ) {
      handleRedemption(obj.detail.event);
      return;
    }

    if (listener !== "message") return;

    const event = obj.detail.event.data;

    const username =
      event.displayName ||
      event.nick ||
      event.username ||
      "unknown";

    const message = event.text?.trim();

    if (!message) return;

    console.log("[chat]", username, message);

    const isBroadcaster = checkIsBroadcaster(event);

    handleCommand(username, message, isBroadcaster, event);
  });
}

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function getBlockedUsersList() {
  return String(widgetConfig.permissions?.blockedUsers || "")
    .split(/[,;\n]/)
    .map(normalizeUsername)
    .filter(Boolean);
}

function isKnownBot(username) {
  const normalized = normalizeUsername(username);

  const knownBots = [
    "streamelements",
    "streamlabs",
    "nightbot",
    "moobot",
    "fossabot",
    "wizebot",
    "sery_bot",
    "commanderroot",
    "botrix",
  ];

  return knownBots.includes(normalized) || normalized.endsWith("bot");
}

function hasBadge(event, badgeName) {
  const badges = event?.badges || event?.tags?.badges || "";

  if (typeof badges === "string") {
    return badges.toLowerCase().includes(badgeName);
  }

  if (Array.isArray(badges)) {
    return badges.some((badge) => {
      const type = String(badge.type || "").toLowerCase();
      const name = String(badge.name || "").toLowerCase();
      const id = String(badge._id || "").toLowerCase();

      return (
        type === badgeName ||
        name === badgeName ||
        id === badgeName
      );
    });
  }

  if (typeof badges === "object" && badges !== null) {
    return Boolean(badges[badgeName]);
  }

  return false;
}

function getUserRoles(event, isBroadcaster = false) {
  return {
    broadcaster: isBroadcaster || hasBadge(event, "broadcaster"),
    moderator: hasBadge(event, "moderator") || hasBadge(event, "mod"),
    subscriber: hasBadge(event, "subscriber"),
    vip: hasBadge(event, "vip"),
    founder: hasBadge(event, "founder"),
    follower: hasBadge(event, "follower"),
  };
}

function canUserAddTask(username, event = {}, isBroadcaster = false) {
  const normalizedUsername = normalizeUsername(username);

  const blockedUsers = getBlockedUsersList();

  if (blockedUsers.includes(normalizedUsername)) {
    console.log("[chat-todo] usuário bloqueado para adicionar task:", username);
    return false;
  }

  if (
    widgetConfig.permissions?.blockBotsFromAddingTasks &&
    isKnownBot(username)
  ) {
    console.log("[chat-todo] bot bloqueado para adicionar task:", username);
    return false;
  }

  const roles = getUserRoles(event, isBroadcaster);
  const permissions = widgetConfig.permissions || {};

  if (permissions.allowEveryoneToAddTasks) return true;

  if (permissions.allowStreamerToAddTasks && roles.broadcaster) return true;

  if (permissions.allowModeratorsToAddTasks && roles.moderator) return true;

  if (permissions.allowSubscribersToAddTasks && (roles.subscriber || roles.founder)) {
    return true;
  }

  if (permissions.allowVipsToAddTasks && roles.vip) return true;

  if (permissions.allowFollowersToAddTasks && roles.follower) return true;

  return false;
}

function normalizeCommandText(value) {
  return String(value || "").trim().toLowerCase();
}

function commandMatches(message, command) {
  const normalizedMessage = normalizeCommandText(message);
  const normalizedCommand = normalizeCommandText(command);

  return (
    normalizedMessage === normalizedCommand ||
    normalizedMessage.startsWith(normalizedCommand + " ")
  );
}

function removeCommandFromMessage(message, command) {
  return message.slice(command.length).trim();
}

function handleCommand(username, message, isBroadcaster = false, event = {}) {
  const {
    add,
    done,
    delete: del,
    focus,
    check,
    clear,
    remove,
  } = widgetConfig.commands;

  if (commandMatches(message, add)) {
    if (!canUserAddTask(username, event, isBroadcaster)) return;

    handleAdd(username, removeCommandFromMessage(message, add));
    return;
  }

  if (commandMatches(message, done)) {
    handleDone(username, removeCommandFromMessage(message, done));
    return;
  }

  if (commandMatches(message, del)) {
    handleDelete(username, removeCommandFromMessage(message, del));
    return;
  }

  if (commandMatches(message, focus)) {
    handleFocus(
      username,
      removeCommandFromMessage(message, focus),
      isBroadcaster
    );
    return;
  }

  if (normalizeCommandText(message) === normalizeCommandText(clear)) {
    handleClear(username, event, isBroadcaster);
    return;
  }

  if (commandMatches(message, remove)) {
    handleRemoveUserTasks(
      username,
      removeCommandFromMessage(message, remove),
      event,
      isBroadcaster
    );
    return;
  }

  if (normalizeCommandText(message) === normalizeCommandText(check)) {
    handleCheck(username);
    return;
  }
}

function canClearTasks(event = {}, isBroadcaster = false) {
  const roles = getUserRoles(event, isBroadcaster);

  return roles.broadcaster || roles.moderator;
}

function handleClear(username, event = {}, isBroadcaster = false) {
  if (!canClearTasks(event, isBroadcaster)) {
    console.log("[chat-todo] usuário sem permissão para limpar tasks:", username);
    return;
  }

  state.tasks = [];
  state.focusedTask = null;

  renderTasks();
}

function handleRemoveUserTasks(username, targetUsername = "", event = {}, isBroadcaster = false) {
  if (!canClearTasks(event, isBroadcaster)) {
    console.log("[chat-todo] usuário sem permissão para remover tasks:", username);
    return;
  }

  const normalizedTarget = normalizeUsername(targetUsername);

  if (!normalizedTarget) return;

  state.tasks = state.tasks.filter((task) => {
    return normalizeUsername(task.username) !== normalizedTarget;
  });

  if (
    state.focusedTask &&
    normalizeUsername(state.focusedTask.username) === normalizedTarget
  ) {
    state.focusedTask = null;
  }

  renderTasks();
}

function handleAdd(username, content) {
  if (!content) return;

  const splitTasks = content
    .split(/[,;]/)
    .map((task) => task.trim())
    .filter(Boolean);

  splitTasks.forEach((taskText) => {
    const userTasks = state.tasks.filter(
      (task) => task.username === username
    );

    const nextId = userTasks.length + 1;

    state.tasks.push({
      id: nextId,
      username,
      text: taskText,
      completed: false,
      focused: false,
    });
  });

  renderTasks();
}

function handleDone(username, taskId) {
  const task = state.tasks.find(
    (task) =>
      task.username === username &&
      task.id === Number(taskId)
  );

  if (!task) return;

  task.completed = true;

  renderTasks();
}

function handleDelete(username, taskId) {
  state.tasks = state.tasks.filter(
    (task) =>
      !(
        task.username === username &&
        task.id === Number(taskId)
      )
  );

  renderTasks();
}

function isStreamer(username) {
  const channelName =
    window.SE_API?.store?.channel?.username ||
    window.SE_API?.store?.channel?.name ||
    "";

  return (
    username.toLowerCase() === channelName.toLowerCase()
  );
}

function handleFocus(username, taskId, isBroadcaster = false) {
  state.tasks.forEach((task) => {
    if (task.username === username) {
      task.focused = false;
    }
  });

  const task = state.tasks.find(
    (task) =>
      task.username === username &&
      task.id === Number(taskId)
  );

  if (!task) return;

  task.focused = true;

  if (isBroadcaster) {
    state.focusedTask = task;
  }

  renderTasks();
}

async function sendChatMessage(message) {
  const token = widgetConfig.jebaited?.token?.trim();

  if (token) {
    try {
      const url = `https://api.jebaited.net/botMsg/${token}/${encodeURIComponent(message)}`;

      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        console.warn(
          "[chat-todo] Jebaited falhou:",
          await response.text()
        );
      }
    } catch (error) {
      console.warn("[chat-todo] erro ao enviar pelo Jebaited:", error);
    }

    return;
  }

  if (!window.SE_API?.chatMessage) {
    console.warn("[chat-todo] SE_API.chatMessage não disponível:", message);
    return;
  }

  window.SE_API.chatMessage(message);
}

function handleCheck(username) {
  const pendingTasks = state.tasks.filter(
    (task) =>
      task.username === username &&
      !task.completed
  );

  if (!pendingTasks.length) {
    sendChatMessage(
      `@${username}, ${widgetConfig.chatMessages.noPendingTasks}`
    );
    return;
  }

  const taskList = pendingTasks
    .map((task) => `${task.id}. ${task.text}`)
    .join(" | ");

  sendChatMessage(
    `@${username}, ${widgetConfig.chatMessages.pendingTasks} ${taskList}`
  );
}

function getUsernameStyle(username) {
  const custom = state.userStyles[username] || {};

  const isBroadcaster = isStreamer(username);

  const color =
    custom.color ||
    (
      isBroadcaster
        ? widgetConfig.settings.defaultStreamerNameColor
        : widgetConfig.settings.defaultViewerNameColor
    );

  const glow = custom.glow;

  return `
    color:${color};

    ${
      glow
        ? `
          text-shadow:
            0 0 8px ${color},
            0 0 18px ${color};
        `
        : ""
    }
  `;
}

function renderTasks() {
  const taskList = document.getElementById("taskList");

  const completedTasks = state.tasks.filter(
    (task) => task.completed
  ).length;

  const totalTasks = state.tasks.length;

  document.getElementById(
    "progressText"
  ).textContent = `${completedTasks}/${totalTasks} completed`;

  if (state.focusedTask) {
    document.getElementById(
      "focusTask"
    ).textContent = `${state.focusedTask.text}`;
  }

  taskList.innerHTML = "";

  const groupedUsers = {};

  state.tasks.forEach((task) => {
    if (!groupedUsers[task.username]) {
      groupedUsers[task.username] = [];
    }

    groupedUsers[task.username].push(task);
  });

  Object.entries(groupedUsers).forEach(([username, tasks]) => {
    const userCompletedTasks = tasks.filter((task) => task.completed).length;
    const userTotalTasks = tasks.length;
    const userBlock = document.createElement("div");

    userBlock.className = "chatTodo__user";

    userBlock.innerHTML = `
      <div class="chatTodo__userHeader">
        <div
          class="chatTodo__username
            ${state.userStyles[username]?.glow ? "is-glowy" : ""}
          "
          style="${getUsernameStyle(username)}"
        >
          ${username}
        </div>

        <div class="chatTodo__userProgress">
          ${userCompletedTasks}/${userTotalTasks} completed
        </div>
      </div>

      <div class="chatTodo__tasks">
        ${tasks
          .map((task) => {
            return `
              <div class="
                chatTodo__task
                ${task.completed ? "is-completed" : ""}
                ${task.focused ? "is-focused" : ""}
              ">
                <div class="chatTodo__taskCheck">
                  <div class="
                    chatTodo__checkbox
                    ${task.completed ? "is-checked" : ""}
                  ">
                    ${
                      task.completed
                        ? `
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M20 6L9 17L4 12"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="3"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        `
                        : ""
                    }
                  </div>

                  <span class="taskId">
                    ${task.id}.
                  </span>
                </div>

                <span class="taskText chatTodo__taskText">
                  ${task.text}
                </span>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    taskList.appendChild(userBlock);
  });

  setupLoopScroll();
}

function checkIsBroadcaster(event) {
  const badges = event?.badges || event?.tags?.badges || "";

  if (typeof badges === "string") {
    return badges.includes("broadcaster");
  }

  if (Array.isArray(badges)) {
    return badges.some((badge) => {
      return (
        badge.type === "broadcaster" ||
        badge.name === "broadcaster" ||
        badge._id === "broadcaster"
      );
    });
  }

  if (typeof badges === "object" && badges !== null) {
    return Boolean(badges.broadcaster);
  }

  return false;
}

function setupLoopScroll() {
  const viewport = document.querySelector(".chatTodo__listViewport");
  const track = document.getElementById("taskList");

  if (!viewport || !track) return;

  const wasLooping = track.classList.contains("is-looping");
  const previousDuration =
    parseFloat(track.style.getPropertyValue("--loop-duration")) || 12;

  let elapsedSeconds = 0;

  if (wasLooping) {
    elapsedSeconds = (Date.now() - loopScrollStartedAt) / 1000;
  } else {
    loopScrollStartedAt = Date.now();
  }

  track.classList.remove("is-looping");

  const originalItems = Array.from(track.children).filter(
    (item) => !item.classList.contains("is-clone")
  );

  track.querySelectorAll(".is-clone").forEach((clone) => clone.remove());

  if (!originalItems.length) return;

  const needsScroll = track.scrollHeight > viewport.clientHeight;

  if (!needsScroll) return;

  originalItems.forEach((item) => {
    const clone = item.cloneNode(true);
    clone.classList.add("is-clone");
    track.appendChild(clone);
  });

  const duration = Math.max(12, originalItems.length * 5);

  const preservedTime = wasLooping
    ? elapsedSeconds % duration
    : 0;

  track.style.setProperty("--loop-duration", `${duration}s`);
  track.style.setProperty("--loop-delay", `-${preservedTime}s`);

  requestAnimationFrame(() => {
    track.classList.add("is-looping");
  });
}