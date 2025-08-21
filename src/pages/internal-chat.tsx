import React, { useState, useRef, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { useInternalChat } from '@/hooks/useInternalChat';
import { NewTicketModal } from '@/components/NewTicketModal';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Users,
  Plus
} from 'lucide-react';

const InternalChat: React.FC = () => {
  const {
    connected,
    tickets,
    activeTicket,
    messages,
    currentUser,
    onlineUsers,
    isUserTyping,
    typingUserNames,
    joinTicket,
    leaveTicket,
    sendMessage,
    startTyping,
    stopTyping,
    createTicket,
    loadTickets
  } = useInternalChat();

  const [newMessage, setNewMessage] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreateTicket = async (ticketData: any) => {
    await createTicket(ticketData);
    setShowNewTicketModal(false);
  };

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focar input quando ticket ativo mudar
  useEffect(() => {
    if (activeTicket) {
      inputRef.current?.focus();
    }
  }, [activeTicket]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage);
      setNewMessage('');
      stopTyping();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Indicar que está digitando
    if (e.target.value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-500 bg-red-50';
      case 'HIGH': return 'text-orange-500 bg-orange-50';
      case 'NORMAL': return 'text-blue-500 bg-blue-50';
      case 'LOW': return 'text-gray-500 bg-gray-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'IN_PROGRESS': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'RESOLVED': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Sidebar - Lista de Tickets */}
          <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
            {/* Header da Sidebar */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                  <MessageCircle className="w-5 h-5" />
                  Chat Interno
                </h2>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-gray-500">
                    {connected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              
              {/* Debug info */}
              {/* <div className="mb-2 p-2 bg-gray-100 text-xs rounded">
                <div>Connected: {connected ? 'Yes' : 'No'}</div>
                <div>User: {currentUser?.name || 'Loading...'}</div>
                <div>Type: {currentUser?.type || 'Unknown'}</div>
                <div>School ID: {currentUser?.schoolId || 'None'}</div>
              </div> */}
              
              {currentUser?.type === 'SCHOOL' && (
                <button
                  onClick={() => setShowNewTicketModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Novo Chamado
                </button>
              )}
              
              {/* Mostrar botão mesmo sem conexão para debug */}
              {!currentUser && (
                <button
                  onClick={() => setShowNewTicketModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Novo Chamado (Debug)
                </button>
              )}
            </div>

            {/* Lista de Tickets */}
            <div className="flex-1 overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {currentUser?.type === 'SCHOOL' 
                    ? 'Nenhum chamado ainda. Clique em "Novo Chamado" para começar.'
                    : 'Nenhum chamado ativo no momento.'
                  }
                </div>
              ) : (
                tickets.map(ticket => (
                  <div
                    key={ticket.id}
                    onClick={() => joinTicket(ticket)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      activeTicket?.id === ticket.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm text-gray-900 truncate">
                        {ticket.title}
                      </h3>
                      {getStatusIcon(ticket.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {ticket.School.name}
                      </span>
                    </div>
                    
                    {ticket.messages && ticket.messages[0] && (
                      <p className="text-xs text-gray-600 truncate">
                        {ticket.messages[0].content}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {formatTime(ticket.updatedAt)}
                      </span>
                      {ticket._count && ticket._count.messages > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          {ticket._count.messages}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Área Principal - Chat */}
          <div className="flex-1 flex flex-col">
            {activeTicket ? (
              <>
                {/* Header do Chat */}
                <div className="p-4 bg-white border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {activeTicket.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {activeTicket.School.name}
                        {activeTicket.assignedName && (
                          <span className="ml-2">• Atendido por: {activeTicket.assignedName}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {onlineUsers.length + 1} online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Área de Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === currentUser?.userId ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === currentUser?.userId
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium opacity-75">
                            {message.senderName}
                          </span>
                          <span className="text-xs opacity-50">
                            {formatTime(message.sentAt)}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                        
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment, index) => (
                              <a
                                key={index}
                                href={attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs underline opacity-75"
                              >
                                📎 Anexo {index + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicador de digitação */}
                  {isUserTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 px-4 py-2 rounded-lg">
                        <p className="text-sm text-gray-500">
                          {typingUserNames.join(', ')} está{typingUserNames.length > 1 ? 'ão' : ''} digitando...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input de Mensagem */}
                <div className="p-4 bg-white border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Estado vazio */
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Selecione um chamado</h3>
                  <p className="text-sm">
                    {currentUser?.type === 'SCHOOL'
                      ? 'Clique em um chamado existente ou crie um novo.'
                      : 'Selecione um chamado da lista para iniciar o atendimento.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal para criar novo ticket */}
        <NewTicketModal
          isOpen={showNewTicketModal}
          onClose={() => setShowNewTicketModal(false)}
          onSubmit={handleCreateTicket}
        />
      </div>
    </ProtectedRoute>
  );
};

export default InternalChat;