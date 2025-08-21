import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabaseClient';

interface ChatMessage {
  id: number;
  ticketId: number;
  senderId: string;
  senderName: string;
  senderType: 'SCHOOL' | 'TECH' | 'ADMIN';
  content: string;
  attachments: string[];
  sentAt: string;
  readAt?: string;
}

interface InternalTicket {
  id: number;
  schoolId: number;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  assignedName?: string;
  createdAt: string;
  updatedAt: string;
  School: {
    name: string;
    email?: string;
    phone?: string;
  };
  messages?: ChatMessage[];
  _count?: {
    messages: number;
  };
}

interface UserTyping {
  socketId: string;
  user: {
    name: string;
    type: string;
  };
}

export const useInternalChat = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<InternalTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usersTyping, setUsersTyping] = useState<UserTyping[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const currentUserRef = useRef<any>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Inicializar conexão Socket.IO
  const initializeSocket = useCallback(async () => {
    try {
      // Pegar dados do usuário atual do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Buscar profile do usuário
      const response = await fetch(`/api/get-profile?userId=${session.user.id}`);
      const profileData = await response.json();
      
      console.log('Profile API response:', profileData); // Debug
      
      if (profileData.error) {
        console.error('Erro ao buscar profile:', profileData.error);
        return;
      }
      
      const userData = {
        userId: session.user.id,
        name: profileData.displayName,
        type: profileData.role,
        schoolId: profileData.schoolId
      };

      currentUserRef.current = userData;
      setCurrentUser(userData);

      console.log('Current user loaded:', userData); // Debug

      // Conectar ao Socket.IO
      const newSocket = io('http://localhost:3001');
      
      newSocket.on('connect', () => {
        console.log('Conectado ao Socket.IO');
        setConnected(true);
        
        // Identificar usuário no servidor
        newSocket.emit('user-identify', currentUserRef.current);
        
        // Pedir permissão de notificação para técnicos
        if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(userData.type)) {
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
          }
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Desconectado do Socket.IO');
        setConnected(false);
      });

      // Receber nova mensagem
      newSocket.on('new-message', (message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
        
        // Atualizar último timestamp do ticket na lista
        setTickets(prev => prev.map(ticket => 
          ticket.id === message.ticketId 
            ? { ...ticket, updatedAt: message.sentAt }
            : ticket
        ));
      });

      // Indicadores de digitação
      newSocket.on('user-typing', (data: UserTyping) => {
        setUsersTyping(prev => {
          const exists = prev.find(u => u.socketId === data.socketId);
          return exists ? prev : [...prev, data];
        });
      });

      newSocket.on('user-stopped-typing', (data: { socketId: string }) => {
        setUsersTyping(prev => prev.filter(u => u.socketId !== data.socketId));
      });

      // Status de usuários
      newSocket.on('user-joined', (data: any) => {
        setOnlineUsers(prev => [...prev, data.socketId]);
      });

      newSocket.on('user-left', (data: any) => {
        setOnlineUsers(prev => prev.filter(id => id !== data.socketId));
      });

      // Notificações de novos tickets
      newSocket.on('new-internal-ticket-notification', (notification: any) => {
        console.log('🔔 Nova notificação de ticket:', notification);
        
        // Mostrar notificação do browser se permitido
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Novo Chamado Interno`, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: `ticket-${notification.ticketId}`
          });
        }
        
        // Recarregar lista de tickets se for técnico
        if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(currentUserRef.current?.type)) {
          loadTickets();
        }
      });

      newSocket.on('error', (error: any) => {
        console.error('Erro Socket.IO:', error);
      });

      setSocket(newSocket);

    } catch (error) {
      console.error('Erro ao inicializar socket:', error);
    }
  }, []);

  // Entrar em um ticket (room)
  const joinTicket = useCallback((ticket: InternalTicket) => {
    if (socket && ticket) {
      socket.emit('join-ticket', ticket.id);
      setActiveTicket(ticket);
      
      // Carregar mensagens existentes
      loadMessages(ticket.id);
    }
  }, [socket]);

  // Sair de um ticket
  const leaveTicket = useCallback(() => {
    if (socket && activeTicket) {
      socket.emit('leave-ticket', activeTicket.id);
      setActiveTicket(null);
      setMessages([]);
      setUsersTyping([]);
    }
  }, [socket, activeTicket]);

  // Enviar mensagem
  const sendMessage = useCallback((content: string, attachments: string[] = []) => {
    if (socket && activeTicket && content.trim()) {
      socket.emit('send-message', {
        ticketId: activeTicket.id,
        content: content.trim(),
        attachments
      });
    }
  }, [socket, activeTicket]);

  // Indicar que está digitando
  const startTyping = useCallback(() => {
    if (socket && activeTicket) {
      socket.emit('typing-start', { ticketId: activeTicket.id });
      
      // Auto-stop após 3 segundos
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
      
      typingTimeout.current = setTimeout(() => {
        stopTyping();
      }, 3000);
    }
  }, [socket, activeTicket]);

  const stopTyping = useCallback(() => {
    if (socket && activeTicket) {
      socket.emit('typing-stop', { ticketId: activeTicket.id });
    }
    
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
  }, [socket, activeTicket]);

  // Carregar mensagens do banco
  const loadMessages = async (ticketId: number) => {
    try {
      const response = await fetch(`/api/internal-chat/messages/${ticketId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  // Carregar tickets
  const loadTickets = async () => {
    try {
      const user = currentUserRef.current;
      if (!user) return;

      let url = '/api/internal-chat/tickets';
      
      // Se for setor (SCHOOL), filtrar por schoolId
      if (user.type === 'SCHOOL') {
        url += `?schoolId=${user.schoolId}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
    }
  };

  // Criar novo ticket
  const createTicket = async (ticketData: {
    title: string;
    description?: string;
    category?: string;
  }) => {
    try {
      const user = currentUserRef.current;
      if (!user || user.type !== 'SCHOOL') {
        throw new Error('Apenas setores podem criar tickets');
      }

      const response = await fetch('/api/internal-chat/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: user.schoolId,
          ...ticketData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Emitir evento para notificar técnicos
        if (socket) {
          socket.emit('new-ticket-created', data.ticket);
        }
        
        await loadTickets(); // Recarregar lista
        return data.ticket;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      throw error;
    }
  };

  // Inicializar quando componente montar
  useEffect(() => {
    initializeSocket();
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [initializeSocket]);

  // Carregar tickets quando conectar
  useEffect(() => {
    if (connected && currentUserRef.current) {
      loadTickets();
    }
  }, [connected]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  return {
    // Estado
    connected,
    tickets,
    activeTicket,
    messages,
    usersTyping,
    onlineUsers,
    currentUser,
    
    // Ações
    joinTicket,
    leaveTicket,
    sendMessage,
    startTyping,
    stopTyping,
    createTicket,
    loadTickets,
    
    // Utils
    isUserTyping: usersTyping.length > 0,
    typingUserNames: usersTyping.map(u => u.user.name)
  };
};