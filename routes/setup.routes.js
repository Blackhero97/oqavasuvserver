/**
 * Organization Setup/Configuration Endpoint
 * Frontend'dan setup ma'lumotlarni qabul qiladi va saqlaydi
 */

import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// ========== ORGANIZATION CONFIGURATION SCHEMA ==========
const organizationConfigSchema = new mongoose.Schema(
  {
    // Tashkilot Ma'lumotlari
    organizationId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    organizationName: String,
    organizationType: {
      type: String,
      enum: ["school", "hospital", "office", "factory", "clinic", "warehouse"],
      required: true,
    },
    city: String,
    address: String,
    phone: String,
    email: String,
    leaderName: String,
    leaderPosition: String,

    // Biometric Terminal
    terminalIp: String,
    terminalPort: Number,
    terminalUsername: String,
    terminalPassword: String,

    // Database
    mongodbUri: String,
    dbName: String,

    // Customize Qiling
    classes: [String],
    departments: [String],
    workdayStart: String,
    workdayEnd: String,

    // Features
    enabledFeatures: {
      faceRecognition: Boolean,
      attendanceTracking: Boolean,
      reportsGeneration: Boolean,
      visitTracking: Boolean,
      appointments: Boolean,
      medicalRecords: Boolean,
      productionTracking: Boolean,
    },

    // Status
    isSetupComplete: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { strict: false },
);

const OrganizationConfig = mongoose.model(
  "OrganizationConfig",
  organizationConfigSchema,
);

// ========== GET SETUP STATUS ==========
router.get("/status", async (req, res) => {
  try {
    const orgId = process.env.ORGANIZATION_ID || "default";
    const config = await OrganizationConfig.findOne({ organizationId: orgId });

    if (!config) {
      return res.json({
        setupComplete: false,
        message: "Setup Required",
      });
    }

    res.json({
      setupComplete: config.isSetupComplete,
      organization: {
        name: config.organizationName,
        type: config.organizationType,
        city: config.city,
      },
    });
  } catch (error) {
    console.error("Setup status error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== SAVE SETUP (CONFIGURE ORGANIZATION) ==========
router.post("/configure", async (req, res) => {
  try {
    const {
      organizationId,
      organizationName,
      organizationType,
      city,
      address,
      phone,
      email,
      leaderName,
      leaderPosition,
      terminalIp,
      terminalPort,
      terminalUsername,
      terminalPassword,
      mongodbUri,
      dbName,
      classes,
      departments,
      workdayStart,
      workdayEnd,
      enabledFeatures,
    } = req.body;

    // Validation
    if (!organizationId || !organizationName || !organizationType) {
      return res.status(400).json({
        error:
          "Required fields: organizationId, organizationName, organizationType",
      });
    }

    // Upsert
    const config = await OrganizationConfig.findOneAndUpdate(
      { organizationId },
      {
        organizationId,
        organizationName,
        organizationType,
        city,
        address,
        phone,
        email,
        leaderName,
        leaderPosition,
        terminalIp,
        terminalPort: parseInt(terminalPort),
        terminalUsername,
        terminalPassword,
        mongodbUri,
        dbName,
        classes: classes || [],
        departments: departments || [],
        workdayStart: workdayStart || "08:00",
        workdayEnd: workdayEnd || "17:00",
        enabledFeatures: enabledFeatures || {},
        isSetupComplete: true,
      },
      { upsert: true, new: true },
    );

    console.log(`✅ Organization configured: ${organizationName}`);

    res.json({
      success: true,
      message: "Organization configured successfully",
      organization: config,
    });
  } catch (error) {
    console.error("Setup error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== GET ORGANIZATION CONFIG ==========
router.get("/config", async (req, res) => {
  try {
    const orgId = process.env.ORGANIZATION_ID || "default";
    const config = await OrganizationConfig.findOne({ organizationId: orgId });

    if (!config) {
      return res.status(404).json({ error: "Organization not configured" });
    }

    res.json(config);
  } catch (error) {
    console.error("Config fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== UPDATE ORGANIZATION CONFIG ==========
router.put("/config", async (req, res) => {
  try {
    const orgId = process.env.ORGANIZATION_ID || "default";
    const config = await OrganizationConfig.findOneAndUpdate(
      { organizationId: orgId },
      req.body,
      { new: true },
    );

    if (!config) {
      return res.status(404).json({ error: "Organization not found" });
    }

    res.json(config);
  } catch (error) {
    console.error("Config update error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
