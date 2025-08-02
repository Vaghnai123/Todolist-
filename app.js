// Main Application Class
class TaskMasterApp {
  constructor() {
    this.currentUser = null;
    this.tasks = [];
    this.currentFilter = "all";
    this.isImportant = false;
    this.init();
  }

  init() {
    this.checkAuthentication();
    this.loadUserData();
    this.bindEvents();
    this.renderTasks();
    this.updateStats();
    this.updateUserInterface();
    this.askNotificationPermission();
    this.startReminderChecker();
    this.startCountdownUpdater();
    this.initVoiceRecognition();
    this.initEventListeners();
  }

  //Speech Text
  initVoiceRecognition() {
    const voiceBtn = document.getElementById("voiceInputBtn");
    const taskInput = document.getElementById("taskInput");

    if (!voiceBtn || !taskInput) return;

    if ("webkitSpeechRecognition" in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      voiceBtn.addEventListener("click", () => {
        recognition.start();
        voiceBtn.innerText = "🎙️ Listening...";
      });

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        taskInput.value = transcript;
        voiceBtn.innerText = "🎤";
      };

      recognition.onerror = (event) => {
        voiceBtn.innerText = "🎤";
        console.error("Voice Recognition Error:", event.error);
        alert("Voice input error: " + event.error);
      };

      recognition.onend = () => {
        voiceBtn.innerText = "🎤";
      };
    } else {
      voiceBtn.disabled = true;
      voiceBtn.title = "Voice input not supported in this browser.";
    }
  }

  //Notification
  askNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then((perm) => {
        console.log("Notification permission:", perm);
      });
    }
  }
  startReminderChecker() {
    setInterval(() => {
      const now = new Date();
      let changed = false;

      this.tasks.forEach((task) => {
        if (!task.deadline || task.completed || task.notified) return;

        const deadline = new Date(task.deadline);
        const diffMins = (deadline - now) / 1000 / 60;

        if (diffMins > 0 && diffMins <= 15) {
          this.triggerReminder(task);
          task.notified = true;
          changed = true;
        }
      });

      if (changed) {
        this.saveUserData(); // Save updated notified status
      }
    }, 60 * 1000); // every 1 minute
  }
  triggerReminder(task) {
    const message = `⏰ "${task.title}" is due at ${new Date(
      task.deadline
    ).toLocaleTimeString()}`;

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Task Reminder", {
        body: message,
        icon: "https://cdn-icons-png.flaticon.com/512/595/595067.png",
      });
    } else {
      alert(message);
    }
  }
  //notification end

  checkAuthentication() {
    const user = localStorage.getItem("taskmaster_current_user");
    const isAuthenticated = sessionStorage.getItem("taskmaster_authenticated");

    if (!user || !isAuthenticated) {
      window.location.href = "index.html";
      return;
    }

    this.currentUser = JSON.parse(user);
  }

  loadUserData() {
    const users = JSON.parse(localStorage.getItem("taskmaster_users") || "[]");
    const user = users.find((u) => u.id === this.currentUser.id);

    if (user) {
      this.tasks = user.tasks || [];
    }
  }

  saveUserData() {
    const users = JSON.parse(localStorage.getItem("taskmaster_users") || "[]");
    const userIndex = users.findIndex((u) => u.id === this.currentUser.id);

    if (userIndex !== -1) {
      users[userIndex].tasks = this.tasks;
      localStorage.setItem("taskmaster_users", JSON.stringify(users));
    }
  }

  bindEvents() {
    // Task form submission
    const taskForm = document.getElementById("taskForm");
    taskForm?.addEventListener("submit", (e) => this.handleAddTask(e));

    // Important button toggle
    const importantBtn = document.getElementById("importantBtn");
    importantBtn?.addEventListener("click", () => this.toggleImportant());

    // Filter navigation
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => this.handleFilterChange(e));
    });

    // Clear completed tasks
    const clearCompletedBtn = document.getElementById("clearCompleted");
    clearCompletedBtn?.addEventListener("click", () =>
      this.clearCompletedTasks()
    );

    // User menu
    const userMenuBtn = document.getElementById("userMenuBtn");
    const userDropdown = document.getElementById("userDropdown");

    userMenuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      userDropdown?.classList.remove("show");
    });

    // Profile and logout buttons
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    profileBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.showProfileModal();
    });

    logoutBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      this.logout();
    });

    // 📤 Export to CSV
    const exportCSVBtn = document.getElementById("exportCSV");
    exportCSVBtn?.addEventListener("click", () => {
      const tasks = this.tasks;
      if (!tasks.length)
        return this.showNotification("No tasks to export", "info");

      const csvHeader =
        "Title,Category,Status,Deadline,Created Date,Important\n";
      const csvRows = tasks.map(
        (task) =>
          `"${task.title}","${task.category}","${
            task.completed ? "Completed" : "Pending"
          }","${task.deadline || ""}","${task.createdAt || ""}","${
            task.important ? "Yes" : "No"
          }"`
      );
      const csvContent = csvHeader + csvRows.join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "TaskMaster_Export.csv";
      link.click();
    });
    // Profile modal events
    this.bindProfileModalEvents();
  }

  bindProfileModalEvents() {
    const profileModal = document.getElementById("profileModal");
    const closeProfileModal = document.getElementById("closeProfileModal");
    const cancelProfile = document.getElementById("cancelProfile");
    const profileForm = document.getElementById("profileForm");

    closeProfileModal?.addEventListener("click", () => this.hideProfileModal());
    cancelProfile?.addEventListener("click", () => this.hideProfileModal());

    profileForm?.addEventListener("submit", (e) => this.handleProfileUpdate(e));

    // Close modal when clicking outside
    profileModal?.addEventListener("click", (e) => {
      if (e.target === profileModal) {
        this.hideProfileModal();
      }
    });
  }

  handleAddTask(e) {
    e.preventDefault();

    const taskInput = document.getElementById("taskInput");
    const taskCategory = document.getElementById("taskCategory");

    const title = taskInput.value.trim();
    const category = taskCategory.value;

    if (!title) return;

    const newTask = {
      id: Date.now().toString(),
      title,
      category,
      important: this.isImportant,
      completed: false,
      createdAt: new Date().toISOString(),
      // 👇 Add these two lines
      deadline: document.getElementById("taskDeadline")?.value || null,
      notified: false,
    };

    this.tasks.unshift(newTask);
    this.saveUserData();
    this.renderTasks();
    this.updateStats();

    // Reset form
    taskInput.value = "";
    this.isImportant = false;
    this.updateImportantButton();

    this.showNotification("Task added successfully!", "success");
  }

  toggleImportant() {
    this.isImportant = !this.isImportant;
    this.updateImportantButton();
  }

  updateImportantButton() {
    const importantBtn = document.getElementById("importantBtn");
    const star = importantBtn?.querySelector(".star");

    if (this.isImportant) {
      importantBtn?.classList.add("active");
      if (star) star.textContent = "★";
    } else {
      importantBtn?.classList.remove("active");
      if (star) star.textContent = "☆";
    }
  }

  handleFilterChange(e) {
    e.preventDefault();

    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });
    e.target.classList.add("active");

    // Update filter and render
    this.currentFilter = e.target.dataset.filter;
    this.renderTasks();
    this.updateSectionTitle();
  }

  updateSectionTitle() {
    const sectionTitle = document.getElementById("sectionTitle");
    const titles = {
      all: "All Tasks",
      pending: "Pending Tasks",
      completed: "Completed Tasks",
      important: "Important Tasks",
    };

    if (sectionTitle) {
      sectionTitle.textContent = titles[this.currentFilter] || "All Tasks";
    }
  }

  getFilteredTasks() {
    switch (this.currentFilter) {
      case "pending":
        return this.tasks.filter((task) => !task.completed);
      case "completed":
        return this.tasks.filter((task) => task.completed);
      case "important":
        return this.tasks.filter((task) => task.important);
      default:
        return this.tasks;
    }
  }

  renderTasks() {
    const taskList = document.getElementById("taskList");
    const emptyState = document.getElementById("emptyState");
    const filteredTasks = this.getFilteredTasks();

    if (!taskList) return;

    if (filteredTasks.length === 0) {
      taskList.innerHTML = "";
      emptyState?.classList.remove("hidden");
    } else {
      emptyState?.classList.add("hidden");
      taskList.innerHTML = filteredTasks
        .map((task) => this.createTaskHTML(task))
        .join("");

      // Bind task events
      this.bindTaskEvents();
    }
  }
  createTaskHTML(task) {
    const categoryColors = {
      work: "#3b82f6",
      personal: "#10b981",
      shopping: "#f59e0b",
    };

    return `
    <div class="task-item ${task.completed ? "completed" : ""}" data-task-id="${
      task.id
    }">
        <input type="checkbox" class="task-checkbox" ${
          task.completed ? "checked" : ""
        }>
        <div class="task-content">
            <div class="task-title">${this.escapeHtml(task.title)}</div>
            <div class="task-meta">
                <span class="task-category">
                    <span class="category-color" style="background: ${
                      categoryColors[task.category] || "#6b7280"
                    }"></span>
                    ${
                      task.category.charAt(0).toUpperCase() +
                      task.category.slice(1)
                    }
                </span>
                ${
                  task.important
                    ? '<span class="task-important">★ Important</span>'
                    : ""
                }
                <span class="task-date">${this.formatDate(
                  task.createdAt
                )}</span>
            </div>

            ${
              task.deadline
                ? `
                <div class="task-countdown" id="countdown-${task.id}" data-deadline="${task.deadline}">
                  ⏳ Countdown: <span class="countdown-timer">calculating...</span>
                </div>
              `
                : ""
            }
        </div>
        <div class="task-actions">
            <button class="task-action-btn edit" title="Edit task">✏️</button>
            <button class="task-action-btn delete" title="Delete task">🗑️</button>
        </div>
    </div>
  `;
  }

  startCountdownUpdater() {
    setInterval(() => {
      const countdownElements = document.querySelectorAll(".task-countdown");
      const now = new Date();

      countdownElements.forEach((el) => {
        const deadline = new Date(el.dataset.deadline);
        const timeDiff = deadline - now;

        const timerEl = el.querySelector(".countdown-timer");

        if (timeDiff <= 0) {
          timerEl.textContent = "Expired";
          el.classList.add("expired");
          return;
        }

        const hours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);
        const seconds = Math.floor((timeDiff / 1000) % 60);

        timerEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
      });
    }, 1000);
  }

  bindTaskEvents() {
    // Checkbox events
    const checkboxes = document.querySelectorAll(".task-checkbox");
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const taskId = e.target.closest(".task-item").dataset.taskId;
        this.toggleTaskComplete(taskId);
      });
    });

    // Edit buttons
    const editButtons = document.querySelectorAll(".task-action-btn.edit");
    editButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const taskId = e.target.closest(".task-item").dataset.taskId;
        this.editTask(taskId);
      });
    });

    // Delete buttons
    const deleteButtons = document.querySelectorAll(".task-action-btn.delete");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const taskId = e.target.closest(".task-item").dataset.taskId;
        this.deleteTask(taskId);
      });
    });
  }

  toggleTaskComplete(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      this.saveUserData();
      this.renderTasks();
      this.updateStats();

      const message = task.completed
        ? "Task completed!"
        : "Task marked as pending";
      this.showNotification(message, "success");
    }
  }

  editTask(taskId) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      const newTitle = prompt("Edit task:", task.title);
      if (!newTitle) return;
      // Show prompt for deadline update
      const newDeadline = prompt(
        "Edit deadline (YYYY-MM-DDTHH:MM) or leave blank to remove:",
        task.deadline || ""
      );

      task.title = newTitle.trim();

      if (newDeadline) {
        task.deadline = newDeadline;
        task.notified = false; // reset notified if deadline changed
      } else {
        task.deadline = null;
        task.notified = false;
      }

      this.saveUserData();
      this.renderTasks();
      this.updateStats();
      this.showNotification("Task updated!", "success");
    }
  }

  deleteTask(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      this.tasks = this.tasks.filter((t) => t.id !== taskId);
      this.saveUserData();
      this.renderTasks();
      this.updateStats();
      this.showNotification("Task deleted!", "success");
    }
  }

  clearCompletedTasks() {
    const completedCount = this.tasks.filter((t) => t.completed).length;

    if (completedCount === 0) {
      this.showNotification("No completed tasks to clear", "info");
      return;
    }

    if (
      confirm(
        `Are you sure you want to delete ${completedCount} completed task(s)?`
      )
    ) {
      this.tasks = this.tasks.filter((t) => !t.completed);
      this.saveUserData();
      this.renderTasks();
      this.updateStats();
      this.showNotification(
        `${completedCount} completed task(s) deleted!`,
        "success"
      );
    }
  }

  updateStats() {
    const totalTasks = document.getElementById("totalTasks");
    const completedTasks = document.getElementById("completedTasks");
    const pendingTasks = document.getElementById("pendingTasks");

    const total = this.tasks.length;
    const completed = this.tasks.filter((t) => t.completed).length;
    const pending = total - completed;

    if (totalTasks) totalTasks.textContent = total;
    if (completedTasks) completedTasks.textContent = completed;
    if (pendingTasks) pendingTasks.textContent = pending;
    this.renderTaskChart(completed, pending);
  }
  renderTaskChart(completed, pending) {
    const ctx = document.getElementById("taskChart");

    // Destroy existing chart if it exists
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels: ["Completed", "Pending"],
        datasets: [
          {
            label: "Task Progress",
            data: [completed, pending],
            backgroundColor: ["#10b981", "#f59e0b"], // Green and yellow
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
    });
  }

  updateUserInterface() {
    const userInitials = document.getElementById("userInitials");
    if (userInitials && this.currentUser) {
      const initials = this.currentUser.name
        .split(" ")
        .map((name) => name.charAt(0))
        .join("")
        .toUpperCase()
        .substring(0, 2);
      userInitials.textContent = initials;
    }
  }

  showProfileModal() {
    const modal = document.getElementById("profileModal");
    if (modal && this.currentUser) {
      document.getElementById("profileName").value =
        this.currentUser.name || "";
      document.getElementById("profileEmail").value =
        this.currentUser.email || "";
      document.getElementById("profilePhone").value =
        this.currentUser.phone || "";
      document.getElementById("profileDob").value = this.currentUser.dob || "";
      modal.classList.add("show");
    }
  }

  hideProfileModal() {
    const modal = document.getElementById("profileModal");
    modal?.classList.remove("show");

    // Clear password fields
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmNewPassword").value = "";
  }

  handleProfileUpdate(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const name = formData.get("name").trim();
    const email = formData.get("email").trim();
    const phone = formData.get("phone").trim();
    const dob = formData.get("dob");
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmNewPassword = formData.get("confirmNewPassword");

    // Validate basic info
    if (!name || !email) {
      this.showNotification("Name and email are required", "error");
      return;
    }

    // Get current user data from storage
    const users = JSON.parse(localStorage.getItem("taskmaster_users") || "[]");
    const userIndex = users.findIndex((u) => u.id === this.currentUser.id);

    if (userIndex === -1) {
      this.showNotification("User not found", "error");
      return;
    }

    const user = users[userIndex];

    // If changing password, validate
    if (newPassword) {
      if (!currentPassword) {
        this.showNotification(
          "Current password is required to change password",
          "error"
        );
        return;
      }

      if (user.password !== currentPassword) {
        this.showNotification("Current password is incorrect", "error");
        return;
      }

      if (newPassword.length < 6) {
        this.showNotification(
          "New password must be at least 6 characters",
          "error"
        );
        return;
      }

      if (newPassword !== confirmNewPassword) {
        this.showNotification("New passwords do not match", "error");
        return;
      }

      user.password = newPassword;
    }

    // Update user info
    user.name = name;
    user.email = email;
    user.phone = phone;
    user.dob = dob;

    // Save to storage
    users[userIndex] = user;
    localStorage.setItem("taskmaster_users", JSON.stringify(users));

    // Update current user session
    this.currentUser.name = name;
    this.currentUser.email = email;
    localStorage.setItem(
      "taskmaster_current_user",
      JSON.stringify(this.currentUser)
    );

    this.updateUserInterface();
    this.hideProfileModal();
    this.showNotification("Profile updated successfully!", "success");
  }

  logout() {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("taskmaster_current_user");
      sessionStorage.removeItem("taskmaster_authenticated");
      window.location.href = "index.html";
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    const colors = {
      success: "#10b981",
      error: "#ef4444",
      info: "#3b82f6",
    };

    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-weight: 500;
            max-width: 300px;
        `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Today";
    } else if (diffDays === 2) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  new TaskMasterApp();
});
