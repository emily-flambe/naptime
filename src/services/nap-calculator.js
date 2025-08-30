/**
 * Nap Calculator Service
 * Core logic for determining if Emily needs a nap based on sleep data and time
 */

class NapCalculator {
  /**
   * Calculate whether Emily needs a nap based on sleep data and current Mountain Time
   * @param {Object} sleepData - Sleep data from Oura API
   * @returns {Object} Nap status with details
   */
  static calculateNapStatus(sleepData) {
    // Extract sleep information (get the most recent sleep session)
    const sleepRecord = sleepData?.data?.[0];
    const sleepSeconds = sleepRecord?.total_sleep_duration || 0;
    const sleepHours = sleepSeconds / 3600;
    
    // Get readiness score (proxy for sleep quality in sleep sessions)
    const sleepScore = sleepRecord?.readiness?.score || null;

    // Get current time in Mountain Time (America/Denver)
    const now = new Date();
    const mountainTimeString = now.toLocaleString("en-US", {
      timeZone: "America/Denver"
    });
    
    // Create a proper Date object for Mountain Time
    const mountainTime = new Date(mountainTimeString);
    const hour = mountainTime.getHours();
    
    // Nap time is 2:00 PM to 4:59 PM Mountain Time (14:00 to 16:59)
    const isNapTime = hour >= 14 && hour < 17;
    
    // Emily needs a nap if she got less than 6 hours AND it's nap time
    const needsNap = sleepHours < 6 && isNapTime;

    // Generate appropriate message
    let message;
    if (needsNap) {
      message = 'YES, EMILY NEEDS A NAP';
    } else if (!isNapTime && sleepHours < 6) {
      message = 'Not Nap Time Yet';
    } else {
      message = "Nah, She's Fine";
    }

    // Format current time for display
    const currentTime = now.toLocaleString("en-US", {
      timeZone: "America/Denver",
      timeStyle: "short"
    });

    return {
      needsNap,
      sleepHours: sleepHours.toFixed(1),
      sleepScore: sleepScore,
      quality: this.getSleepQuality(sleepScore),
      isNapTime,
      currentTime,
      lastUpdated: new Date().toISOString(),
      message,
      shouldNap: needsNap,
      recommendation: this.getRecommendation(sleepHours, isNapTime),
      details: {
        totalSleepDurationSeconds: sleepSeconds,
        efficiency: sleepRecord?.efficiency,
        deepSleepMinutes: Math.round((sleepRecord?.deep_sleep_duration || 0) / 60),
        remSleepMinutes: Math.round((sleepRecord?.rem_sleep_duration || 0) / 60),
        lightSleepMinutes: Math.round((sleepRecord?.light_sleep_duration || 0) / 60)
      }
    };
  }

  /**
   * Check if current time is within nap time window (2-5 PM MT)
   * @returns {boolean} True if it's currently nap time
   */
  static isCurrentlyNapTime() {
    const now = new Date();
    const mountainTimeString = now.toLocaleString("en-US", {
      timeZone: "America/Denver"
    });
    const mountainTime = new Date(mountainTimeString);
    const hour = mountainTime.getHours();
    
    return hour >= 14 && hour < 17;
  }

  /**
   * Convert seconds to hours with decimal precision
   * @param {number} seconds - Sleep duration in seconds
   * @param {number} precision - Number of decimal places (default: 1)
   * @returns {string} Formatted hours string
   */
  static secondsToHours(seconds, precision = 1) {
    const hours = seconds / 3600;
    return hours.toFixed(precision);
  }

  /**
   * Get sleep quality assessment based on Oura score
   * @param {number} score - Oura sleep score (0-100)
   * @returns {string} Quality description
   */
  static getSleepQuality(score) {
    if (!score) return 'Unknown';
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    return 'Poor';
  }

  /**
   * Get personalized nap recommendation
   * @param {number} sleepHours - Hours of sleep last night
   * @param {boolean} isNapTime - Whether it's currently nap time
   * @returns {string} Recommendation text
   */
  static getRecommendation(sleepHours, isNapTime) {
    if (sleepHours < 5) {
      if (isNapTime) {
        return "You got very little sleep last night! A 20-30 minute nap would really help.";
      } else {
        return "You're severely sleep-deprived. Consider going to bed early tonight.";
      }
    } else if (sleepHours < 6) {
      if (isNapTime) {
        return "A quick 20 minute power nap could boost your energy for the rest of the day.";
      } else {
        return "You're a bit tired. Try to get 7-8 hours of sleep tonight.";
      }
    } else if (sleepHours < 7) {
      return "You got decent sleep, but could benefit from 30-60 more minutes tonight.";
    } else {
      return "Great sleep! You should have good energy throughout the day.";
    }
  }

  /**
   * Get current Mountain Time information
   * @returns {Object} Time information object
   */
  static getMountainTimeInfo() {
    const now = new Date();
    const mountainTimeString = now.toLocaleString("en-US", {
      timeZone: "America/Denver"
    });
    const mountainTime = new Date(mountainTimeString);
    
    return {
      hour: mountainTime.getHours(),
      minute: mountainTime.getMinutes(),
      formatted: now.toLocaleString("en-US", {
        timeZone: "America/Denver",
        timeStyle: "short"
      }),
      fullFormatted: now.toLocaleString("en-US", {
        timeZone: "America/Denver"
      }),
      isNapTime: this.isCurrentlyNapTime()
    };
  }

  /**
   * Calculate detailed nap recommendations
   * @param {Object} sleepData - Sleep data from Oura API
   * @returns {Object} Detailed recommendations
   */
  static getDetailedRecommendations(sleepData) {
    const status = this.calculateNapStatus(sleepData);
    const timeInfo = this.getMountainTimeInfo();
    
    let recommendations = [];
    
    if (status.needsNap) {
      recommendations.push('Take a 20-30 minute nap now');
      recommendations.push('Find a quiet, dark place to rest');
      recommendations.push('Set an alarm to avoid oversleeping');
    } else if (!status.isNapTime && parseFloat(status.sleepHours) < 6) {
      const hoursUntilNapTime = 14 - timeInfo.hour;
      if (hoursUntilNapTime > 0) {
        recommendations.push(`Wait ${hoursUntilNapTime} hours until nap time (2 PM)`);
      } else {
        recommendations.push('Nap time starts at 2:00 PM Mountain Time');
      }
      recommendations.push('Consider going to bed earlier tonight');
    } else if (parseFloat(status.sleepHours) >= 6) {
      recommendations.push('You got enough sleep last night');
      recommendations.push('Stay active and maintain your energy');
    } else if (status.isNapTime && parseFloat(status.sleepHours) < 6) {
      // This case is covered by needsNap, but adding for completeness
      recommendations.push('Consider a short power nap');
    }

    return {
      ...status,
      recommendations,
      timeInfo,
      sleepQuality: this.getSleepQuality(status.sleepScore)
    };
  }
}

module.exports = NapCalculator;