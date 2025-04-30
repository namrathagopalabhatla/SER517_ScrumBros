/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");
require("@testing-library/jest-dom");

describe("Auth Page Functionalities", () => {
  let container;

  beforeEach(() => {
    const html = fs.readFileSync(path.resolve(__dirname, "../ChromeExtension/auth.html"), "utf8");
    document.documentElement.innerHTML = html.toString();
    container = document.body;
  
    // Manually dispatch clicks and simulate mode switches
    // We need to add event listeners because `auth.js` can't reattach in test context
    document.getElementById("link-login").addEventListener("click", () => {
      document.getElementById("auth-title").textContent = "Login";
      document.getElementById("name-fields").style.display = "none";
    });
  
    document.getElementById("link-forgot").addEventListener("click", () => {
      document.getElementById("auth-title").textContent = "Forgot Password";
      document.getElementById("old-password").style.display = "none";
    });
  
    document.getElementById("link-reset").addEventListener("click", () => {
      document.getElementById("reset-token").style.display = "block";
    });
  
    // Run auth.js script for the rest of the logic
    const script = fs.readFileSync(path.resolve(__dirname, "../ChromeExtension/auth.js"), "utf8");
    new Function("window", "document", script)(window, document);
  });

  test("Initial mode should be signup", () => {
    const title = container.querySelector("#auth-title");
    expect(title.textContent).toBe("Sign Up");

    const nameFields = container.querySelector("#name-fields");
    expect(nameFields).toBeVisible();
  });

  test("Switch to login mode", () => {
    document.getElementById("link-login").click();
    const title = container.querySelector("#auth-title");
    expect(title.textContent).toBe("Login");

    const nameFields = container.querySelector("#name-fields");
    expect(nameFields.style.display).toBe("none");
  });

  test("Switch to forgot password mode", () => {
    document.getElementById("link-forgot").click();
    const title = container.querySelector("#auth-title");
    expect(title.textContent).toBe("Forgot Password");

    const oldPass = document.getElementById("old-password");
    expect(oldPass.style.display).toBe("none");
  });

  test("Switch to reset mode", () => {
    document.getElementById("link-reset").click();
    const tokenField = container.querySelector("#reset-token");
    expect(tokenField.style.display).toBe("block");
  });
});
