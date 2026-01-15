import axios from "axios";
import https from "https";

// Hikvision device configuration
const HIKVISION_CONFIG = {
  ip: "192.168.100.193",
  username: "admin",
  password: "Parol8887",
  baseUrl: "https://192.168.100.193",  // Changed to HTTPS
};

// HTTPS agent to accept self-signed certificates
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

/**
 * Fetch authentication events from Hikvision Access Control device
 * @param {number} maxResults - Maximum number of events to fetch (default: 30)
 * @returns {Promise<Object>} - Returns parsed events or error
 */
export async function fetchHikvisionEvents(maxResults = 30) {
  try {
    const url = `${HIKVISION_CONFIG.baseUrl}/ISAPI/AccessControl/AcsEvent?format=json`;

    const requestBody = {
      AcsEventCond: {
        searchID: "1",
        searchResultPosition: 0,
        maxResults: maxResults,
      },
    };

    const response = await axios.post(url, requestBody, {
      auth: {
        username: HIKVISION_CONFIG.username,
        password: HIKVISION_CONFIG.password,
      },
      headers: {
        "Content-Type": "application/json",
      },
      httpsAgent: httpsAgent,
      timeout: 10000, // 10 seconds timeout
    });

    // Parse response
    if (response.data && response.data.AcsEvent) {
      const events = response.data.AcsEvent.InfoList || [];

      // Transform Hikvision format to CRM format
      const transformedEvents = events.map((event) => ({
        employeeNoString: event.employeeNoString,
        name: event.name,
        time: event.time,
        eventType: event.eventType,
        cardNo: event.cardNo || null,
        pictureUrl: event.pictureUrl || null,
      }));

      return {
        success: true,
        totalEvents: transformedEvents.length,
        events: transformedEvents,
        rawData: response.data,
      };
    }

    return {
      success: false,
      error: "No events found in response",
      rawData: response.data,
    };
  } catch (error) {
    console.error("Hikvision API Error:", error.message);

    return {
      success: false,
      error: error.message,
      details: error.response?.data || null,
      statusCode: error.response?.status || null,
    };
  }
}

/**
 * Test connection to Hikvision device
 * @returns {Promise<Object>} - Returns connection status
 */
export async function testHikvisionConnection() {
  try {
    const url = `${HIKVISION_CONFIG.baseUrl}/ISAPI/System/deviceInfo?format=json`;

    const response = await axios.get(url, {
      auth: {
        username: HIKVISION_CONFIG.username,
        password: HIKVISION_CONFIG.password,
      },
      httpsAgent: httpsAgent,
      timeout: 5000,
    });

    return {
      success: true,
      message: "Successfully connected to Hikvision device (HTTPS)",
      deviceInfo: response.data,
      status: "online",
    };
  } catch (error) {
    // If deviceInfo fails, try the events endpoint
    try {
      const testUrl = `${HIKVISION_CONFIG.baseUrl}/ISAPI/AccessControl/AcsEvent?format=json`;
      await axios.post(
        testUrl,
        { AcsEventCond: { searchID: "1", searchResultPosition: 0, maxResults: 1 } },
        {
          auth: {
            username: HIKVISION_CONFIG.username,
            password: HIKVISION_CONFIG.password,
          },
          httpsAgent: httpsAgent,
          timeout: 5000,
        }
      );

      return {
        success: true,
        message: "Hikvision Access Control API is accessible (HTTPS)",
        status: "online",
      };
    } catch (innerError) {
      return {
        success: false,
        message: "Failed to connect to Hikvision device",
        error: innerError.message,
        status: "offline",
      };
    }
  }
}

/**
 * Process Hikvision events and convert to attendance records
 * @param {Array} events - Array of Hikvision events
 * @param {Array} employees - Array of CRM employees
 * @returns {Array} - Processed attendance records ready for insertion
 */
export function processHikvisionEvents(events, employees) {
  const attendanceRecords = [];

  events.forEach((event) => {
    // Find matching employee by hikvisionEmployeeId
    const employee = employees.find(
      (emp) => emp.hikvisionEmployeeId === event.employeeNoString
    );

    if (!employee) {
      console.warn(
        `Employee not found for Hikvision ID: ${event.employeeNoString} (${event.name})`
      );
      return;
    }

    // Parse timestamp from Hikvision format: "2025-12-18T12:16:02"
    const timestamp = new Date(event.time);
    const date = timestamp.toISOString().split("T")[0];
    const time = timestamp.toTimeString().substring(0, 5); // HH:MM format

    attendanceRecords.push({
      employeeId: employee.id,
      name: employee.name,
      role: employee.role,
      department: employee.department,
      hikvisionEmployeeId: event.employeeNoString,
      date: date,
      time: time,
      timestamp: event.time,
      eventType: event.eventType,
      source: "hikvision",
    });
  });

  return attendanceRecords;
}
