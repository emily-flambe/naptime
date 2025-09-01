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
    // Find the main sleep session for last night
    // Look for 'long_sleep' type on today's date (Oura assigns sleep to the day it ends)
    const today = new Date().toISOString().split("T")[0];

    // Check if there's been a nap today (sleep that started between 11am-7pm MT)
    const todayNap = sleepData?.data?.find((record) => {
      if (record.day !== today) return false;

      // Parse the bedtime_start to check if it's during daytime (11am-7pm MT)
      const bedtimeStart = new Date(record.bedtime_start);
      const startHour = bedtimeStart.getHours();

      // A nap is sleep that starts between 11am (11:00) and 7pm (19:00)
      const isDaytimeNap = startHour >= 11 && startHour < 19;

      // Include late_nap type OR any sleep during daytime hours
      return (
        record.type === "late_nap" ||
        (isDaytimeNap && record.type !== "long_sleep")
      );
    });

    // Find today's long_sleep record (main sleep) or fall back to most recent long_sleep
    let sleepRecord = sleepData?.data?.find(
      (record) => record.day === today && record.type === "long_sleep",
    );

    // If no sleep for today yet, get the most recent long_sleep
    if (!sleepRecord) {
      sleepRecord = sleepData?.data?.find(
        (record) => record.type === "long_sleep",
      );
    }

    // If still no long_sleep, fall back to first record that's not a nap
    if (!sleepRecord) {
      sleepRecord =
        sleepData?.data?.find((record) => record.type !== "late_nap") ||
        sleepData?.data?.[0];
    }

    // Only count main sleep duration, exclude naps
    const sleepSeconds = sleepRecord?.total_sleep_duration || 0;
    const sleepHours = sleepSeconds / 3600;

    // Get readiness score (proxy for sleep quality in sleep sessions)
    const sleepScore = sleepRecord?.readiness?.score || null;

    // Get current time in Mountain Time (America/Denver)
    const now = new Date();
    const mountainTimeString = now.toLocaleString("en-US", {
      timeZone: "America/Denver",
    });

    // Create a proper Date object for Mountain Time
    const mountainTime = new Date(mountainTimeString);
    const hour = mountainTime.getHours();

    // Time windows in Mountain Time
    const isNapTime = hour >= 14 && hour < 17; // 2:00 PM to 4:59 PM
    const isSleepTime = hour >= 0 && hour < 8; // Midnight to 7:59 AM

    // Determine sleep category and nap need
    const sleepCategory = this.getSleepCategory(sleepHours);
    let needsNap = false;
    let napPriority = "none"; // none, maybe, yes
    let hasNappedToday = !!todayNap;

    // If Emily has already napped today, she doesn't need another nap
    if (hasNappedToday) {
      needsNap = false;
      napPriority = "none";
    } else if (sleepHours < 4) {
      // Severely sleep deprived - nap at any time
      needsNap = true;
      napPriority = "yes";
    } else if (sleepHours > 9) {
      // Probably sick - nap at any time
      needsNap = true;
      napPriority = "yes";
    } else if (sleepHours >= 4 && sleepHours < 6) {
      // Struggling - maybe nap during nap period
      needsNap = isNapTime;
      napPriority = isNapTime ? "maybe" : "none";
    } else {
      // Good sleep (6-9 hours) - never needs nap
      needsNap = false;
      napPriority = "none";
    }

    // Generate appropriate message
    let message;
    if (hasNappedToday) {
      message = "Not Nap Time";
    } else if (isSleepTime) {
      message = "Sleep Time";
    } else if (sleepHours < 4) {
      message = "NAP TIME";
    } else if (sleepHours > 9) {
      message = "NAP TIME";
    } else if (sleepHours >= 4 && sleepHours < 6 && isNapTime) {
      message = "Maybe Nap Time";
    } else if (sleepHours >= 4 && sleepHours < 6 && !isNapTime) {
      message = "Not Nap Time";
    } else {
      message = "Not Nap Time";
    }

    // Format current time for display
    const currentTime = now.toLocaleString("en-US", {
      timeZone: "America/Denver",
      timeStyle: "short",
    });

    return {
      needsNap,
      sleepHours: sleepHours.toFixed(1),
      sleepScore: sleepScore,
      sleepCategory: sleepCategory,
      napPriority: napPriority,
      quality: this.getSleepQuality(sleepScore),
      isNapTime,
      isSleepTime,
      currentTime,
      lastUpdated: new Date().toISOString(),
      message,
      shouldNap: needsNap,
      recommendation: hasNappedToday
        ? "emily has napped already. Another nap would be silly."
        : this.getRecommendation(sleepHours, isNapTime, sleepCategory),
      hasNappedToday,
      details: {
        totalSleepDurationSeconds: sleepSeconds,
        efficiency: sleepRecord?.efficiency,
        deepSleepMinutes: Math.round(
          (sleepRecord?.deep_sleep_duration || 0) / 60,
        ),
        remSleepMinutes: Math.round(
          (sleepRecord?.rem_sleep_duration || 0) / 60,
        ),
        lightSleepMinutes: Math.round(
          (sleepRecord?.light_sleep_duration || 0) / 60,
        ),
      },
    };
  }

  /**
   * Check if current time is within nap time window (2-5 PM MT)
   * @returns {boolean} True if it's currently nap time
   */
  static isCurrentlyNapTime() {
    const now = new Date();
    const mountainTimeString = now.toLocaleString("en-US", {
      timeZone: "America/Denver",
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
    if (!score) return "Unknown";
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 55) return "Fair";
    return "Poor";
  }

  /**
   * Get sleep category based on hours of sleep
   * @param {number} sleepHours - Hours of sleep
   * @returns {string} Sleep category
   */
  static getSleepCategory(sleepHours) {
    if (sleepHours < 4) return "severely-deprived";
    if (sleepHours < 6) return "struggling";
    if (sleepHours <= 9) return "good";
    return "oversleep"; // Probably sick
  }

  /**
   * Get personalized nap recommendation
   * @param {number} sleepHours - Hours of sleep last night
   * @param {boolean} isNapTime - Whether it's currently nap time
   * @param {string} sleepCategory - Sleep category
   * @returns {string} Recommendation text
   */
  static getRecommendation(sleepHours, isNapTime, sleepCategory) {
    switch (sleepCategory) {
      case "severely-deprived":
        return "Emily is severely sleep deprived. She should take a 20-30 minute nap immediately, regardless of the time.";

      case "oversleep":
        return "Emily slept more than 9 hours, which might indicate she's getting sick. A nap could help her recover.";

      case "struggling":
        if (isNapTime) {
          return "Emily is probably struggling a little. She would probably benefit from taking a nap.";
        } else {
          return "Emily has bad sleep habits, and she is ashamed of them. But now is not the time for a nap. She should try to get more sleep tonight.";
        }

      case "good":
      default:
        if (sleepHours < 7) {
          return "Emily got decent sleep, but could benefit from 30-60 more minutes tonight.";
        } else {
          return "Great sleep! Emily should have good energy throughout the day.";
        }
    }
  }

  /**
   * Get current Mountain Time information
   * @returns {Object} Time information object
   */
  static getMountainTimeInfo() {
    const now = new Date();
    const mountainTimeString = now.toLocaleString("en-US", {
      timeZone: "America/Denver",
    });
    const mountainTime = new Date(mountainTimeString);

    return {
      hour: mountainTime.getHours(),
      minute: mountainTime.getMinutes(),
      formatted: now.toLocaleString("en-US", {
        timeZone: "America/Denver",
        timeStyle: "short",
      }),
      fullFormatted: now.toLocaleString("en-US", {
        timeZone: "America/Denver",
      }),
      isNapTime: this.isCurrentlyNapTime(),
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
      recommendations.push("Take a 20-30 minute nap now");
      recommendations.push("Find a quiet, dark place to rest");
      recommendations.push("Set an alarm to avoid oversleeping");
    } else if (
      status.sleepCategory === "severely-deprived" &&
      !status.needsNap
    ) {
      // This shouldn't happen with new logic, but keeping for safety
      recommendations.push("Take a nap immediately - severe sleep deprivation");
    } else if (status.sleepCategory === "oversleep") {
      recommendations.push("Take a nap - you might be getting sick");
      recommendations.push(
        "Monitor how you feel and consider seeing a doctor if oversleeping continues",
      );
    } else if (status.sleepCategory === "struggling" && !status.isNapTime) {
      const hoursUntilNapTime = 14 - timeInfo.hour;
      if (hoursUntilNapTime > 0 && hoursUntilNapTime < 12) {
        recommendations.push(
          `Wait ${hoursUntilNapTime} hours until nap time (2 PM)`,
        );
      } else {
        recommendations.push("Nap time is 2:00-5:00 PM Mountain Time");
      }
      recommendations.push("Consider going to bed earlier tonight");
    } else if (status.sleepCategory === "good") {
      recommendations.push("You got good sleep last night");
      recommendations.push("Stay active and maintain your energy");
    }

    return {
      ...status,
      recommendations,
      timeInfo,
      sleepQuality: this.getSleepQuality(status.sleepScore),
    };
  }
}

module.exports = NapCalculator;
