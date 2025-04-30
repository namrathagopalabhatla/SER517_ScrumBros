let mode = 'signup'; // signup | login | forgot | reset

const form = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const nameFields = document.getElementById('name-fields');
const resetToken = document.getElementById('reset-token');
const submitBtn = document.getElementById('submit-btn');
const messageDiv = document.getElementById('auth-message');
const oldPass = document.getElementById('old-password');

function switchMode(newMode) {
  mode = newMode;
  messageDiv.textContent = '';
  messageDiv.style.backgroundColor = '';

  authTitle.textContent = {
    signup: 'Sign Up',
    login: 'Login',
    forgot: 'Forgot Password',
    reset: 'Reset Password'
  }[mode];

  // Update display of fields
  nameFields.style.display = mode === 'signup' ? 'flex' : 'none';
  resetToken.style.display = mode === 'reset' ? 'block' : 'none';
  oldPass.style.display = (mode === 'forgot') || (mode === 'reset') ? 'none' : 'block';
  
  // Update submit button text
  submitBtn.textContent = {
    signup: 'Register',
    login: 'Login',
    forgot: 'Send Reset Link',
    reset: 'Reset Password'
  }[mode];
  
  // Update required fields
  const firstNameInput = form.querySelector('input[name="firstName"]');
  const lastNameInput = form.querySelector('input[name="lastName"]');
  const tokenInput = form.querySelector('input[name="token"]');
  const newPasswordInput = form.querySelector('input[name="newPassword"]');
  
  if (firstNameInput && lastNameInput) {
    firstNameInput.required = mode === 'signup';
    lastNameInput.required = mode === 'signup';
  }
  
  if (tokenInput && newPasswordInput) {
    tokenInput.required = mode === 'reset';
    newPasswordInput.required = mode === 'reset';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Clear previous error message
  messageDiv.textContent = '';
  
  // Get input fields
  const emailInput = form.querySelector('input[name="email"]');
  const passwordInput = form.querySelector('input[name="password"]');
  const firstNameInput = form.querySelector('input[name="firstName"]');
  const lastNameInput = form.querySelector('input[name="lastName"]');
  const tokenInput = form.querySelector('input[name="token"]');
  const newPasswordInput = form.querySelector('input[name="newPassword"]');
  
  // Client-side validation based on current mode
  let isValid = true;
  const values = {};
  
  // Always validate email
  if (!emailInput.value.trim()) {
    isValid = false;
    messageDiv.textContent = 'Email is required';
    messageDiv.style.color = 'red';
    messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    return;
  }
  values.email = emailInput.value.trim();
  
  // Validate password for signup and login
  if ((mode === 'signup' || mode === 'login') && !passwordInput.value) {
    isValid = false;
    messageDiv.textContent = 'Password is required';
    messageDiv.style.color = 'red';
    messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    return;
  }
  
  if (mode === 'signup' || mode === 'login') {
    values.password = passwordInput.value;
  }
  
  // Validate name fields for signup
  if (mode === 'signup') {
    if (!firstNameInput.value.trim()) {
      isValid = false;
      messageDiv.textContent = 'First name is required';
      messageDiv.style.color = 'red';
      messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      return;
    }
    if (!lastNameInput.value.trim()) {
      isValid = false;
      messageDiv.textContent = 'Last name is required';
      messageDiv.style.color = 'red';
      messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      return;
    }
    values.firstName = firstNameInput.value.trim();
    values.lastName = lastNameInput.value.trim();
  }
  
  // Validate reset fields
  if (mode === 'reset') {
    if (!tokenInput.value.trim()) {
      isValid = false;
      messageDiv.textContent = 'Reset token is required';
      messageDiv.style.color = 'red';
      messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      return;
    }
    if (!newPasswordInput.value) {
      isValid = false;
      messageDiv.textContent = 'New password is required';
      messageDiv.style.color = 'red';
      messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      return;
    }
    values.token = tokenInput.value.trim();
    values.newPassword = newPasswordInput.value;
  }
  
  // If validation fails, don't proceed
  if (!isValid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';

  let url = '';
  let payload = {};

  switch (mode) {
    case 'signup':
      url = 'https://ser517-scrumbros.onrender.com/register';
      payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password
      };
      break;
    case 'login':
      url = 'https://ser517-scrumbros.onrender.com/login';
      payload = {
        email: values.email,
        password: values.password
      };
      break;
    case 'forgot':
      url = 'https://ser517-scrumbros.onrender.com/forgot-password';
      payload = { email: values.email };
      break;
    case 'reset':
      url = 'https://ser517-scrumbros.onrender.com/reset-password';
      payload = {
        token: values.token,
        newPassword: values.newPassword
      };
      break;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = {
      signup: 'Register',
      login: 'Login',
      forgot: 'Send Reset Link',
      reset: 'Reset Password'
    }[mode];

    if (res.ok) {
      messageDiv.style.color = 'green';
      messageDiv.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
      messageDiv.textContent = data.message || 'Success';
      
      if (mode === 'login') {
        // Store token in Chrome storage only
        chrome.storage.local.set({authToken: data.token}, function() {
          console.log('Token saved to Chrome storage');
        });
        
        // Create a success message with a button to close or return to YouTube
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        
        const successText = document.createElement('p');
        successText.textContent = 'You are now logged in! You can close this window and return to YouTube.';
        
        const returnButton = document.createElement('button');
        returnButton.textContent = 'Return to YouTube';
        returnButton.className = 'return-button';
        returnButton.addEventListener('click', function() {
          chrome.tabs.query({url: "*://*.youtube.com/*"}, function(tabs) {
            if (tabs.length > 0) {
              chrome.tabs.update(tabs[0].id, {active: true});
              window.close();
            } else {
              chrome.tabs.create({url: 'https://www.youtube.com'});
              window.close();
            }
          });
        });
        
        successDiv.appendChild(successText);
        successDiv.appendChild(returnButton);
        
        // Replace the form with the success message
        const container = document.querySelector('.auth-container');
        container.innerHTML = '';
        container.appendChild(successDiv);
      }
      
      if (mode === 'signup') {
        // Create a verification message
        messageDiv.textContent = 'Registration successful! Please check your email to verify your account, then come back to log in.';
      }

      if (mode === 'forgot') {
        emailInput.value = '';
      }
    } else {
      messageDiv.style.color = 'red';
      messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
      messageDiv.textContent = data.error || 'Something went wrong.';
    }
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = {
      signup: 'Register',
      login: 'Login',
      forgot: 'Send Reset Link',
      reset: 'Reset Password'
    }[mode];
    
    messageDiv.style.color = 'red';
    messageDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    messageDiv.textContent = 'Network error - please try again';
    console.error(err);
  }
});

// Default mode on load
switchMode('signup');

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['authToken'], function(result) {
    const token = result.authToken;
    if (token) {
      const container = document.querySelector('.auth-container');
      container.innerHTML = '';
      
      const alreadyLoggedIn = document.createElement('div');
      alreadyLoggedIn.className = 'success-message';
      
      const loggedInText = document.createElement('p');
      loggedInText.textContent = 'You are currently logged in to the YouTube Comment Analyzer.';
      
      const logoutButton = document.createElement('button');
      logoutButton.textContent = 'Log Out';
      logoutButton.className = 'logout-button';
      logoutButton.addEventListener('click', function() {
        chrome.storage.local.remove('authToken', function() {
          location.reload();
        });
      });
      
      const returnButton = document.createElement('button');
      returnButton.textContent = 'Return to YouTube';
      returnButton.className = 'return-button';
      returnButton.addEventListener('click', function() {
        chrome.tabs.query({url: "*://*.youtube.com/*"}, function(tabs) {
          if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, {active: true});
            window.close();
          } else {
            chrome.tabs.create({url: 'https://www.youtube.com'});
            window.close();
          }
        });
      });
      
      alreadyLoggedIn.appendChild(loggedInText);
      alreadyLoggedIn.appendChild(logoutButton);
      alreadyLoggedIn.appendChild(returnButton);
      
      container.appendChild(alreadyLoggedIn);
    } else {
      setupAuthModeToggle();
    }
  });
});

function setupAuthModeToggle() {
  const signupLink = document.getElementById("link-signup");
  const loginLink = document.getElementById("link-login");
  const forgotLink = document.getElementById("link-forgot");
  const resetLink = document.getElementById("link-reset");
  
  updateLinkVisibility(mode);
  
  signupLink.addEventListener("click", () => {
    switchMode("signup");
    updateLinkVisibility("signup");
  });
  
  loginLink.addEventListener("click", () => {
    switchMode("login");
    updateLinkVisibility("login");
  });
  
  forgotLink.addEventListener("click", () => {
    switchMode("forgot");
    updateLinkVisibility("forgot");
  });
  
  resetLink.addEventListener("click", () => {
    switchMode("reset");
    updateLinkVisibility("reset");
  });
}

function updateLinkVisibility(currentMode) {
  const signupLink = document.getElementById("link-signup");
  const loginLink = document.getElementById("link-login");
  const forgotLink = document.getElementById("link-forgot");
  const resetLink = document.getElementById("link-reset");
  
  signupLink.classList.remove('active');
  loginLink.classList.remove('active');
  forgotLink.classList.remove('active');
  resetLink.classList.remove('active');
  
  switch(currentMode) {
    case "signup":
      signupLink.classList.add('active');
      break;
    case "login":
      loginLink.classList.add('active');
      break;
    case "forgot":
      forgotLink.classList.add('active');
      break;
    case "reset":
      resetLink.classList.add('active');
      break;
  }
}
