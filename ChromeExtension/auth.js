let mode = 'signup'; // signup | login | forgot | reset

const form = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const nameFields = document.getElementById('name-fields');
const resetToken = document.getElementById('reset-token');
const submitBtn = document.getElementById('submit-btn');
const messageDiv = document.getElementById('auth-message');

function switchMode(newMode) {
  mode = newMode;
  messageDiv.textContent = '';

  authTitle.textContent = {
    signup: 'Sign Up',
    login: 'Login',
    forgot: 'Forgot Password',
    reset: 'Reset Password'
  }[mode];

  // Update display of fields
  nameFields.style.display = mode === 'signup' ? 'block' : 'none';
  resetToken.style.display = mode === 'reset' ? 'block' : 'none';
  
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
    return;
  }
  values.email = emailInput.value.trim();
  
  // Validate password for signup and login
  if ((mode === 'signup' || mode === 'login') && !passwordInput.value) {
    isValid = false;
    messageDiv.textContent = 'Password is required';
    messageDiv.style.color = 'red';
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
      return;
    }
    if (!lastNameInput.value.trim()) {
      isValid = false;
      messageDiv.textContent = 'Last name is required';
      messageDiv.style.color = 'red';
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
      return;
    }
    if (!newPasswordInput.value) {
      isValid = false;
      messageDiv.textContent = 'New password is required';
      messageDiv.style.color = 'red';
      return;
    }
    values.token = tokenInput.value.trim();
    values.newPassword = newPasswordInput.value;
  }
  
  // If validation fails, don't proceed
  if (!isValid) return;

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

    if (res.ok) {
      messageDiv.style.color = 'green';
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
    } else {
      messageDiv.style.color = 'red';
      messageDiv.textContent = data.error || 'Something went wrong.';
    }
  } catch (err) {
    messageDiv.style.color = 'red';
    messageDiv.textContent = 'Network error';
    console.error(err);
  }
});

// Default mode on load
switchMode('signup');
document.addEventListener('DOMContentLoaded', () => {
  // Check if user already has a token in Chrome storage
  chrome.storage.local.get(['authToken'], function(result) {
    const token = result.authToken;
    if (token) {
    // Already logged in - show a message
    const container = document.querySelector('.auth-container');
    container.innerHTML = '';
    
    const alreadyLoggedIn = document.createElement('div');
    alreadyLoggedIn.className = 'success-message';
    
    const loggedInText = document.createElement('p');
    loggedInText.textContent = 'You are already logged in!';
    
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
    // Set up the toggle links for the auth form
    document.getElementById("link-signup").addEventListener("click", () => switchMode("signup"));
    document.getElementById("link-login").addEventListener("click", () => switchMode("login"));
    document.getElementById("link-forgot").addEventListener("click", () => switchMode("forgot"));
    document.getElementById("link-reset").addEventListener("click", () => switchMode("reset"));
  }
  });
});