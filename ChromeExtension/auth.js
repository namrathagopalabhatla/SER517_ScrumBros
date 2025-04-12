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

  nameFields.style.display = mode === 'signup' ? 'block' : 'none';
  resetToken.style.display = mode === 'reset' ? 'block' : 'none';
  submitBtn.textContent = {
    signup: 'Register',
    login: 'Login',
    forgot: 'Send Reset Link',
    reset: 'Reset Password'
  }[mode];
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const values = Object.fromEntries(formData.entries());

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
        localStorage.setItem('authToken', data.token);
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
  document.getElementById("link-signup").addEventListener("click", () => switchMode("signup"));
  document.getElementById("link-login").addEventListener("click", () => switchMode("login"));
  document.getElementById("link-forgot").addEventListener("click", () => switchMode("forgot"));
  document.getElementById("link-reset").addEventListener("click", () => switchMode("reset"));
});
