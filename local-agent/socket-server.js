require('dotenv').config();
const { Server } = require('socket.io');
const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [SOCKET-${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/socket.log' })
  ]
});

const io = new Server(3001, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Armazenar informações das conexões
const connectedUsers = new Map();
const activeRooms = new Map();

io.on('connection', (socket) => {
  logger.info(`Usuário conectado: ${socket.id}`);
  
  // Quando usuário se identifica
  socket.on('user-identify', (userData) => {
    connectedUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      connectedAt: new Date()
    });
    
    logger.info(`Usuário identificado: ${userData.name} (${userData.type})`);
  });

  // Entrar em room do chamado
  socket.on('join-ticket', (ticketId) => {
    socket.join(`ticket-${ticketId}`);
    
    // Adicionar à lista de usuários na room
    if (!activeRooms.has(ticketId)) {
      activeRooms.set(ticketId, new Set());
    }
    activeRooms.get(ticketId).add(socket.id);
    
    // Notificar outros usuários na room
    const userInfo = connectedUsers.get(socket.id);
    socket.to(`ticket-${ticketId}`).emit('user-joined', {
      socketId: socket.id,
      user: userInfo
    });
    
    logger.info(`Usuário ${socket.id} entrou no ticket ${ticketId}`);
  });

  // Sair da room do chamado
  socket.on('leave-ticket', (ticketId) => {
    socket.leave(`ticket-${ticketId}`);
    
    // Remover da lista de usuários na room
    if (activeRooms.has(ticketId)) {
      activeRooms.get(ticketId).delete(socket.id);
    }
    
    socket.to(`ticket-${ticketId}`).emit('user-left', { socketId: socket.id });
    logger.info(`Usuário ${socket.id} saiu do ticket ${ticketId}`);
  });

  // Enviar mensagem
  socket.on('send-message', async (data) => {
    try {
      const { ticketId, content, attachments = [] } = data;
      const userInfo = connectedUsers.get(socket.id);
      
      if (!userInfo) {
        socket.emit('error', { message: 'Usuário não identificado' });
        return;
      }

      // Preparar dados da mensagem
      const messageData = {
        ticketId: parseInt(ticketId),
        senderId: userInfo.userId || socket.id,
        senderName: userInfo.name,
        senderType: userInfo.type, // 'DEPARTMENT' ou 'TECH'
        content,
        attachments,
        sentAt: new Date().toISOString()
      };

      // Salvar no banco via API do Next.js
      const response = await axios.post(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/internal-chat/send`, messageData);
      
      if (response.data.success) {
        // Broadcast para todos na room incluindo o sender
        io.to(`ticket-${ticketId}`).emit('new-message', {
          ...messageData,
          id: response.data.messageId,
          sentAt: response.data.sentAt
        });
        
        logger.info(`Mensagem enviada no ticket ${ticketId} por ${userInfo.name}`);
      } else {
        socket.emit('error', { message: 'Erro ao salvar mensagem' });
      }
    } catch (error) {
      logger.error(`Erro ao enviar mensagem: ${error.message}`);
      socket.emit('error', { message: 'Erro interno do servidor' });
    }
  });

  // Indicador de digitação
  socket.on('typing-start', (data) => {
    const userInfo = connectedUsers.get(socket.id);
    socket.to(`ticket-${data.ticketId}`).emit('user-typing', {
      socketId: socket.id,
      user: userInfo
    });
  });

  socket.on('typing-stop', (data) => {
    socket.to(`ticket-${data.ticketId}`).emit('user-stopped-typing', {
      socketId: socket.id
    });
  });

  // Status online/offline
  socket.on('update-status', (status) => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.status = status;
      connectedUsers.set(socket.id, userInfo);
      
      // Broadcast status para todas as rooms que o usuário está
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit('user-status-changed', {
            socketId: socket.id,
            status
          });
        }
      });
    }
  });

  // Notificar sobre novo ticket criado
  socket.on('new-ticket-created', (ticketData) => {
    // Notificar todos os técnicos/admins conectados
    connectedUsers.forEach((user, socketId) => {
      if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(user.type)) {
        io.to(socketId).emit('new-internal-ticket-notification', {
          ticketId: ticketData.id,
          title: ticketData.title,
          school: ticketData.School?.name,
          category: ticketData.category,
          priority: ticketData.priority,
          createdAt: ticketData.createdAt,
          message: `Novo chamado: ${ticketData.title}`
        });
      }
    });
    
    logger.info(`Novo ticket criado: ${ticketData.id} - ${ticketData.title}`);
  });

  // Desconexão
  socket.on('disconnect', () => {
    const userInfo = connectedUsers.get(socket.id);
    
    // Remover usuário de todas as rooms ativas
    activeRooms.forEach((users, ticketId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(`ticket-${ticketId}`).emit('user-left', { 
          socketId: socket.id,
          user: userInfo 
        });
      }
    });

    connectedUsers.delete(socket.id);
    
    if (userInfo) {
      logger.info(`Usuário desconectado: ${userInfo.name} (${socket.id})`);
    } else {
      logger.info(`Usuário desconectado: ${socket.id}`);
    }
  });

  // Heartbeat para manter conexão ativa
  const heartbeat = setInterval(() => {
    socket.emit('ping');
  }, 30000);

  socket.on('disconnect', () => {
    clearInterval(heartbeat);
  });
});

// Estatísticas do servidor
setInterval(() => {
  logger.info(`Estatísticas: ${connectedUsers.size} usuários conectados, ${activeRooms.size} rooms ativas`);
}, 300000); // A cada 5 minutos

const PORT = process.env.SOCKET_PORT || 3001;
logger.info(`Servidor Socket.IO rodando na porta ${PORT}`);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Encerrando servidor Socket.IO...');
  io.close(() => {
    logger.info('Servidor Socket.IO encerrado');
    process.exit(0);
  });
});