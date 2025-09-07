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
    // IMPORTANT: Use Mountain Time for date, not UTC
    const nowMT = new Date().toLocaleString("en-US", {
      timeZone: "America/Denver",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    // Convert MM/DD/YYYY to YYYY-MM-DD format
    const [month, day, year] = nowMT.split("/");
    const today = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    // Check if there's been a nap today (sleep that started between 11am-7pm MT)
    const todayNap = sleepData?.data?.find((record) => {
      if (record.day !== today) return false;

      // Parse the bedtime_start to check if it's during daytime (11am-7pm MT)
      const bedtimeStart = new Date(record.bedtime_start);

      // Convert to Mountain Time to get the correct hour
      const startHour = parseInt(
        bedtimeStart.toLocaleString("en-US", {
          timeZone: "America/Denver",
          hour: "2-digit",
          hour12: false,
        }),
      );

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

    // Check if we have no data (0.0 hours of sleep)
    const hasNoData = sleepSeconds === 0 || !sleepRecord;
    if (hasNoData) {
      // Get current time window for no-data message
      const now = new Date();
      const hour = parseInt(
        now.toLocaleString("en-US", {
          timeZone: "America/Denver",
          hour: "2-digit",
          hour12: false,
        }),
      );
      const timeWindow = this.getTimeWindow(hour);
      const noDataConfig = this.MESSAGE_CONFIG[timeWindow]["no-data"];

      // Return special status when we have no data
      return {
        needsNap: false,
        sleepHours: "0.0",
        sleepScore: null,
        sleepCategory: "no-data",
        napPriority: "unknown",
        quality: "Unknown",
        isNapTime: timeWindow === "nap",
        isSleepTime: timeWindow === "sleep",
        currentTime: new Date().toLocaleString("en-US", {
          timeZone: "America/Denver",
          timeStyle: "short",
        }),
        lastUpdated: new Date().toISOString(),
        message: noDataConfig.message,
        shouldNap: false,
        recommendation: noDataConfig.recommendation,
        hasNappedToday: false,
        details: {
          totalSleepDurationSeconds: 0,
          efficiency: null,
          deepSleepMinutes: 0,
          remSleepMinutes: 0,
          lightSleepMinutes: 0,
        },
      };
    }

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
    const timeWindow = this.getTimeWindow(hour);
    const isNapTime = timeWindow === "nap";
    const isSleepTime = timeWindow === "sleep";

    // Get sleep state and message configuration
    const sleepState = this.getSleepState(sleepHours);
    const sleepCategory = this.getSleepCategory(sleepHours); // For backward compatibility
    const hasNappedToday = !!todayNap;

    // Get message configuration
    let messageConfig;
    // During sleep time, always show "I Sleep" regardless of nap status
    if (isSleepTime) {
      messageConfig = this.MESSAGE_CONFIG[timeWindow][sleepState];
    } else if (hasNappedToday) {
      messageConfig = this.MESSAGE_CONFIG.napped;
    } else {
      messageConfig = this.MESSAGE_CONFIG[timeWindow][sleepState];
    }

    // Determine nap need based on configuration
    let needsNap = false;
    let napPriority = "none";

    if (!hasNappedToday) {
      if (sleepState === "shambles" || sleepState === "oversleep") {
        needsNap = true;
        napPriority = "yes";
      } else if (sleepState === "struggling" && isNapTime) {
        needsNap = true;
        napPriority = "maybe";
      }
    }

    const message = messageConfig.message;
    const configRecommendation = messageConfig.recommendation;

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
      recommendation: configRecommendation,
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
   * Configuration for messages based on time window and sleep state
   */
  static MESSAGE_CONFIG = {
    sleep: {
      shambles: {
        message: "I Sleep",
        recommendation: "Emily SHOULD be asleep right now.",
      },
      struggling: {
        message: "I Sleep",
        recommendation: "Emily SHOULD be asleep right now.",
      },
      ok: {
        message: "I Sleep",
        recommendation: "Emily SHOULD be asleep right now.",
      },
      oversleep: {
        message: "I Sleep",
        recommendation: "Emily SHOULD be asleep right now.",
      },
      "no-data": {
        message: "I Sleep",
        recommendation: "Emily SHOULD be asleep right now.",
      },
    },
    "pre-nap": {
      shambles: {
        message: "Not Nap Time",
        recommendation:
          "Emily is in shambles. She needs to survive until nap time at 2 PM.",
      },
      struggling: {
        message: "Not Nap Time",
        recommendation:
          "Emily has bad sleep habits, and she is ashamed of them. But now is not the time for a nap. She should try to get more sleep tonight.",
      },
      ok: {
        message: "Not Nap Time",
        recommendation: "Emily got decent sleep. No nap needed yet.",
      },
      oversleep: {
        message: "Not Nap Time",
        recommendation: "Emily might be getting sick - she slept over 9 hours.",
      },
      "no-data": {
        message: "Not Nap Time",
        recommendation:
          "The Oura API is responding, but no sleep data has been fetched yet. Emily's ring might still be syncing, or idk something dumb might have happened lmao",
      },
    },
    nap: {
      shambles: {
        message: "NAP TIME",
        recommendation:
          "Emily is severely sleep deprived. She should take a nap RIGHT NOW. GO TO BED",
      },
      struggling: {
        message: "Maybe Nap Time",
        recommendation:
          "Emily is probably struggling a little. She is probably considering a nap. Maybe you should, too.",
      },
      ok: {
        message: "Not Nap Time",
        recommendation:
          "Emily doesn't NEED to nap. But it could be fun. You never know what might happen during a nap!",
      },
      oversleep: {
        message: "NAP TIME",
        recommendation:
          "Emily slept more than 9 hours, which might indicate she's getting sick, because that is way too much sleep, yall are crazy",
      },
      "no-data": {
        message: "Unknown",
        recommendation:
          "The Oura API is responding, but no sleep data has been fetched yet. Emily's ring might still be syncing, or idk something dumb might have happened lmao",
      },
    },
    "post-nap": {
      shambles: { message: "Not Nap Time", recommendation: "GO TO BED GIRL" },
      struggling: {
        message: "Not Nap Time",
        recommendation:
          "Emily really should have slept more last night. She is a bad, bad girl. But it's too late to nap. She must live with the consequences of her choices until it is time for bed.",
      },
      ok: {
        message: "Not Nap Time",
        recommendation: "Emily is OK. But it is not nap time.",
      },
      oversleep: {
        message: "Not Nap Time",
        recommendation:
          "Emily might be getting sick - she slept over 9 hours. Who does that???",
      },
      "no-data": {
        message: "Not Nap Time",
        recommendation:
          "The Oura API is responding, but no sleep data has been fetched yet. Emily's ring might still be syncing, or idk something dumb might have happened lmao",
      },
    },
    napped: {
      message: "Not Nap Time",
      recommendation: "Emily has napped already. Another nap would be silly.",
    },
  };

  /**
   * Determine time window based on hour
   * @param {number} hour - Hour in 24-hour format
   * @returns {string} Time window: 'sleep', 'pre-nap', 'nap', or 'post-nap'
   */
  static getTimeWindow(hour) {
    // Temporarily using 10 PM instead of 11 PM for testing
    if (hour >= 22 || hour < 7) return "sleep"; // 10 PM - 7 AM (temporarily changed from 11 PM)
    if (hour >= 7 && hour < 14) return "pre-nap"; // 7 AM - 2 PM
    if (hour >= 14 && hour < 17) return "nap"; // 2 PM - 5 PM
    return "post-nap"; // 5 PM - 10 PM
  }

  /**
   * Get sleep state based on hours of sleep
   * @param {number} sleepHours - Hours of sleep
   * @returns {string} Sleep state: 'no-data', 'shambles', 'struggling', 'ok', or 'oversleep'
   */
  static getSleepState(sleepHours) {
    if (sleepHours === 0) return "no-data";
    if (sleepHours < 4) return "shambles"; // <4 hours
    if (sleepHours < 6) return "struggling"; // 4-6 hours
    if (sleepHours <= 9) return "ok"; // 6-9 hours
    return "oversleep"; // >9 hours (probably sick)
  }

  /**
   * Get sleep category based on hours of sleep
   * @param {number} sleepHours - Hours of sleep
   * @returns {string} Sleep category
   */
  static getSleepCategory(sleepHours) {
    // Map old names to new names for backward compatibility
    const state = this.getSleepState(sleepHours);
    if (state === "shambles") return "severely-deprived";
    if (state === "ok") return "good";
    return state;
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
      isNapTime: this.getTimeWindow(mountainTime.getHours()) === "nap",
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
