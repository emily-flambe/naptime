/**
 * Oura API Service
 * Handles all interactions with the Oura Ring API v2
 */

const axios = require('axios');

const OURA_API_BASE = 'https://api.ouraring.com/v2';

class OuraService {
  /**
   * Get yesterday's sleep data from Oura API
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<Object>} Sleep data response
   */
  async getYesterdaySleep(accessToken) {
    // IMPORTANT: Oura assigns sleep to the day it ENDS
    // So "last night's sleep" will be under TODAY's date if you woke up today
    // We need to fetch today's date to get last night's sleep
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Fetch yesterday through tomorrow to ensure we get all sleep sessions
    // This captures split sleep sessions and handles timezone/sync delays
    const startDateString = yesterday.toISOString().split('T')[0];
    const endDateString = tomorrow.toISOString().split('T')[0];

    try {
      // Use the sleep endpoint to get detailed sleep sessions
      // This returns individual sleep periods (can be multiple per day)
      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/sleep`,
        {
          params: {
            start_date: startDateString,
            end_date: endDateString
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Return the full response which may contain multiple sleep sessions
      // The caller should look for the 'long_sleep' type for main sleep
      return response.data;
    } catch (error) {
      // Add more context to error for better debugging
      if (error.response) {
        // The request was made and the server responded with a status code
        const apiError = new Error(`Oura API Error: ${error.response.status} ${error.response.statusText}`);
        apiError.status = error.response.status;
        apiError.data = error.response.data;
        throw apiError;
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('Network error: No response from Oura API');
      } else {
        // Something happened in setting up the request
        throw error;
      }
    }
  }

  /**
   * Get user personal information from Oura API
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<Object>} User info response
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/personal_info`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        const apiError = new Error(`Oura API Error: ${error.response.status} ${error.response.statusText}`);
        apiError.status = error.response.status;
        apiError.data = error.response.data;
        throw apiError;
      } else if (error.request) {
        throw new Error('Network error: No response from Oura API');
      } else {
        throw error;
      }
    }
  }

  /**
   * Get readiness data for a specific date
   * @param {string} accessToken - OAuth access token  
   * @param {string} date - Date string in YYYY-MM-DD format
   * @returns {Promise<Object>} Readiness data response
   */
  async getReadiness(accessToken, date) {
    try {
      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/daily_readiness`,
        {
          params: {
            start_date: date,
            end_date: date
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        const apiError = new Error(`Oura API Error: ${error.response.status} ${error.response.statusText}`);
        apiError.status = error.response.status;
        apiError.data = error.response.data;
        throw apiError;
      } else if (error.request) {
        throw new Error('Network error: No response from Oura API');
      } else {
        throw error;
      }
    }
  }

  /**
   * Get sleep data for a date range
   * @param {string} accessToken - OAuth access token
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>} Sleep data response
   */
  async getSleepRange(accessToken, startDate, endDate) {
    try {
      const response = await axios.get(
        `${OURA_API_BASE}/usercollection/sleep`,
        {
          params: {
            start_date: startDate,
            end_date: endDate
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      if (error.response) {
        const apiError = new Error(`Oura API Error: ${error.response.status} ${error.response.statusText}`);
        apiError.status = error.response.status;
        apiError.data = error.response.data;
        throw apiError;
      } else if (error.request) {
        throw new Error('Network error: No response from Oura API');
      } else {
        throw error;
      }
    }
  }

  /**
   * Validate an access token by making a simple API call
   * @param {string} accessToken - OAuth access token to validate
   * @returns {Promise<boolean>} True if token is valid, false otherwise
   */
  async validateToken(accessToken) {
    try {
      await this.getUserInfo(accessToken);
      return true;
    } catch (error) {
      if (error.status === 401) {
        return false; // Unauthorized - token is invalid
      }
      // For other errors (network, server), we can't determine token validity
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new OuraService();