const axios = require('axios');
require('dotenv').config();

// Base URL of the deployed backend API
const BASE_URL = 'https://ser517-scrumbros.onrender.com';

// Test credentials
const testEmail = `ngopalabhatla@gmail.com`;
const password = "Test@1234";

// Token placeholders
let jwtToken = null;
let resetToken = null;

/**
 * Integration test suite for Authentication and Analysis APIs
 * This suite includes:
 * - User registration and login
 * - Password reset workflow
 * - Authorization checks
 * - Sentiment analysis functionality
 */
describe("Authentication & Analysis API Integration Tests", () => {

  // Test: Register a new user
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

  // Test: Login with the registered user
  test("Login with registered user", async () => {
    const response = await axios.post(`${BASE_URL}/login`, {
      email: testEmail,
      password: password
    });
    expect(response.status).toBe(200);
    expect(response.data.token).toBeDefined();
    jwtToken = response.data.token;
  });

  // Test: Reject login attempt with wrong password
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

  // Test: Request password reset using a valid email
  test("Request password reset with valid email", async () => {
    const response = await axios.post(`${BASE_URL}/forgot-password`, {
      email: testEmail
    });
    expect(response.status).toBe(200);
    expect(response.data.message).toMatch(/reset token sent/i);
  });

  // Test: Request password reset using an invalid email
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

  // Test: Attempt to reset password with missing token
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

  // Test: Reject sentiment analysis request without token
  test("Reject /analyze without token", async () => {
    try {
      await axios.post(`${BASE_URL}/analyze`, { videoId: "dQw4w9WgXcQ" });
    } catch (err) {
      expect(err.response.status).toBe(403);
    }
  });

  // Test: Successfully analyze a valid YouTube video with token
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

  // Test: Reject analyze request with missing videoId field
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
