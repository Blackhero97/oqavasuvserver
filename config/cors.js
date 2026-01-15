export const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'http://localhost:5174',
        'http://localhost:5173',
        'http://localhost:3000',
        'https://bm-crm-test.netlify.app',
    ];

export const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
};
