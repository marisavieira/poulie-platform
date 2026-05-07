const config = {
  id: "plw-m4x8z2k7p9a1q5n3",

  commands: {
    add: "!add",
    done: "!done",
    delete: "!del",
    focus: "!focus",
    check: "!check",
  },
};

const state = {
  tasks: [],
  focusedTask: null,
};

let widgetConfig = structuredClone(config);
let commandSliderIntervalId = null;

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
    const listener = obj.detail.listener;

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

    handleCommand(username, message, isBroadcaster);
  });
}

function handleCommand(username, message, isBroadcaster = false) {
  const {
    add,
    done,
    delete: del,
    focus,
    check
  } = widgetConfig.commands;

  if (message.startsWith(add)) {
    handleAdd(username, message.replace(add, "").trim());
    return;
  }

  if (message.startsWith(done)) {
    handleDone(username, message.replace(done, "").trim());
    return;
  }

  if (message.startsWith(del)) {
    handleDelete(username, message.replace(del, "").trim());
    return;
  }

  if (message.startsWith(focus)) {
    handleFocus(username, message.replace(focus, "").trim(), isBroadcaster);
  }

  if (message.startsWith(check)) {
    handleCheck(username);
    return;
  }
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

function sendChatMessage(message) {
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
      `@${username}, você não tem nenhuma tarefa pendente no momento.`
    );
    return;
  }

  const taskList = pendingTasks
    .map((task) => `${task.id}. ${task.text}`)
    .join(" | ");

  sendChatMessage(
    `@${username}, suas tarefas pendentes: ${taskList}`
  );
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
    const userBlock = document.createElement("div");

    userBlock.className = "chatTodo__user";

    userBlock.innerHTML = `
      <div class="chatTodo__username">
        ${username}
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

                <span class="taskText">
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

  track.style.setProperty("--loop-duration", `${duration}s`);
  track.classList.add("is-looping");
}