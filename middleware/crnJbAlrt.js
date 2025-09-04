// cron/alertJobs.js
const cron = require("node-cron");
const moment = require("moment-timezone");
const Alert = require("../models/Alert");
const TdyAlert = require("../models/TdyAlert");

function getISTDayRange() {
  const istStart = moment().tz("Asia/Kolkata").startOf("day").toDate();
  const istEnd = moment().tz("Asia/Kolkata").endOf("day").toDate();
  return { startOfToday: istStart, endOfToday: istEnd };
}

/**
 * Job 1: Runs daily 12:30 AM IST
 * - Fetch alerts for today from `alrtTbl`
 * - Insert them into `tdyAlrt`
 */
const dailyAlertJob = () => {
  cron.schedule("1 0 * * *", async () => {
    console.log("[CRON] Running daily job to populate tdyAlrt...");

    try {
      const { startOfToday, endOfToday } = getISTDayRange();

      const alerts = await Alert.find({
        startTime: { $gte: startOfToday, $lte: endOfToday },
        dltSts: 0
      });

      if (!alerts.length) {
        console.log("[CRON] No alerts for today.");
        return;
      }

      for (const alrt of alerts) {
        // Avoid duplicates
        const exists = await TdyAlert.findOne({
          clientId: alrt.clientId,
          alertTime: alrt.alertTime,
          dltSts: 0
        });

        if (!exists) {
          await TdyAlert.create({
            clientId: alrt.clientId,
            alertTime: alrt.startTime,
            subject: alrt.subject,
            assignedTo: alrt.assignedTo,
            status: alrt.status,
            crtdOn: new Date(),
            crtdBy: "cronjob",
            crtdIp: "127.0.0.1"
          });
          console.log(`✅ Copied alert to tdyAlrt for client ${alrt.clientId}`);
        }
      }
    } catch (err) {
      console.error("[CRON] Error in dailyAlertJob:", err);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
};

/**
 * Job 2: Runs every minute
 * - Checks tdyAlrt for alerts matching current minute
 */
const minuteAlertJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = moment().tz("Asia/Kolkata");
      const startOfMinute = now.clone().startOf("minute").toDate();
      const endOfMinute = now.clone().endOf("minute").toDate();

      const alerts = await TdyAlert.find({
        alertTime: { $gte: startOfMinute, $lte: endOfMinute },
        status: 0,
        dltSts: 0
      }).populate("clientId");

      if (alerts.length) {
        alerts.forEach(alrt => {
          console.log(`🔔 Alert triggered for client ${alrt.clientId?.name || alrt.clientId}: ${alrt.subject}`);
          // 👉 Here you can emit via socket.io, push notification, etc.
        });
      }
    } catch (err) {
      console.error("[CRON] Error in minuteAlertJob:", err);
    }
  }, {
    timezone: "Asia/Kolkata"
  });
};

module.exports = { dailyAlertJob, minuteAlertJob };
