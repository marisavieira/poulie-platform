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

export function init(options = {}) {
  console.log("[chat-todo] iniciado");

  applyFieldData(options.fieldData || {});
  createLayout();
  startCommandSlider();

  if (options.enableStreamElements) {
    setupStreamElementsEvents();
  }
}

function applyFieldData(fieldData) {
  widgetConfig.commands.add =
    fieldData.addCommand || widgetConfig.commands.add;

  widgetConfig.commands.done =
    fieldData.doneCommand || widgetConfig.commands.done;

  widgetConfig.commands.delete =
    fieldData.deleteCommand || widgetConfig.commands.delete;

  widgetConfig.commands.focus =
    fieldData.focusCommand || widgetConfig.commands.focus;
}

function createLayout() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <div class="chatTodo">

      <div class="chatTodo__focus">
        <div class="chatTodo__focusLabel">
          CURRENT FOCUS
        </div>

        <div class="chatTodo__focusTask" id="focusTask">
          No task selected
        </div>
      </div>

      <div class="chatTodo__meta">
        <div class="chatTodo__commandSlide" id="commandSlide">
          !add tarefa
        </div>

        <div class="chatTodo__progress" id="progressText">
          0/0 completed
        </div>
      </div>

      <div class="chatTodo__list" id="taskList"></div>

    </div>
  `;
}

function startCommandSlider() {
  const commands = [
    `${widgetConfig.commands.add} tarefa`,
    `${widgetConfig.commands.done} 1`,
    `${widgetConfig.commands.delete} 1`,
    `${widgetConfig.commands.focus} 1`,
  ];

  const commandSlide = document.getElementById("commandSlide");

  if (!commandSlide) return;

  let index = 0;

  commandSlide.textContent = commands[index];

  setInterval(() => {
    commandSlide.classList.add("is-changing");

    setTimeout(() => {
      index = (index + 1) % commands.length;
      commandSlide.textContent = commands[index];
      commandSlide.classList.remove("is-changing");
    }, 250);
  }, 3500);
}

function setupStreamElementsEvents() {
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
    ).textContent =
      `${state.focusedTask.username}: ${state.focusedTask.text}`;
  }

  taskList.innerHTML = "";

  const groupedUsers = {};

  state.tasks.forEach((task) => {
    if (!groupedUsers[task.username]) {
      groupedUsers[task.username] = [];
    }

    groupedUsers[task.username].push(task);
  });

  Object.entries(groupedUsers).forEach(
    ([username, tasks]) => {
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
                  <span class="taskId">
                    ${task.id}.
                  </span>

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
    }
  );
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