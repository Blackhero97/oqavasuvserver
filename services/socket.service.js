import { Server } from 'socket.io';

let io;

/**
 * Initialize Socket.IO server
 */
export const initializeSocket = (httpServer, corsOptions) => {
    io = new Server(httpServer, {
        cors: corsOptions
    });

    io.on('connection', (socket) => {
        console.log('✅ Client connected:', socket.id);

        socket.on('disconnect', () => {
            console.log('❌ Client disconnected:', socket.id);
        });
    });

    // Make available globally for backward compatibility
    global.io = io;

    return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

/**
 * Emit attendance update event
 */
export const emitAttendanceUpdate = (data) => {
    if (io) {
        io.emit('attendance:update', data);
    }
};

/**
 * Emit personnel update event (universal)
 */
export const emitPersonnelUpdate = (data) => {
    if (io) {
        io.emit('personnel:updated', data);
    }
};

/**
 * Emit student update event (legacy)
 */
export const emitStudentUpdate = (data) => {
    emitPersonnelUpdate(data);
};

/**
 * Emit class update event (legacy)
 */
export const emitClassUpdate = (data) => {
    if (io) {
        io.emit('department:updated', data);
    }
};
