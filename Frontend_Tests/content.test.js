/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");

describe("YouTube Comment Analyzer Extension", () => {
beforeEach(() => {
    // Simulate YouTube video URL with videoId
    delete window.location;
    window.location = new URL("https://www.youtube.com/watch?v=mockVideoId");
    
    // Inject comments section to allow UI insertion
    document.body.innerHTML = '<div id="comments"></div>';
    
    // Mock sessionStorage
    Object.defineProperty(window, "sessionStorage", {
        value: {
        getItem: jest.fn(() => "mockVideoId"),
        setItem: jest.fn()
        },
        writable: true
    });
    
    // Mock Chrome API with no auth token to trigger login prompt
    global.chrome = {
        storage: {
        local: {
            get: jest.fn((keys, cb) => cb({})), // simulate unauthenticated
            set: jest.fn((data, cb) => cb && cb()),
            remove: jest.fn((key, cb) => cb && cb())
        }
        },
        runtime: {
        getURL: jest.fn((path) => path),
        sendMessage: jest.fn()
        }
    };
});
      

  test("Loads video ID from sessionStorage", async () => {
    const contentPath = path.resolve(__dirname, "../ChromeExtension/content.js");
    const file = fs.readFileSync(contentPath, "utf8");
    const getSavedVideoId = new Function(`${file}; return getSavedVideoId;`)();
    expect(getSavedVideoId()).toBe("mockVideoId");
  });

  test("Auth token is loaded into global scope", () => {
    jest.resetModules();
    const script = fs.readFileSync(path.resolve(__dirname, "../ChromeExtension/content.js"), "utf8");
    new Function("chrome", "window", script)(global.chrome, window);
    expect(global.chrome.storage.local.get).toHaveBeenCalled();
  });

  test("Adds login prompt if not authenticated", async () => {
    // Ensure comments section exists before script runs
    document.body.innerHTML = '<div id="comments"></div>';
  
    global.chrome.storage.local.get = jest.fn((keys, cb) => cb({})); // simulate unauthenticated
  
    const script = fs.readFileSync(path.resolve(__dirname, "../ChromeExtension/content.js"), "utf8");
    new Function("chrome", "window", "document")(global.chrome, window, document);
  
    // Wait for mutation observer or setTimeout behavior to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  
    const result = document.querySelector(".yt-comment-analyzer-container");
    expect(result).not.toBeNull();
  });  
});
