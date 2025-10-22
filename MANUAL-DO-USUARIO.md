# Manual do Usuário - Sistema CSDT-2

**Plataforma de Gestão Educacional**
Versão 2.0 - 2025

---

## Sumário

1. [Bem-vindo ao CSDT-2](#bem-vindo-ao-csdt-2)
2. [Primeiro Acesso](#primeiro-acesso)
3. [Dashboard - Painel Principal](#dashboard---painel-principal)
4. [Funcionalidades por Módulo](#funcionalidades-por-módulo)
   - [Escolas](#escolas)
   - [Demandas Diárias](#demandas-diárias)
   - [Escalas de Técnicos](#escalas-de-técnicos)
   - [Ordens de Serviço (OS)](#ordens-de-serviço-os)
   - [CHADA - Controle de Consertos](#chada---controle-de-consertos)
   - [Chamados Técnicos](#chamados-técnicos)
   - [Chat Interno](#chat-interno)
   - [Memorandos](#memorandos)
   - [Itens e Equipamentos](#itens-e-equipamentos)
   - [Impressoras](#impressoras)
   - [Estatísticas e Relatórios](#estatísticas-e-relatórios)
5. [Perguntas Frequentes](#perguntas-frequentes)
6. [Suporte](#suporte)

---

## Bem-vindo ao CSDT-2

O **CSDT-2** é uma plataforma completa para gerenciar serviços técnicos em instituições de ensino. O sistema permite:

- Controlar equipamentos e itens das escolas
- Organizar visitas técnicas e escalas
- Gerenciar demandas e chamados
- Criar ordens de serviço
- Acompanhar consertos externos (CHADA)
- Gerar relatórios e estatísticas

---

## Primeiro Acesso

### 1. Acesse o Sistema

1. Abra seu navegador (Chrome, Firefox, Edge)
2. Digite o endereço do sistema
3. Você verá a tela de login

### 2. Faça Login

1. Digite seu **e-mail**
2. Digite sua **senha**
3. Clique em **"Entrar"**

**Atenção**: Se você esqueceu sua senha, entre em contato com o administrador do sistema.

### 3. Entendendo os Perfis de Usuário

O sistema possui diferentes níveis de acesso:

- **ADMTOTAL**: Acesso total ao sistema (Administrador Geral)
- **ADMIN**: Acesso administrativo com algumas restrições
- **TECH**: Técnico - pode visualizar e executar tarefas
- **SCHOOL**: Usuário de escola - acesso limitado às funcionalidades da escola
- **ONLYREAD**: Apenas visualização, sem poder editar

---

## Dashboard - Painel Principal

Ao fazer login, você será direcionado para o **Dashboard** (Painel Principal). Esta é sua central de controle.

### O que você verá:

#### Parte Superior
- **Nome do usuário**: Seu nome aparece no canto superior
- **Notificações**: Alertas de pendências (OS pendentes, demandas, chamados)
- **Favoritos**: Funcionalidades marcadas como favoritas aparecem destacadas

#### Menu de Funcionalidades

O dashboard apresenta cards (cartões) organizados por categoria:

**Gestão de Escolas**
- Escolas
- Demandas Diárias
- Chamados das Escolas

**Ordens de Serviço**
- Nova OS
- Lista de OS
- Confirmar OS
- Arquivo Digital (OS antigas)

**Gestão de Recursos**
- Itens/Equipamentos
- Impressoras
- CHADA (Consertos Externos)
- Memorandos

**Organização**
- Escalas
- Chat Interno
- Estatísticas

#### Como usar o Dashboard:

1. **Buscar funcionalidade**: Use a barra de pesquisa no topo
2. **Favoritar**: Clique na estrela do card para marcar como favorito
3. **Acessar**: Clique no card desejado

---

## Funcionalidades por Módulo

### Escolas

Visualize e gerencie todas as escolas da rede.

#### Como usar:

1. No Dashboard, clique em **"Escolas"**
2. Você verá a lista de todas as escolas

#### Funcionalidades disponíveis:

**Buscar escola**
- Digite o nome na barra de busca
- A lista será filtrada automaticamente

**Visualizar detalhes**
- Clique no card da escola
- Você verá:
  - Endereço completo
  - Diretor(a)
  - Telefone e e-mail
  - Número de alunos
  - Distrito
  - Laboratório de informática (quantidade de itens)

**Abrir no mapa**
- Clique no ícone de localização
- O Google Maps abrirá com o endereço da escola

**Filtros avançados**
- Clique em "Filtros"
- Você pode filtrar por:
  - Distrito
  - Diretor
  - Número de alunos
  - Escolas com/sem laboratório
  - Escolas com/sem anexos

**Modos de visualização**
- **Grade**: Cards lado a lado (padrão)
- **Lista**: Formato de lista detalhado

---

### Demandas Diárias

Gerencie as demandas das escolas para cada dia.

#### O que são demandas?

Demandas são solicitações de serviço das escolas que precisam de atendimento. Exemplo: "Notebook não liga", "Internet sem funcionar", etc.

#### Como usar:

1. No Dashboard, clique em **"Demandas Diárias"**
2. Você verá a tela com:
   - Calendário para selecionar a data
   - Lista de demandas do dia
   - Técnicos alocados (base, visita, folga)

#### Visualizar demandas de outro dia:

1. Clique em uma data no calendário
2. As demandas daquele dia serão exibidas

#### Status das demandas:

As demandas têm cores diferentes:
- **Cinza**: Sem OS criada ainda
- **Amarelo**: OS criada, aguardando assinatura
- **Verde**: OS assinada (concluída)

#### Adicionar nova demanda (apenas ADMIN/ADMTOTAL):

1. Clique em **"Adicionar Demanda"**
2. Selecione a escola
3. Descreva o problema
4. Clique em **"Salvar"**

#### Criar OS a partir de uma demanda:

1. Encontre a demanda na lista
2. Clique em **"Criar OS"**
3. Você será direcionado para o formulário de OS

#### Técnicos do dia:

No topo da página você verá três categorias:
- **Técnicos na Base**: Trabalhando no CSDT
- **Técnicos em Visita**: Visitando escolas
- **Técnicos de Folga**: Não estão trabalhando hoje

---

### Escalas de Técnicos

Organize a escala diária dos técnicos.

#### Como usar:

1. No Dashboard, clique em **"Escalas"**
2. Você verá três colunas:
   - **Base**: Técnicos na sede
   - **Visita**: Técnicos em campo
   - **Folga**: Técnicos de folga

#### Adicionar técnico à escala:

1. Clique em **"Adicionar"** na coluna desejada
2. Selecione o técnico
3. Clique em **"Confirmar"**

#### Mover técnico entre categorias:

1. Arraste o card do técnico para outra coluna
2. Ou clique em **"Mover para..."**

#### Remover técnico:

1. Clique no ícone de lixeira no card do técnico
2. Confirme a remoção

#### Limpar escala do dia:

1. Clique em **"Apagar Escala"**
2. **ATENÇÃO**: Isso apagará TODA a escala do dia atual
3. Confirme a ação

**Dica**: Sempre confira a escala no início do dia!

---

### Ordens de Serviço (OS)

As Ordens de Serviço (OS) são documentos que registram os atendimentos técnicos nas escolas.

#### Criar nova OS:

1. No Dashboard, clique em **"Nova OS"** ou **"Preencher OS"**
2. Preencha o formulário com os dados da visita:

**Informações Gerais**
- Escola
- Data e hora da visita
- Técnico responsável
- Motivo da visita

**Equipamentos Atendidos**
- SIEDUCA (computadores próprios)
- Secretaria (equipamentos administrativos)
- Outros locais
- Marque os equipamentos que foram atendidos

**Internet e Rede**
- Provedor de internet (Rede.br, Internet nas Escolas, etc.)
- Equipamentos de rede (rack, switch, roteador)

**Impressoras**
- Oki, Kyocera, HP, Ricoh, outras
- Informe a quantidade

**Relatório**
- Descreva o problema encontrado
- Descreva a solução aplicada
- Informe se foi solucionado ou não
- Se não foi solucionado, explique o motivo

**Fotos**
- Adicione fotos ANTES do atendimento
- Adicione fotos DEPOIS do atendimento
- **Dica**: Fotos são importantes para comprovar o serviço!

3. Clique em **"Enviar"** para criar a OS

#### Status da OS:

- **Pendente**: OS criada, aguardando assinatura
- **Assinada**: OS assinada pela escola

#### Confirmar/Assinar OS:

1. No Dashboard, clique em **"Confirmar OS"**
2. Você verá a lista de OS pendentes
3. Clique na OS que deseja assinar
4. Preencha:
   - Nome do responsável na escola
   - CPF ou matrícula
5. Assine digitalmente na área indicada
6. Clique em **"Confirmar"**

A OS assinada será arquivada automaticamente.

#### Visualizar OS antigas (Arquivo Digital):

1. No Dashboard, clique em **"Arquivo Digital"** ou **"Lista de OS"**
2. Busque pela escola
3. Clique no card para abrir o PDF da OS

---

### CHADA - Controle de Consertos

CHADA é o sistema para controlar equipamentos enviados para conserto externo.

#### O que é a CHADA?

É o local onde equipamentos (computadores, notebooks, impressoras) são enviados para conserto quando não podem ser reparados no CSDT.

#### Como usar:

1. No Dashboard, clique em **"CHADA"**
2. Você verá quatro abas:
   - **Na CHADA**: Equipamentos enviados e aguardando retorno
   - **Devolvidos**: Equipamentos que já retornaram
   - **Todos**: Todos os equipamentos
   - **Diagnósticos**: Diagnósticos de impressoras

#### Enviar equipamento para CHADA:

1. Clique em **"Enviar para CHADA"**
2. Selecione o item da lista
3. Informe o setor/escola
4. Descreva o problema
5. Clique em **"Adicionar"**

**Importante**: O item precisa estar cadastrado no sistema e estar no CSDT.

#### Acompanhar status do equipamento:

Cada item tem um status:
- **📦 Enviado**: Acabou de ser enviado
- **📥 Recebido**: CHADA confirmou recebimento
- **🔍 Em Análise**: Está sendo analisado
- **✅ Consertado**: Conserto concluído
- **❌ Sem Conserto**: Não tem conserto
- **📤 Devolvido**: Já retornou ao CSDT

#### Atualizar status (apenas ADMIN/ADMTOTAL):

1. Encontre o item na lista
2. Clique em **"Atualizar Status"**
3. Selecione o novo status
4. Adicione observações (ex: "Placa-mãe queimada")
5. Se trocou o modelo ou serial, informe
6. Clique em **"Atualizar Status"**

#### Subir laudo/foto da OS:

1. Encontre o item
2. Clique em **"Subir Laudo"**
3. Selecione as fotos do laudo da CHADA
4. As imagens serão enviadas

#### Ver laudo:

1. Se o item já tem laudo, clique em **"Ver Laudo"**
2. As imagens serão abertas

#### Imprimir OS interna:

1. Clique em **"Imprimir OS"**
2. Um PDF será gerado automaticamente
3. Imprima ou salve o PDF

#### Filtros e busca:

- **Buscar**: Digite marca, serial, problema, etc.
- **Filtrar por setor**: Selecione o setor
- **Filtrar por status**: Selecione o status
- **Ordenar**: Por data de envio, atualização ou setor

#### Alertas importantes:

- **⚠️ Alerta Vermelho**: Item está há mais de 15 dias na CHADA
- **🚨 Alerta Laranja**: Impressora aguardando peça há mais de 3 dias

#### Exportar relatórios:

1. Configure os filtros desejados
2. Clique em **"Exportar CSV"** para planilha Excel
3. Ou clique em **"Exportar PDF"** para documento PDF

#### Diagnósticos de Impressoras:

1. Clique na aba **"Diagnósticos"**
2. Você verá diagnósticos de impressoras

**Cadastrar novo diagnóstico:**
1. Clique em **"Novo Diagnóstico"**
2. Selecione a impressora
3. Selecione o setor
4. Informe o técnico da CHADA
5. Descreva o diagnóstico/laudo
6. Informe a peça solicitada
7. Clique em **"Cadastrar Diagnóstico"**

**Acompanhar diagnóstico:**
- **⏳ Aguardando Peça**: Esperando peça chegar
- **📦 Peça Chegou**: Peça chegou, aguardando instalação
- **✅ Instalado**: Instalado e finalizado
- **❌ Cancelado**: Cancelado

**Atualizar status do diagnóstico:**
1. Clique em **"Peça Chegou"** quando a peça chegar
2. Clique em **"Marcar como Instalado"** quando instalar
3. Ou clique em **"Cancelar"** se necessário

---

### Chamados Técnicos

Sistema para as escolas abrirem chamados quando precisarem de suporte técnico.

#### Como as escolas abrem chamados:

1. A escola acessa o sistema com seu login
2. Clica em **"Novo Chamado"**
3. Preenche:
   - Título (resumo do problema)
   - Descrição detalhada
   - Categoria (Computador, Impressora, Rede, etc.)
   - Equipamentos afetados
   - Fotos (opcional)
4. Clica em **"Enviar Chamado"**

#### Como os técnicos veem os chamados:

1. No Dashboard, você verá o número de **"Chamados Abertos"**
2. Clique para ver a lista
3. Chamados aparecem com cores:
   - **Azul**: Aberto (ninguém pegou ainda)
   - **Amarelo**: Aceito (alguém já pegou)
   - **Verde**: Agendado (tem data marcada)
   - **Roxo**: Em andamento
   - **Verde escuro**: Resolvido

#### Aceitar um chamado:

1. Clique no chamado
2. Clique em **"Aceitar Chamado"**
3. O chamado agora é seu!

#### Definir prioridade:

1. Abra o chamado
2. Selecione a prioridade:
   - Baixa
   - Média
   - Alta
   - Urgente

#### Agendar visita:

1. Abra o chamado aceito
2. Clique em **"Agendar Visita"**
3. Selecione data e hora
4. O agendamento vai para o calendário

#### Comentar no chamado:

1. Abra o chamado
2. Digite seu comentário na caixa
3. Marque se é **comentário interno** (só técnicos veem)
4. Clique em **"Enviar"**

#### Resolver chamado:

1. Após resolver o problema
2. Clique em **"Marcar como Resolvido"**
3. Adicione observações finais
4. Clique em **"Confirmar"**

#### Fechar chamado:

1. Com o chamado resolvido
2. Clique em **"Fechar Chamado"**
3. O chamado será arquivado

---

### Chat Interno

Sistema de comunicação entre setores do prédio e técnicos.

#### Como funciona:

Os setores do prédio (Biblioteca, Secretaria, etc.) podem abrir chamados internos e conversar com os técnicos em tempo real.

#### Para setores:

1. Acesse **"Chat Interno"**
2. Clique em **"Novo Chamado"**
3. Preencha:
   - Título
   - Descrição do problema
   - Categoria
   - Prioridade
4. Clique em **"Abrir Chamado"**

#### Para técnicos:

1. Acesse **"Chat Interno"**
2. Você verá todos os chamados abertos
3. Clique em um chamado para ver detalhes
4. Clique em **"Aceitar"** para pegar o chamado

#### Conversar no chat:

1. Abra o chamado
2. Digite sua mensagem
3. Você pode enviar:
   - Texto
   - Fotos
   - Arquivos
4. Clique em **"Enviar"**

As mensagens aparecem em tempo real!

#### Encerrar chamado interno:

1. Após resolver
2. Clique em **"Resolver"**
3. Confirme a resolução
4. O setor pode fechar definitivamente

---

### Memorandos

Crie memorandos para entrega ou troca de equipamentos.

#### Tipos de memorando:

- **Entrega**: Entregar equipamentos para uma escola
- **Troca**: Trocar equipamentos entre escolas

#### Criar memorando de entrega:

1. No Dashboard, clique em **"Memorandos"** ou **"Novos Memorandos"**
2. Clique em **"Novo Memorando de Entrega"**
3. Selecione a escola destino
4. Adicione os itens:
   - Clique em **"Adicionar Item"**
   - Selecione o item
   - Repita para adicionar mais itens
5. Clique em **"Gerar Memorando"**
6. O PDF será gerado automaticamente

O memorando terá um número único automático (ex: 001/2025).

#### Criar memorando de troca:

1. Clique em **"Novo Memorando de Troca"**
2. Selecione escola de origem
3. Selecione escola de destino
4. Adicione os itens
5. Clique em **"Gerar Memorando"**

#### Visualizar memorandos anteriores:

1. Na tela de memorandos
2. Você verá a lista de memorandos criados
3. Clique para visualizar ou reimprimir

---

### Itens e Equipamentos

Controle todos os equipamentos da rede.

#### Como usar:

1. No Dashboard, clique em **"Itens"** ou **"Lista de Itens"**
2. Você verá todos os itens cadastrados

#### Adicionar novo item:

1. Clique em **"Adicionar Item"**
2. Preencha:
   - Nome do item (ex: "Notebook Dell")
   - Marca (ex: "Dell")
   - Número de série
   - Escola atual (ou CSDT)
   - Status
3. Clique em **"Salvar"**

#### Status dos itens:

- **DISPONIVEL**: No CSDT, disponível para uso
- **EM_USO**: Em uso em alguma escola
- **MANUTENCAO**: Em manutenção
- **CHADA**: Enviado para CHADA
- **BAIXADO**: Item foi dado baixa

#### Buscar item:

- Digite na barra de busca:
  - Nome
  - Marca
  - Número de série

#### Movimentar item entre escolas:

1. Encontre o item
2. Clique em **"Editar"**
3. Altere a escola
4. Clique em **"Salvar"**

**Importante**: Para movimentações oficiais, use Memorandos!

#### Ver histórico do item:

1. Clique no item
2. Clique em **"Ver Histórico"**
3. Você verá todas as movimentações:
   - Data
   - De onde saiu
   - Para onde foi
   - Quem fez a movimentação

#### Filtrar itens:

- Por escola
- Por status
- Por tipo

---

### Impressoras

Cadastro e controle de impressoras da rede.

#### Como usar:

1. No Dashboard, clique em **"Impressoras"**
2. Você verá todas as impressoras cadastradas

#### Informações das impressoras:

- **Sigla**: Ex: "SED" para Secretaria de Educação
- **Setor**: Onde está localizada
- **Modelo**: Modelo da impressora
- **Fabricante**: Marca (Kyocera, HP, etc.)
- **Serial**: Número de série
- **IP**: Endereço IP na rede

#### Adicionar nova impressora:

1. Clique em **"Adicionar Impressora"**
2. Preencha todos os campos
3. Clique em **"Salvar"**

#### Buscar impressora:

- Por modelo
- Por setor
- Por serial
- Por IP

#### Editar impressora:

1. Encontre a impressora
2. Clique em **"Editar"**
3. Altere os dados necessários
4. Clique em **"Salvar"**

**Dica**: As impressoras aparecem também na seção de Diagnósticos da CHADA!

---

### Estatísticas e Relatórios

Visualize dados e gráficos do sistema.

#### Como usar:

1. No Dashboard, clique em **"Estatísticas"** ou **"Estatísticas Avançadas"**
2. Você verá diversos gráficos e indicadores

#### O que você pode ver:

**Geral**
- Total de OS criadas
- OS pendentes de assinatura
- Demandas em aberto
- Chamados ativos

**Por Período**
- Filtrar por data
- Ver evolução ao longo do tempo

**Por Escola**
- Escolas mais atendidas
- Escolas com mais problemas
- Escolas sem atendimento

**Por Técnico**
- Produtividade dos técnicos
- OS criadas por técnico
- Chamados resolvidos

**Equipamentos**
- Itens por escola
- Itens em manutenção
- Itens na CHADA

**Gráficos disponíveis**
- Gráficos de barra
- Gráficos de pizza
- Linhas de tendência
- Mapas de calor

#### Exportar dados:

1. Configure os filtros
2. Clique em **"Exportar"**
3. Escolha o formato:
   - PDF
   - Excel
   - CSV

---

## Perguntas Frequentes

### Login e Acesso

**P: Esqueci minha senha. O que faço?**
R: Entre em contato com o administrador do sistema.

**P: Não consigo fazer login. O que pode ser?**
R: Verifique se seu e-mail e senha estão corretos. Se o problema persistir, limpe o cache do navegador ou tente em modo anônimo.

**P: Posso acessar de qualquer lugar?**
R: Sim, desde que tenha acesso à internet e as credenciais corretas.

---

### Demandas e OS

**P: Como sei se uma demanda já virou OS?**
R: A demanda ficará amarela (OS criada) ou verde (OS assinada).

**P: Posso criar OS sem ter demanda?**
R: Sim! Você pode criar OS diretamente pelo menu "Nova OS".

**P: Perdi as fotos de uma OS. E agora?**
R: As fotos ficam salvas no sistema. Você pode visualizar a OS no "Arquivo Digital".

**P: Como faço para assinar uma OS?**
R: Vá em "Confirmar OS", selecione a OS, preencha os dados e assine com o dedo ou mouse na área indicada.

---

### CHADA

**P: Posso enviar qualquer item para CHADA?**
R: Não. O item precisa estar cadastrado no sistema e localizado no CSDT.

**P: O que significa "Item não está no CSDT"?**
R: Significa que o item ainda não foi trazido para o CSDT. É necessário fazer um memorando primeiro (consulte Aurélio).

**P: Como sei há quanto tempo um item está na CHADA?**
R: O sistema mostra automaticamente os dias. Itens com mais de 15 dias aparecem com alerta vermelho.

**P: Posso cancelar um envio para CHADA?**
R: Entre em contato com o administrador do sistema.

---

### Chamados

**P: Quem pode abrir chamados?**
R: As escolas (perfil SCHOOL) e os setores internos podem abrir chamados.

**P: Posso reabrir um chamado fechado?**
R: Não diretamente. É necessário abrir um novo chamado.

**P: Como sei se meu chamado foi atendido?**
R: Você receberá notificações e pode acompanhar o status no sistema.

**P: Posso anexar fotos no chamado?**
R: Sim! Na criação do chamado ou nos comentários.

---

### Itens e Equipamentos

**P: Como faço para transferir um equipamento entre escolas?**
R: O ideal é criar um Memorando de Troca. Isso gera o documento oficial e atualiza o sistema automaticamente.

**P: Posso deletar um item?**
R: Apenas administradores podem deletar itens. Normalmente se usa o status "BAIXADO" ao invés de deletar.

**P: Como rastrear onde está um equipamento?**
R: Use a busca e veja o histórico do item. Lá aparece todas as movimentações.

---

### Escalas

**P: Preciso atualizar a escala todos os dias?**
R: Sim! A escala deve ser feita diariamente.

**P: O que acontece se eu apagar a escala por engano?**
R: Você precisará refazer a escala do dia. Por isso sempre confirme antes de apagar.

**P: Posso ver a escala de outros dias?**
R: Apenas do dia atual. Para histórico, verifique com o administrador.

---

## Dicas e Boas Práticas

### Para todos os usuários:

1. **Tire fotos sempre**: Fotos são essenciais para comprovação
2. **Seja descritivo**: Quanto mais detalhes, melhor
3. **Atualize status**: Mantenha as informações atualizadas
4. **Use os filtros**: Facilita encontrar o que precisa
5. **Marque favoritos**: Cards favoritos aparecem primeiro
6. **Confira antes de enviar**: Verifique os dados antes de salvar

### Para técnicos:

1. **Atualize a escala diariamente**
2. **Crie OS assim que atender a escola**
3. **Tire fotos antes e depois do atendimento**
4. **Responda os chamados rapidamente**
5. **Atualize status dos equipamentos na CHADA**

### Para escolas:

1. **Abra chamados com o máximo de detalhes**
2. **Tire fotos do problema**
3. **Acompanhe o status do seu chamado**
4. **Confirme quando o problema for resolvido**

---

## Suporte

### Precisa de ajuda?

**Dúvidas técnicas sobre o sistema:**
Entre em contato com a equipe do CSDT

**Problemas de acesso:**
Fale com o administrador do sistema

**Sugestões de melhorias:**
Sua opinião é importante! Entre em contato com a equipe de desenvolvimento

---

## Atalhos Úteis

| Ação | Como fazer |
|------|------------|
| Voltar ao Dashboard | Clique no logo CSDT no topo |
| Buscar funcionalidade | Use a barra de busca no Dashboard |
| Atualizar página | F5 ou Ctrl+R |
| Abrir em nova aba | Ctrl+Clique no card |
| Imprimir | Ctrl+P |

---

## Glossário

**OS**: Ordem de Serviço - documento que registra o atendimento técnico

**CHADA**: Local externo onde equipamentos são enviados para conserto

**Dashboard**: Painel principal do sistema

**Card**: Cartão/botão que representa uma funcionalidade

**CSDT**: Centro de Suporte e Desenvolvimento Tecnológico

**SIEDUCA**: Sistema Integrado de Educação - equipamentos do programa estadual

**Serial**: Número de série único do equipamento

**Status**: Estado/situação atual (pendente, concluído, etc.)

**Técnico**: Profissional que faz os atendimentos nas escolas

**Demanda**: Solicitação de atendimento técnico

**Memorando**: Documento oficial de transferência de equipamentos

**Escala**: Organização diária dos técnicos (base, visita, folga)

---

**Sistema CSDT-2 - Versão 2.0**
*Desenvolvido para facilitar a gestão de serviços técnicos educacionais*

---

© 2025 CSDT - Todos os direitos reservados
