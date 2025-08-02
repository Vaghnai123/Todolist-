// Authentication System
class AuthSystem {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.checkAuthStatus();
  }

  bindEvents() {
    // Form switching
    const showSignupBtn = document.getElementById("showSignup");
    const showLoginBtn = document.getElementById("showLogin");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    showSignupBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.classList.add("hidden");
      signupForm.classList.remove("hidden");
      this.clearErrors();
    });

    showLoginBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      signupForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
      this.clearErrors();
    });

    // Form submissions
    loginForm?.addEventListener("submit", (e) => this.handleLogin(e));
    signupForm?.addEventListener("submit", (e) => this.handleSignup(e));
  }

  async handleLogin(e) {
    e.preventDefault();
    this.clearErrors();

    const formData = new FormData(e.target);
    const email = formData.get("email").trim();
    const password = formData.get("password");

    // Validate inputs
    if (!this.validateLogin(email, password)) {
      return;
    }

    // Check if user exists
    const users = this.getUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      this.showError(
        "loginEmailError",
        "No account found with this email address"
      );
      return;
    }

    if (user.password !== password) {
      this.showError("loginPasswordError", "Incorrect password");
      return;
    }

    // Login successful
    this.setCurrentUser(user);
    this.showSuccess("Login successful! Redirecting...");

    setTimeout(() => {
      window.location.href = "app.html";
    }, 1000);
  }

  async handleSignup(e) {
    e.preventDefault();
    this.clearErrors();

    const formData = new FormData(e.target);
    const name = formData.get("name").trim();
    const email = formData.get("email").trim();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    // Validate inputs
    if (!this.validateSignup(name, email, password, confirmPassword)) {
      return;
    }

    // Check if user already exists
    const users = this.getUsers();
    if (users.find((u) => u.email === email)) {
      this.showError(
        "signupEmailError",
        "An account with this email already exists"
      );
      return;
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      createdAt: new Date().toISOString(),
      tasks: [],
    };

    users.push(newUser);
    localStorage.setItem("taskmaster_users", JSON.stringify(users));

    // Auto login
    this.setCurrentUser(newUser);
    this.showSuccess("Account created successfully! Redirecting...");

    setTimeout(() => {
      window.location.href = "app.html";
    }, 1000);
  }

  validateLogin(email, password) {
    let isValid = true;

    if (!email) {
      this.showError("loginEmailError", "Email is required");
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.showError("loginEmailError", "Please enter a valid email address");
      isValid = false;
    }

    if (!password) {
      this.showError("loginPasswordError", "Password is required");
      isValid = false;
    }

    return isValid;
  }

  validateSignup(name, email, password, confirmPassword) {
    let isValid = true;

    if (!name || name.length < 2) {
      this.showError(
        "signupNameError",
        "Name must be at least 2 characters long"
      );
      isValid = false;
    }

    if (!email) {
      this.showError("signupEmailError", "Email is required");
      isValid = false;
    } else if (!this.isValidEmail(email)) {
      this.showError("signupEmailError", "Please enter a valid email address");
      isValid = false;
    }
    if (!password) {
      this.showError("signupPasswordError", "Password is required");
      isValid = false;
    } else if (password.length < 6) {
      this.showError(
        "signupPasswordError",
        "Password must be at least 6 characters long"
      );
      isValid = false;
    }

    if (!confirmPassword) {
      this.showError("confirmPasswordError", "Please confirm your password");
      isValid = false;
    } else if (password !== confirmPassword) {
      this.showError("confirmPasswordError", "Passwords do not match");
      isValid = false;
    }

    return isValid;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.color = "#ef4444";
    }
  }

  showSuccess(message) {
    // Create a temporary success message
    const successDiv = document.createElement("div");
    successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            font-weight: 500;
        `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  clearErrors() {
    const errorElements = document.querySelectorAll(".error-message");
    errorElements.forEach((element) => {
      element.textContent = "";
    });
  }

  getUsers() {
    const users = localStorage.getItem("taskmaster_users");
    return users ? JSON.parse(users) : [];
  }

  setCurrentUser(user) {
    // Store current user (without password for security)
    const userSession = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      dob: user.dob || "",
      createdAt: user.createdAt,
    };
    localStorage.setItem(
      "taskmaster_current_user",
      JSON.stringify(userSession)
    );
    sessionStorage.setItem("taskmaster_authenticated", "true");
  }

  getCurrentUser() {
    const user = localStorage.getItem("taskmaster_current_user");
    const isAuthenticated = sessionStorage.getItem("taskmaster_authenticated");

    if (user && isAuthenticated) {
      return JSON.parse(user);
    }
    return null;
  }

  checkAuthStatus() {
    // If we're on the login page and user is already authenticated, redirect to app
    if (
      window.location.pathname.includes("index.html") ||
      window.location.pathname === "/"
    ) {
      const currentUser = this.getCurrentUser();
      if (currentUser) {
        window.location.href = "app.html";
      }
    }
  }

  logout() {
    localStorage.removeItem("taskmaster_current_user");
    sessionStorage.removeItem("taskmaster_authenticated");
    window.location.href = "index.html";
  }
}

// Initialize authentication system
document.addEventListener("DOMContentLoaded", () => {
  new AuthSystem();
});

// Add some demo users for testing (remove in production)
document.addEventListener("DOMContentLoaded", () => {
  const users = JSON.parse(localStorage.getItem("taskmaster_users") || "[]");
  if (users.length === 0) {
    const demoUsers = [
      {
        id: "demo1",
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
        createdAt: new Date().toISOString(),
        tasks: [
          {
            id: "task1",
            title: "Complete project proposal",
            category: "work",
            important: true,
            completed: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: "task2",
            title: "Buy groceries",
            category: "personal",
            important: false,
            completed: true,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ];
    localStorage.setItem("taskmaster_users", JSON.stringify(demoUsers));
  }
});
