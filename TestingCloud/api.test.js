const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'https://ser517-scrumbros.onrender.com';
let jwtToken = null;
const testEmail = `ngopalabhatla@gmail.com`;
const password = "Test@1234";

let resetToken = null;

describe("Authentication & Analysis API Integration Tests", () => {

  test("Register a new user", async () => {
    const response = await axios.post(`${BASE_URL}/register`, {
      firstName: "Test",
      lastName: "User",
      email: testEmail,
      password: password
    });
    expect(response.status).toBe(200);
    expect(response.data.message).toMatch(/Registration successful/i);
  });

  test("Login with registered user", async () => {
    const response = await axios.post(`${BASE_URL}/login`, {
      email: testEmail,
      password: password
    });
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    jwtToken = response.data.token;
  });

  test("Reject login with wrong password", async () => {
    try {
      await axios.post(`${BASE_URL}/login`, {
        email: testEmail,
        password: "WrongPassword123"
      });
    } catch (err) {
      expect(err.response.status).toBe(400);
    }
  });

  test("Request password reset with valid email", async () => {
    const response = await axios.post(`${BASE_URL}/forgot-password`, {
      email: testEmail
    });
    expect(response.status).toBe(200);
    expect(response.data.message).toMatch(/reset token sent/i);
  });

  test("Request password reset with invalid email", async () => {
    try {
      await axios.post(`${BASE_URL}/forgot-password`, {
        email: "unknown@email.com"
      });
    } catch (err) {
      expect(err.response.status).toBe(404);
      expect(err.response.data.error).toMatch(/User not found/i);
    }
  });

  test("Reset password with missing token", async () => {
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        token: "",
        newPassword: "NewTest@123"
      });
    } catch (err) {
      expect(err.response.status).toBe(400);
      expect(err.response.data.error).toMatch(/Token and new password are required/i);
    }
  });

  test("Reject /analyze without token", async () => {
    try {
      await axios.post(`${BASE_URL}/analyze`, { videoId: "dQw4w9WgXcQ" });
    } catch (err) {
      expect(err.response.status).toBe(403);
    }
  });

  test("Analyze a valid YouTube video with token", async () => {
    const response = await axios.post(
      `${BASE_URL}/analyze`,
      { videoId: "dQw4w9WgXcQ", autoRetry: true },
      { headers: { Authorization: `Bearer ${jwtToken}` } }
    );
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty("summary");
    expect(response.data).toHaveProperty("most_helpful_comments");
    expect(response.data).toHaveProperty("comments_data");
  });

  test("Reject /analyze with missing videoId", async () => {
    try {
      await axios.post(
        `${BASE_URL}/analyze`,
        {},
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );
    } catch (err) {
      expect(err.response.status).toBe(400);
    }
  });
});
