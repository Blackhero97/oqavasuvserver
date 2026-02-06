export const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [
    "http://localhost:5174",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];

export const corsOptions = {
  origin: function (origin, callback) {
    // Allow all localhost and local development origins
    if (
      !origin ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1")
    ) {
      callback(null, true);
    } else if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
