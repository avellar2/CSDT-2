import { useState, useEffect, useCallback, useRef } from 'react';
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
  userId: string;
  user: {
    name: string;
    type: string;
  };
  lastTyping: number;
}

export const useInternalChat = () => {
  const [connected, setConnected] = useState(false);
  const [tickets, setTickets] = useState<InternalTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<InternalTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [usersTyping, setUsersTyping] = useState<UserTyping[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const currentUserRef = useRef<any>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const messagesPollingInterval = useRef<NodeJS.Timeout | null>(null);
  const lastMessageId = useRef<number>(0);
  const lastTicketsUpdate = useRef<string>('');

  // Inicializar usuário
  const initializeUser = useCallback(async () => {
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
      setConnected(true);

      console.log('Current user loaded:', userData); // Debug

      // Pedir permissão de notificação para técnicos
      if (['TECH', 'ADMIN', 'ADMTOTAL'].includes(userData.type)) {
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      return userData;

    } catch (error) {
      console.error('Erro ao inicializar usuário:', error);
      setConnected(false);
    }
  }, []);

  // Polling para tickets
  const pollTickets = useCallback(async () => {
    if (!currentUserRef.current) return;

    try {
      const user = currentUserRef.current;
      let url = '/api/internal-chat/tickets';
      
      // Se for setor (SCHOOL), filtrar por schoolId
      if (user.type === 'SCHOOL') {
        url += `?schoolId=${user.schoolId}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        const newTickets = data.tickets;
        
        // Verificar se há novos tickets (para notificações)
        if (lastTicketsUpdate.current && ['TECH', 'ADMIN', 'ADMTOTAL'].includes(user.type)) {
          const oldTicketIds = new Set(tickets.map(t => t.id));
          const newTicketsList = newTickets.filter((t: InternalTicket) => !oldTicketIds.has(t.id));
          
          newTicketsList.forEach((ticket: InternalTicket) => {
            // Mostrar notificação do browser se permitido
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Novo Chamado Interno`, {
                body: `${ticket.title} - ${ticket.School.name}`,
                icon: '/favicon.ico',
                tag: `ticket-${ticket.id}`
              });
            }
          });
        }
        
        setTickets(newTickets);
        lastTicketsUpdate.current = new Date().toISOString();
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
    }
  }, [tickets]);

  // Polling para mensagens do ticket ativo
  const pollMessages = useCallback(async () => {
    if (!activeTicket) return;

    try {
      const response = await fetch(`/api/internal-chat/messages/${activeTicket.id}`);
      const data = await response.json();
      
      if (data.success) {
        const newMessages = data.messages;
        
        // Verificar se há mensagens novas
        if (newMessages.length > 0) {
          const latestMessage = newMessages[newMessages.length - 1];
          
          if (latestMessage.id > lastMessageId.current) {
            setMessages(newMessages);
            lastMessageId.current = latestMessage.id;
            
            // Atualizar timestamp do ticket na lista
            setTickets(prev => prev.map(ticket => 
              ticket.id === activeTicket.id 
                ? { ...ticket, updatedAt: latestMessage.sentAt }
                : ticket
            ));
          }
        } else {
          setMessages([]);
          lastMessageId.current = 0;
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  }, [activeTicket]);

  // Entrar em um ticket
  const joinTicket = useCallback((ticket: InternalTicket) => {
    if (ticket) {
      setActiveTicket(ticket);
      setMessages([]);
      lastMessageId.current = 0;
      
      // Iniciar polling de mensagens
      if (messagesPollingInterval.current) {
        clearInterval(messagesPollingInterval.current);
      }
      
      messagesPollingInterval.current = setInterval(() => {
        pollMessages();
      }, 2000); // Poll a cada 2 segundos
      
      // Carregar mensagens imediatamente
      pollMessages();
    }
  }, [pollMessages]);

  // Sair de um ticket
  const leaveTicket = useCallback(() => {
    setActiveTicket(null);
    setMessages([]);
    setUsersTyping([]);
    lastMessageId.current = 0;
    
    // Parar polling de mensagens
    if (messagesPollingInterval.current) {
      clearInterval(messagesPollingInterval.current);
      messagesPollingInterval.current = null;
    }
  }, []);

  // Enviar mensagem
  const sendMessage = useCallback(async (content: string, attachments: string[] = []) => {
    if (!activeTicket || !content.trim() || !currentUserRef.current) return;

    try {
      const messageData = {
        ticketId: activeTicket.id,
        senderId: currentUserRef.current.userId,
        senderName: currentUserRef.current.name,
        senderType: currentUserRef.current.type,
        content: content.trim(),
        attachments
      };

      const response = await fetch('/api/internal-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      const data = await response.json();
      
      if (data.success) {
        // Atualizar mensagens imediatamente
        pollMessages();
      } else {
        console.error('Erro ao enviar mensagem:', data.message);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  }, [activeTicket, pollMessages]);

  // Simular indicadores de digitação (simplificado)
  const startTyping = useCallback(() => {
    // Em uma implementação real, você poderia salvar no banco
    // ou usar uma API específica para typing indicators
    console.log('User started typing');
  }, []);

  const stopTyping = useCallback(() => {
    console.log('User stopped typing');
  }, []);

  // Carregar tickets
  const loadTickets = useCallback(async () => {
    await pollTickets();
  }, [pollTickets]);

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
    const init = async () => {
      const user = await initializeUser();
      if (user) {
        // Carregar tickets inicialmente
        await pollTickets();
        
        // Iniciar polling de tickets
        pollInterval.current = setInterval(() => {
          pollTickets();
        }, 5000); // Poll a cada 5 segundos
      }
    };

    init();
    
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      if (messagesPollingInterval.current) {
        clearInterval(messagesPollingInterval.current);
      }
    };
  }, [initializeUser, pollTickets]);

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
    onlineUsers: [], // Não implementado no polling
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