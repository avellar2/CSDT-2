export interface TicketAcceptedEmailData {
  schoolName: string;
  ticketId: number;
  ticketTitle: string;
  ticketDescription: string;
  scheduledDate: string;
  scheduledTime: string;
  responsibleName: string;
  notes?: string;
}

export const generateTicketAcceptedEmail = (data: TicketAcceptedEmailData): { subject: string; html: string; text: string } => {
  const subject = `✅ Chamado Técnico #${data.ticketId} Aceito - CSDT`;
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chamado Técnico Aceito</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .success-badge { background: #d1fae5; color: #065f46; padding: 10px 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: 600; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .info-label { font-weight: 600; color: #374151; }
        .info-value { color: #6b7280; }
        .visit-highlight { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .visit-highlight h3 { color: #1e40af; margin: 0 0 10px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 5px 0; color: #6b7280; font-size: 14px; }
        .button { background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛠️ CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Chamado Técnico Aceito</p>
        </div>
        
        <div class="content">
            <div class="success-badge">
                ✅ Seu chamado técnico foi aceito e agendado!
            </div>
            
            <p>Olá, <strong>${data.schoolName}</strong>!</p>
            
            <p>Informamos que seu chamado técnico foi <strong>aceito</strong> pela nossa equipe e já foi agendado para atendimento.</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0; color: #374151;">📋 Detalhes do Chamado</h3>
                <div class="info-row">
                    <span class="info-label">Número:</span>
                    <span class="info-value">#${data.ticketId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Título:</span>
                    <span class="info-value">${data.ticketTitle}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Responsável:</span>
                    <span class="info-value">${data.responsibleName}</span>
                </div>
            </div>
            
            <div class="visit-highlight">
                <h3>🗓️ Agendamento da Visita Técnica</h3>
                <p><strong>Data:</strong> ${new Date(data.scheduledDate).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p><strong>Horário:</strong> ${data.scheduledTime}</p>
                <p style="color: #1e40af; font-weight: 600; margin-top: 15px;">
                    📍 Nossa equipe técnica visitará a escola na data e horário informados acima.
                </p>
            </div>
            
            <div class="info-box">
                <h4 style="margin-top: 0; color: #374151;">📝 Descrição do Problema</h4>
                <p style="color: #6b7280; margin: 0;">${data.ticketDescription}</p>
            </div>
            
            ${data.notes ? `
            <div class="info-box">
                <h4 style="margin-top: 0; color: #374151;">💬 Observações da Equipe Técnica</h4>
                <p style="color: #6b7280; margin: 0;">${data.notes}</p>
            </div>
            ` : ''}
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;">
                    <strong>⚠️ Importante:</strong> Certifique-se de que haverá alguém responsável para receber a equipe técnica no horário agendado. Em caso de necessidade de reagendamento, entre em contato conosco com antecedência.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico</strong></p>
            <p>Este é um email automático. Em caso de dúvidas, entre em contato conosco.</p>
            <p style="font-size: 12px; color: #9ca3af;">Enviado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </div>
</body>
</html>
  `;

  const text = `
CSDT - Chamado Técnico Aceito

Olá, ${data.schoolName}!

Seu chamado técnico foi aceito e agendado:

Chamado #${data.ticketId}: ${data.ticketTitle}
Responsável: ${data.responsibleName}

AGENDAMENTO DA VISITA TÉCNICA:
Data: ${new Date(data.scheduledDate).toLocaleDateString('pt-BR')}
Horário: ${data.scheduledTime}

Descrição: ${data.ticketDescription}

${data.notes ? `Observações: ${data.notes}` : ''}

Certifique-se de que haverá alguém para receber a equipe técnica no horário agendado.

CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico
  `;

  return { subject, html, text };
};

export interface StatusChangeEmailData {
  schoolName: string;
  ticketId: number;
  ticketTitle: string;
  newStatus: string;
  responsibleName: string;
  statusMessage: string;
  scheduledDate?: string;
  scheduledTime?: string;
  notes?: string;
}

export const generateStatusChangeEmail = (data: StatusChangeEmailData): { subject: string; html: string; text: string } => {
  const statusText = {
    'IN_PROGRESS': 'Iniciado',
    'RESOLVED': 'Resolvido', 
    'CLOSED': 'Fechado',
    'CANCELLED': 'Cancelado'
  }[data.newStatus] || data.newStatus;
  
  const subject = `🔄 Chamado Técnico #${data.ticketId} ${statusText} - CSDT`;
  
  const statusColor = {
    'IN_PROGRESS': '#3b82f6',
    'RESOLVED': '#10b981', 
    'CLOSED': '#6b7280',
    'CANCELLED': '#ef4444'
  }[data.newStatus] || '#6b7280';
  
  const statusIcon = {
    'IN_PROGRESS': '🔧',
    'RESOLVED': '✅', 
    'CLOSED': '📜',
    'CANCELLED': '❌'
  }[data.newStatus] || '🔄';
  
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atualização do Chamado Técnico</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, ${statusColor}, ${statusColor}dd); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .status-badge { background: ${statusColor}20; color: ${statusColor}; padding: 15px 20px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: 600; font-size: 18px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .info-label { font-weight: 600; color: #374151; }
        .info-value { color: #6b7280; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 5px 0; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛠️ CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Atualização do Chamado Técnico</p>
        </div>
        
        <div class="content">
            <div class="status-badge">
                ${statusIcon} ${data.statusMessage}
            </div>
            
            <p>Olá, <strong>${data.schoolName}</strong>!</p>
            
            <p>Informamos que houve uma atualização no status do seu chamado técnico:</p>
            
            <div class="info-box">
                <h3 style="margin-top: 0; color: #374151;">📋 Detalhes do Chamado</h3>
                <div class="info-row">
                    <span class="info-label">Número:</span>
                    <span class="info-value">#${data.ticketId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Título:</span>
                    <span class="info-value">${data.ticketTitle}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Novo Status:</span>
                    <span class="info-value" style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Responsável:</span>
                    <span class="info-value">${data.responsibleName}</span>
                </div>
            </div>
            
            ${data.scheduledDate && data.scheduledTime ? `
            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #1e40af; margin: 0 0 10px 0;">🗓️ Próxima Visita Agendada</h3>
                <p><strong>Data:</strong> ${new Date(data.scheduledDate).toLocaleDateString('pt-BR')}</p>
                <p><strong>Horário:</strong> ${data.scheduledTime}</p>
            </div>
            ` : ''}
            
            ${data.notes ? `
            <div class="info-box">
                <h4 style="margin-top: 0; color: #374151;">💬 Observações da Equipe Técnica</h4>
                <p style="color: #6b7280; margin: 0;">${data.notes}</p>
            </div>
            ` : ''}
        </div>
        
        <div class="footer">
            <p><strong>CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico</strong></p>
            <p>Este é um email automático. Em caso de dúvidas, entre em contato conosco.</p>
            <p style="font-size: 12px; color: #9ca3af;">Enviado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </div>
</body>
</html>
  `;

  const text = `
CSDT - Atualização do Chamado Técnico

Olá, ${data.schoolName}!

${data.statusMessage}

Chamado #${data.ticketId}: ${data.ticketTitle}
Novo Status: ${statusText}
Responsável: ${data.responsibleName}

${data.scheduledDate && data.scheduledTime ? `Próxima visita agendada:
Data: ${new Date(data.scheduledDate).toLocaleDateString('pt-BR')}
Horário: ${data.scheduledTime}

` : ''}

${data.notes ? `Observações: ${data.notes}

` : ''}

CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico
  `;

  return { subject, html, text };
};

export interface ChadaRequestEmailData {
  itemId: number;
  itemName: string;
  brand: string;
  serialNumber: string;
  problem: string;
  userName: string;
  setor: string;
}

export const generateChadaRequestEmail = (data: ChadaRequestEmailData): { subject: string; html: string; text: string } => {
  const subject = `CHAMADO TÉCNICO CSDT - ${data.itemName} - Serial: ${data.serialNumber}`;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chamado Técnico CHADA</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; }
        .info-badge { background: #dbeafe; color: #1e40af; padding: 10px 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: 600; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
        .info-label { font-weight: 600; color: #374151; }
        .info-value { color: #6b7280; }
        .problem-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
        .problem-box h3 { color: #92400e; margin: 0 0 10px 0; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 5px 0; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 CSDT - Chamado Técnico para CHADA</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Solicitação de Reparo de Equipamento</p>
        </div>

        <div class="content">
            <div class="info-badge">
                📦 NOVO EQUIPAMENTO PARA ANÁLISE
            </div>

            <p>Prezados,</p>

            <p>Encaminhamos equipamento para análise e reparo conforme dados abaixo:</p>

            <div class="info-box">
                <h3 style="margin-top: 0; color: #374151;">🖥️ Dados do Equipamento</h3>
                <div class="info-row">
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">${data.itemName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Marca/Modelo:</span>
                    <span class="info-value">${data.brand}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Número de Série:</span>
                    <span class="info-value" style="font-weight: 600; color: #1e40af;">${data.serialNumber}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ID do Item:</span>
                    <span class="info-value">#${data.itemId}</span>
                </div>
            </div>

            <div class="problem-box">
                <h3>⚠️ Problema Relatado</h3>
                <p style="color: #92400e; margin: 0;">${data.problem}</p>
            </div>

            <div class="info-box">
                <h3 style="margin-top: 0; color: #374151;">📍 Informações de Origem</h3>
                <div class="info-row">
                    <span class="info-label">Setor/Escola:</span>
                    <span class="info-value">${data.setor}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Solicitante:</span>
                    <span class="info-value">${data.userName}</span>
                </div>
            </div>

            <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #1e40af;">
                    <strong>📋 Solicitação:</strong> Por favor, nos encaminhe o número da Ordem de Serviço (OS) referente a este chamado para nosso controle interno.
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico</strong></p>
            <p>Secretaria Municipal de Educação de Duque de Caxias</p>
            <p style="font-size: 12px; color: #9ca3af;">Enviado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </div>
</body>
</html>
  `;

  const text = `
CSDT - CHAMADO TÉCNICO PARA CHADA

Prezados,

Encaminhamos equipamento para análise e reparo:

DADOS DO EQUIPAMENTO:
Tipo: ${data.itemName}
Marca/Modelo: ${data.brand}
Número de Série: ${data.serialNumber}
ID do Item: #${data.itemId}

PROBLEMA RELATADO:
${data.problem}

INFORMAÇÕES DE ORIGEM:
Setor/Escola: ${data.setor}
Solicitante: ${data.userName}

Por favor, nos encaminhe o número da Ordem de Serviço (OS) referente a este chamado para nosso controle interno.

---
CSDT - Coordenação de Suporte de Desenvolvimento e Tecnológico
Secretaria Municipal de Educação de Duque de Caxias
Enviado em ${new Date().toLocaleString('pt-BR')}
  `;

  return { subject, html, text };
};