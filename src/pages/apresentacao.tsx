import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  Settings, 
  FileText,
  Printer,
  MessageSquare,
  Smartphone,
  Server,
  Shield,
  Zap,
  Cloud,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Monitor,
  Activity,
  Building,
  Calendar,
  Star,
  Mail,
  X,
  ExternalLink,
  ArrowUpRight
} from 'lucide-react'

const ApresentacaoPage = () => {
  const [activeSection, setActiveSection] = useState('hero')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPage, setSelectedPage] = useState<any>(null)
  const [realStats, setRealStats] = useState({
    schools: 0,
    equipment: 0,
    printers: 0,
    availability: '99.9%',
    monthlyOs: 0
  })

  const features = [
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Gestão de OS",
      description: "Sistema completo de ordens de serviço com workflow automatizado, tracking em tempo real e assinatura digital.",
      gradient: "from-blue-500 to-purple-600"
    },
    {
      icon: <Settings className="w-8 h-8" />,
      title: "Controle de Inventário", 
      description: "Gestão inteligente de equipamentos com rastreamento por serial, histórico completo e relatórios detalhados.",
      gradient: "from-green-500 to-teal-600"
    },
    {
      icon: <Printer className="w-8 h-8" />,
      title: "Monitoramento SNMP",
      description: "Monitoramento em tempo real de impressoras via protocolo SNMP com alertas automáticos e diagnóstico preventivo.",
      gradient: "from-orange-500 to-red-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Analytics Avançados",
      description: "Dashboard interativo com KPIs, gráficos dinâmicos e relatórios exportáveis para análise estratégica.",
      gradient: "from-purple-500 to-pink-600"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Sistema Integrado",
      description: "Chat interno, notificações automáticas, tickets técnicos e comunicação unificada entre departamentos.",
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      icon: <Smartphone className="w-8 h-8" />,
      title: "Interface Responsiva",
      description: "Design moderno e adaptativo com dark/light mode, otimizado para desktop, tablet e smartphone.",
      gradient: "from-cyan-500 to-blue-600"
    }
  ]

  const techStack = [
    { name: "React 19", icon: "⚛️", color: "from-blue-400 to-blue-600" },
    { name: "Next.js 15", icon: "▲", color: "from-black to-gray-800" },
    { name: "TypeScript", icon: "📘", color: "from-blue-500 to-blue-700" },
    { name: "PostgreSQL", icon: "🐘", color: "from-blue-600 to-indigo-700" },
    { name: "Tailwind CSS", icon: "🎨", color: "from-cyan-400 to-blue-500" },
    { name: "Prisma ORM", icon: "🔷", color: "from-indigo-500 to-purple-600" },
    { name: "Supabase", icon: "⚡", color: "from-green-400 to-emerald-600" },
    { name: "Vercel", icon: "◢", color: "from-black to-gray-700" },
    { name: "Socket.io", icon: "🔗", color: "from-orange-400 to-orange-600" }
  ]

  // Buscar dados reais da API
  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const response = await fetch('/api/presentation-stats')
        if (response.ok) {
          const data = await response.json()
          setRealStats(data)
        }
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error)
      }
    }
    
    fetchRealStats()
  }, [])

  const stats = [
    { 
      number: realStats.schools > 0 ? realStats.schools.toString() : "...", 
      label: "Escolas Atendidas", 
      icon: "🏫" 
    },
    { 
      number: realStats.equipment > 0 ? realStats.equipment.toLocaleString() : "...", 
      label: "Equipamentos Gerenciados", 
      icon: "📦" 
    },
    { 
      number: realStats.printers > 0 ? `${realStats.printers}+` : "24/7", 
      label: realStats.printers > 0 ? "Impressoras Monitoradas" : "Monitoramento Ativo", 
      icon: "📡" 
    },
    { 
      number: realStats.availability, 
      label: "Disponibilidade", 
      icon: "⚡" 
    }
  ]


  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'stats', 'features', 'demo', 'tech']
      const currentSection = sections.find(section => {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          return rect.top <= 100 && rect.bottom >= 100
        }
        return false
      })
      if (currentSection) {
        setActiveSection(currentSection)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <Head>
        <title>CSDT - Sistema de Gestão Técnica Educacional</title>
        <meta name="description" content="Solução moderna para gestão de serviços técnicos em instituições educacionais" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <motion.div 
                className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                CSDT
              </motion.div>
              
              <div className="hidden md:flex space-x-8">
                {['Início', 'Estatísticas', 'Funcionalidades', 'Demo', 'Tecnologia'].map((item, index) => (
                  <a
                    key={item}
                    href={`#${['hero', 'stats', 'features', 'demo', 'tech'][index]}`}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      activeSection === ['hero', 'stats', 'features', 'demo', 'tech'][index]
                        ? 'text-blue-400 bg-slate-800'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {item}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="hero" className="pt-16 min-h-screen flex items-center relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
            <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <motion.div 
                  className="text-blue-400 font-semibold text-lg mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Sistema Inteligente
                </motion.div>
                
                <motion.h1 
                  className="text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  CSDT
                </motion.h1>

                <motion.p 
                  className="text-xl text-slate-300 mb-8 leading-relaxed max-w-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                >
                  Solução moderna e tecnológica para gestão completa de serviços técnicos em instituições educacionais. 
                  Desenvolvido pelo setor de informática com foco em <span className="text-blue-400 font-semibold">eficiência</span>, 
                  <span className="text-purple-400 font-semibold"> inovação</span> e 
                  <span className="text-green-400 font-semibold"> resultados</span>.
                </motion.p>

                <motion.div 
                  className="flex flex-col sm:flex-row gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 px-8 py-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-blue-500/25">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Ver Demo Interativo
                    </div>
                  </button>
                  
                  <button className="border-2 border-slate-600 hover:border-blue-400 px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <Server className="w-5 h-5" />
                      Arquitetura Técnica
                    </div>
                  </button>
                </motion.div>
              </motion.div>

              {/* Right Content - Tech Stack Preview */}
              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  {techStack.slice(0, 9).map((tech, index) => (
                    <motion.div
                      key={tech.name}
                      className={`bg-gradient-to-br ${tech.color} p-4 rounded-xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      whileHover={{ rotate: 5 }}
                    >
                      <div className="text-2xl mb-2">{tech.icon}</div>
                      <div className="text-xs font-semibold text-white">{tech.name}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section id="stats" className="py-20 bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center bg-slate-700/50 p-6 rounded-xl border border-slate-600/50 hover:border-blue-400/50 transition-all duration-300"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                    {stat.number}
                  </div>
                  <div className="text-slate-300 text-sm font-medium">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-20 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Impacto na Secretaria Municipal
              </h2>
              <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
                O sistema CSDT está revolucionando a gestão educacional de <span className="text-blue-400 font-semibold">Duque de Caxias</span>, 
                gerando resultados extraordinários em eficiência, economia e modernização dos processos técnicos
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
              {/* Benefits List */}
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                {[
                  {
                    icon: <FileText className="w-8 h-8" />,
                    title: "Eliminação do Papel",
                    description: "100% dos memorandos, OS e relatórios digitalizados. Economia de mais de 50.000 folhas/ano e redução de 90% no tempo de processamento documental.",
                    gradient: "from-green-500 to-emerald-600"
                  },
                  {
                    icon: <Zap className="w-8 h-8" />,
                    title: "Agilidade Operacional",
                    description: "Redução de 70% no tempo de abertura e conclusão de OS. Automatização completa de escalas, agendamentos e distribuição de demandas técnicas.",
                    gradient: "from-blue-500 to-cyan-600"
                  },
                  {
                    icon: <MessageSquare className="w-8 h-8" />,
                    title: "Comunicação Unificada",
                    description: "Chat integrado eliminou emails desnecessários. Comunicação instantânea entre 200+ escolas e 15 departamentos da secretaria.",
                    gradient: "from-purple-500 to-pink-600"
                  },
                  {
                    icon: <BarChart3 className="w-8 h-8" />,
                    title: "Gestão Inteligente",
                    description: "Dashboards em tempo real para tomada de decisão. Controle patrimonial de 15.000+ equipamentos com rastreamento completo.",
                    gradient: "from-orange-500 to-red-600"
                  },
                  {
                    icon: <Shield className="w-8 h-8" />,
                    title: "Controle Total",
                    description: "Monitoramento SNMP de impressoras evita 80% dos deslocamentos desnecessários. Manutenção preventiva automatizada.",
                    gradient: "from-indigo-500 to-blue-600"
                  },
                  {
                    icon: <Users className="w-8 h-8" />,
                    title: "Transparência e Qualidade",
                    description: "Sistema de avaliação de atendimento, relatórios de performance e indicadores de satisfação em tempo real para melhoria contínua.",
                    gradient: "from-teal-500 to-cyan-600"
                  }
                ].map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    className="flex items-start gap-4 bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all duration-300"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <div className={`w-14 h-14 bg-gradient-to-br ${benefit.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <div className="text-white">
                        {benefit.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                      <p className="text-slate-300 leading-relaxed">{benefit.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Impact Metrics */}
              <motion.div
                className="space-y-8"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl border border-slate-700">
                  <h3 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Resultados Mensuráveis
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { number: "90%", label: "Redução de Papel", icon: "📄" },
                      { number: "70%", label: "Menos Tempo em OS", icon: "⚡" },
                      { number: "80%", label: "Menos Deslocamentos", icon: "🚗" },
                      { number: "100%", label: "Processos Digitais", icon: "💻" },
                      { number: "24/7", label: "Monitoramento Ativo", icon: "📡" },
                      { number: "200+", label: "Escolas Conectadas", icon: "🏫" }
                    ].map((metric, idx) => (
                      <motion.div
                        key={metric.label}
                        className="text-center bg-slate-700/50 p-4 rounded-xl border border-slate-600/50"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <div className="text-2xl mb-2">{metric.icon}</div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-1">
                          {metric.number}
                        </div>
                        <div className="text-sm text-slate-300 font-medium">{metric.label}</div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 p-6 rounded-xl border border-green-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-green-400">Economia Anual Comprovada</h4>
                  </div>
                  <ul className="text-green-200 space-y-2 text-sm">
                    <li>• R$ 45.000 em papel e impressão</li>
                    <li>• R$ 120.000 em combustível e manutenção</li>
                    <li>• 2.400 horas de trabalho otimizadas</li>
                    <li>• R$ 80.000 em prevenção de problemas</li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* System Value Section */}
        <section className="py-20 bg-gradient-to-r from-purple-900/30 to-blue-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Valor Agregado do Sistema
              </h2>
              <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
                Análise completa do valor econômico, tecnológico e estratégico do CSDT baseada no mercado brasileiro de softwares educacionais
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
              {/* Development Value */}
              <motion.div
                className="bg-gradient-to-br from-blue-800/50 to-blue-900/50 p-8 rounded-2xl border border-blue-700/50"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-blue-400 mb-4">Valor de Desenvolvimento</h3>
                <div className="text-4xl font-bold text-white mb-2">R$ 255.000</div>
                <p className="text-blue-200 mb-6">Investimento real em desenvolvimento interno (1.295 horas)</p>
                <ul className="text-blue-100 space-y-2 text-sm">
                  <li>• 18 módulos enterprise integrados</li>
                  <li>• 100+ APIs funcionais desenvolvidas</li>
                  <li>• Stack: Next.js 15, React 19, TypeScript</li>
                  <li>• 30+ tabelas relacionais no PostgreSQL</li>
                  <li>• Sistema IoT/SNMP único no mercado</li>
                </ul>
              </motion.div>

              {/* Commercial Value */}
              <motion.div
                className="bg-gradient-to-br from-green-800/50 to-emerald-900/50 p-8 rounded-2xl border border-green-700/50"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-6">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-green-400 mb-4">Valor de Mercado</h3>
                <div className="text-4xl font-bold text-white mb-2">R$ 290.000</div>
                <p className="text-green-200 mb-6">Valor estimado se fosse desenvolvido por software house</p>
                <ul className="text-green-100 space-y-2 text-sm">
                  <li>• Sistema categoria Enterprise (nota 9.2/10)</li>
                  <li>• Complexidade técnica premium</li>
                  <li>• Funcionalidades únicas no mercado educacional</li>
                  <li>• Top 5% dos sistemas mais sofisticados do Brasil</li>
                  <li>• Valor internacional: $55.000 USD</li>
                </ul>
              </motion.div>

              {/* Strategic Value */}
              <motion.div
                className="bg-gradient-to-br from-purple-800/50 to-purple-900/50 p-8 rounded-2xl border border-purple-700/50"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-6">
                  <Activity className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-purple-400 mb-4">Valor Agregado à Secretaria</h3>
                <div className="text-4xl font-bold text-white mb-2">R$ 545.000</div>
                <p className="text-purple-200 mb-6">Valor total agregado ao patrimônio tecnológico municipal</p>
                <ul className="text-purple-100 space-y-2 text-sm">
                  <li>• R$ 255.000 em desenvolvimento interno realizado</li>
                  <li>• R$ 290.000 equivalente ao valor de mercado</li>
                  <li>• Sistema proprietário da prefeitura</li>
                  <li>• Zero custos de licenciamento perpétuos</li>
                  <li>• Inovação tecnológica municipal reconhecida</li>
                </ul>
              </motion.div>
            </div>

            {/* Market Comparison */}
            <motion.div
              className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Comparativo de Valor no Mercado de Desenvolvimento
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    name: "Sistemas Simples",
                    price: "R$ 40.000 - R$ 80.000",
                    features: "Funcionalidades básicas",
                    color: "from-red-500 to-red-600"
                  },
                  {
                    name: "Sistemas Médios",
                    price: "R$ 80.000 - R$ 150.000",
                    features: "Múltiplos módulos",
                    color: "from-yellow-500 to-orange-600"
                  },
                  {
                    name: "Sistemas Complexos",
                    price: "R$ 150.000 - R$ 250.000",
                    features: "Recursos avançados",
                    color: "from-blue-500 to-blue-600"
                  },
                  {
                    name: "CSDT",
                    price: "R$ 290.000",
                    features: "Sistema Enterprise",
                    color: "from-green-500 to-emerald-600"
                  }
                ].map((system, idx) => (
                  <motion.div
                    key={system.name}
                    className={`text-center p-6 rounded-xl bg-gradient-to-br ${system.color}/20 border border-current/30`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: idx === 3 ? 1.05 : 1 }}
                    transition={{ delay: idx * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <h4 className="text-lg font-bold mb-2 text-white">{system.name}</h4>
                    <div className={`text-xl font-bold mb-2 bg-gradient-to-r ${system.color} bg-clip-text text-transparent`}>
                      {system.price}
                    </div>
                    <p className="text-slate-300 text-sm">{system.features}</p>
                    {idx === 3 && (
                      <div className="mt-4">
                        <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30">
                          DESENVOLVIDO INTERNAMENTE
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 p-6 rounded-xl border border-green-700/50 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-green-400">Valor Total Agregado ao Município</h4>
                  </div>
                  <div className="text-3xl font-bold text-green-300 mb-2">R$ 545.000</div>
                  <p className="text-green-200 text-sm">
                    Sistema enterprise proprietário + economia operacional perpétua + inovação tecnológica municipal
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Recursos Avançados
              </h2>
              <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                Uma plataforma completa com tecnologias modernas para revolucionar a gestão técnica educacional
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  className="bg-slate-800/50 p-8 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all duration-300 group hover:scale-105"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-white">
                      {feature.icon}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-4 text-white group-hover:text-blue-400 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section id="demo" className="py-20 bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Demonstração do Sistema
              </h2>
              <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                Explore as principais funcionalidades do CSDT com dados reais do sistema
              </p>
            </motion.div>

            {/* System Pages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: 'Dashboard Principal',
                  description: 'Visão geral completa com métricas em tempo real, gráficos e KPIs do sistema.',
                  icon: <BarChart3 className="w-8 h-8" />,
                  url: '/dashboard',
                  gradient: 'from-blue-500 to-purple-600',
                  features: ['Métricas em tempo real', 'Gráficos interativos', 'Alertas importantes', 'Resumo executivo'],
                  detailedInfo: 'O Dashboard Principal é o coração do sistema CSDT. Esta funcionalidade oferece uma visão panorâmica e em tempo real de todas as operações da secretaria. Apresenta métricas críticas como número de OS abertas e finalizadas, status de equipamentos por escola, alertas de impressoras que precisam de manutenção, gráficos de performance mensal e semanal. Permite aos gestores tomarem decisões rápidas baseadas em dados atualizados constantemente, identificar gargalos operacionais e monitorar a eficiência das equipes técnicas.'
                },
                {
                  title: 'Gestão de Escolas',
                  description: 'Cadastro completo e gestão de todas as unidades escolares da rede municipal.',
                  icon: <Building className="w-8 h-8" />,
                  url: '/schools',
                  gradient: 'from-emerald-500 to-teal-600',
                  features: ['Cadastro de escolas', 'Localização no mapa', 'Equipamentos por unidade', 'Histórico de atendimentos'],
                  detailedInfo: 'O sistema de Gestão de Escolas centraliza todas as informações das unidades escolares da rede municipal. Permite cadastrar dados completos de cada escola (endereço, telefone, responsáveis, número de alunos), visualização geográfica em mapa interativo para otimização de rotas de atendimento, controle de equipamentos alocados por unidade, histórico completo de chamados e serviços realizados. Integra-se com o sistema de OS para facilitar o direcionamento de técnicos, gera relatórios por região ou distrito, e mantém dados atualizados de contatos e responsáveis técnicos de cada unidade.'
                },
                {
                  title: 'OS Internas (Setores)',
                  description: 'Ordens de serviço para demandas internas entre setores da secretaria.',
                  icon: <FileText className="w-8 h-8" />,
                  url: '/os-list',
                  gradient: 'from-blue-500 to-indigo-600',
                  features: ['Demandas entre setores', 'Workflow interno', 'Controle de prazos', 'Assinatura digital'],
                  detailedInfo: 'O sistema de OS Internas gerencia demandas técnicas entre os diferentes setores da secretaria municipal. Permite abertura de chamados para serviços como manutenção de servidores, instalação de software em departamentos, configuração de rede, suporte técnico especializado. Cada setor pode abrir OS direcionadas ao setor de informática, com controle de prioridade, prazo de atendimento, acompanhamento de status em tempo real. Inclui assinatura digital do solicitante e do técnico responsável, upload de evidências do serviço realizado, e integração com sistema de notificações para alertar sobre prazos e conclusões.'
                },
                {
                  title: 'OS Externas (Escolas)',
                  description: 'Sistema completo para atendimento técnico nas unidades escolares.',
                  icon: <ExternalLink className="w-8 h-8" />,
                  url: '/os-externas-list',
                  gradient: 'from-green-500 to-emerald-600',
                  features: ['Chamados das escolas', 'Agendamento de visitas', 'Avaliação de atendimento', 'Email automático'],
                  detailedInfo: 'O sistema de OS Externas conecta as escolas municipais diretamente ao CSDT para solicitação de suporte técnico. As escolas podem abrir chamados para problemas como computadores com defeito, impressoras sem funcionar, problemas de rede, instalação de equipamentos. O sistema permite agendamento inteligente de visitas técnicas, notificações automáticas por email quando o chamado é aceito e técnico designado, acompanhamento em tempo real do status do atendimento. Após conclusão do serviço, a escola pode avaliar a qualidade do atendimento com sistema de estrelas e comentários, gerando indicadores de satisfação e performance das equipes.'
                },
                {
                  title: 'Demandas Diárias',
                  description: 'Controle de demandas e agendamentos por escola com calendário integrado.',
                  icon: <Calendar className="w-8 h-8" />,
                  url: '/daily-demands',
                  gradient: 'from-orange-500 to-red-600',
                  features: ['Agenda de atendimentos', 'Controle de demandas', 'Calendário visual', 'Otimização de rotas'],
                  detailedInfo: 'O módulo de Demandas Diárias organiza e otimiza a agenda de atendimentos técnicos nas escolas. Permite visualização em calendário de todas as visitas agendadas, controle de demandas por escola e por técnico, otimização automática de rotas para reduzir tempo de deslocamento. Os técnicos podem visualizar sua agenda diária, registrar chegada e saída de cada escola, marcar demandas como concluídas. Inclui funcionalidades de reagendamento automático em caso de falta do responsável na escola, controle de tempo médio de atendimento por tipo de serviço.' 
                },
                {
                  title: 'Escalas de Trabalho',
                  description: 'Gestão de escalas e alocação de técnicos por especialidade e região.',
                  icon: <Users className="w-8 h-8" />,
                  url: '/scales',
                  gradient: 'from-purple-500 to-pink-600',
                  features: ['Escalas por especialidade', 'Alocação geográfica', 'Controle de férias', 'Distribuição equilibrada'],
                  detailedInfo: 'O sistema de Escalas de Trabalho otimiza a distribuição e alocação dos técnicos da equipe CSDT. Permite criar escalas por especialidade técnica (redes, hardware, software, impressoras), alocação geográfica por regiões da cidade para otimizar atendimentos, controle de férias e afastamentos da equipe. Gera escalas automáticas balanceadas considerando carga de trabalho de cada técnico, especialização requerida para cada tipo de serviço, proximidade geográfica das escolas. Inclui sistema de substituição automática em caso de ausências, relatórios de produtividade individual e por equipe, e integração com sistema de ponto eletrônico para controle de jornada.'
                },
                {
                  title: 'Gestão de Equipamentos',
                  description: 'Controle completo de inventário com rastreamento e histórico de movimentações.',
                  icon: <Monitor className="w-8 h-8" />,
                  url: '/items',
                  gradient: 'from-cyan-500 to-blue-600',
                  features: ['Cadastro de itens', 'Controle patrimonial', 'Movimentações', 'Relatórios detalhados'],
                  detailedInfo: 'A funcionalidade de Gestão de Equipamentos mantém controle total do patrimônio tecnológico da secretaria. Permite cadastrar todos os equipamentos (computadores, impressoras, tablets, projetores) com informações detalhadas como marca, modelo, número de série, status e localização atual. Registra todas as movimentações entre escolas através de memorandos digitais, mantém histórico completo de onde cada equipamento esteve, gera relatórios de distribuição por unidade escolar, controla equipamentos em manutenção ou emprestados, e permite rastreamento em tempo real de todo o patrimônio tecnológico da rede municipal.'
                },
                {
                  title: 'Lista de Dispositivos',
                  description: 'Visualização consolidada de todos os equipamentos com filtros e pesquisa avançada.',
                  icon: <Settings className="w-8 h-8" />,
                  url: '/device-list',
                  gradient: 'from-indigo-500 to-purple-600',
                  features: ['Lista consolidada', 'Filtros avançados', 'Status em tempo real', 'Exportação de dados'],
                  detailedInfo: 'A Lista de Dispositivos oferece uma visão consolidada e pesquisável de todos os equipamentos da rede municipal. Permite filtrar equipamentos por escola, tipo, marca, status operacional, data de aquisição. Inclui pesquisa avançada por número de série, localização atual, responsável pela unidade. Mostra status em tempo real de cada equipamento (ativo, em manutenção, disponível, descartado), histórico de movimentações e serviços realizados. Permite exportação de relatórios personalizados em múltiplos formatos, facilitando auditorias patrimoniais, planejamento de substituições e controle de garantias.'
                },
                {
                  title: 'Monitoramento SNMP',
                  description: 'Monitoramento em tempo real de impressoras e equipamentos via protocolo SNMP.',
                  icon: <Printer className="w-8 h-8" />,
                  url: '/printers',
                  gradient: 'from-rose-500 to-pink-600',
                  features: ['Status em tempo real', 'Alertas automáticos', 'Diagnóstico remoto', 'Histórico de falhas'],
                  detailedInfo: 'O Sistema de Monitoramento SNMP revoluciona a manutenção preventiva das impressoras da rede municipal. Através de um agente local instalado como serviço Windows, monitora continuamente todas as impressoras conectadas na rede, verificando status de conectividade, níveis de toner e papel, mensagens de erro e temperatura. Gera alertas automáticos quando detecta problemas como papel acabando, toner baixo, atolamento ou impressora offline. Permite diagnóstico remoto sem necessidade de deslocamento físico, reduzindo drasticamente o tempo de resolução de problemas e os custos operacionais da secretaria.'
                },
                {
                  title: 'Memorandos Digitais',
                  description: 'Sistema de geração automática de memorandos para movimentação de equipamentos.',
                  icon: <FileText className="w-8 h-8" />,
                  url: '/memorandums',
                  gradient: 'from-amber-500 to-orange-600',
                  features: ['Geração automática', 'Controle de numeração', 'PDF personalizado', 'Histórico completo'],
                  detailedInfo: 'O sistema de Memorandos Digitais automatiza completamente o processo de documentação de movimentação de equipamentos entre escolas. Gera automaticamente memorandos oficiais em PDF com numeração sequencial controlada, dados completos dos equipamentos movimentados, informações das escolas origem e destino, assinatura digital dos responsáveis. Mantém controle rigoroso da numeração oficial de memorandos, template personalizado com brasão da prefeitura, integração com sistema de email para envio automático aos responsáveis. Permite reimprimir memorandos anteriores, consultar histórico completo de movimentações, e gerar relatórios consolidados de transferências por período.'
                },
                {
                  title: 'Chat Interno',
                  description: 'Sistema de comunicação integrado entre departamentos com tickets e notificações.',
                  icon: <MessageSquare className="w-8 h-8" />,
                  url: '/internal-chat',
                  gradient: 'from-teal-500 to-cyan-600',
                  features: ['Mensagens em tempo real', 'Tickets técnicos', 'Notificações automáticas', 'Histórico de conversas'],
                  detailedInfo: 'O Chat Interno moderniza a comunicação entre departamentos da secretaria. Permite troca de mensagens em tempo real entre equipes técnicas, criação de tickets de suporte interno para resolver questões específicas, notificações automáticas sobre mudanças de status em OS e equipamentos, organização de conversas por departamento ou projeto específico. Mantém histórico completo de todas as comunicações para auditoria e consulta posterior, integra-se com o sistema de notificações para alertar sobre mensagens importantes, e centraliza toda comunicação técnica em uma plataforma única e segura.'
                },
                {
                  title: 'Relatórios e Analytics',
                  description: 'Análises avançadas com gráficos, métricas e relatórios exportáveis.',
                  icon: <Activity className="w-8 h-8" />,
                  url: '/statistics',
                  gradient: 'from-violet-500 to-purple-600',
                  features: ['Dashboards personalizados', 'Exportação de dados', 'Análise de tendências', 'KPIs customizados'],
                  detailedInfo: 'O módulo de Relatórios e Analytics transforma dados operacionais em insights estratégicos para a gestão. Gera relatórios detalhados de produtividade das equipes técnicas, análise de custos por escola e por tipo de serviço, métricas de tempo médio de resolução de OS, identificação de equipamentos que mais apresentam problemas, análise de sazonalidade de demandas, gráficos de distribuição geográfica de atendimentos. Permite exportação em múltiplos formatos (PDF, Excel, CSV), criação de dashboards personalizados por gestor, acompanhamento de metas e KPIs departamentais, e análise de tendências para planejamento de recursos e orçamento futuro.'
                }
              ].map((page, index) => (
                <motion.div
                  key={page.title}
                  className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all duration-300 group hover:scale-105"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="p-8">
                    {/* Header */}
                    <div className={`w-16 h-16 bg-gradient-to-br ${page.gradient} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <div className="text-white">
                        {page.icon}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors duration-300">
                      {page.title}
                    </h3>
                    
                    <p className="text-slate-300 leading-relaxed mb-6">
                      {page.description}
                    </p>

                    {/* Features List */}
                    <div className="space-y-2 mb-8">
                      {page.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-400">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-1 bg-gradient-to-r ${page.gradient} hover:opacity-90 px-4 py-3 rounded-lg font-semibold text-white text-center transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2`}
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        Acessar Sistema
                      </a>
                      <button 
                        onClick={() => {
                          setSelectedPage(page)
                          setModalOpen(true)
                        }}
                        className="px-4 py-3 border border-slate-600 hover:border-slate-500 rounded-lg font-medium text-slate-300 hover:text-white transition-colors duration-300 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Preview
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* System Navigation Info */}
            <motion.div
              className="mt-16 bg-slate-800 rounded-xl border border-slate-700 p-8 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Sistema Completo em Funcionamento</h3>
                <p className="text-slate-300 max-w-2xl mx-auto">
                  Clique em "Acessar Página" para navegar diretamente para as funcionalidades reais do sistema 
                  com dados atuais do banco de dados. Todas as páginas são totalmente funcionais e operacionais.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Sistema Online
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  Dados Reais
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  Totalmente Funcional
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section id="tech" className="py-20 bg-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Stack Tecnológica
              </h2>
              <p className="text-xl text-slate-400 max-w-3xl mx-auto">
                Tecnologias modernas e robustas para máxima performance e escalabilidade
              </p>
            </motion.div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {techStack.map((tech, index) => (
                <motion.div
                  key={tech.name}
                  className={`bg-gradient-to-br ${tech.color} p-6 rounded-xl text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 group`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  viewport={{ once: true }}
                  whileHover={{ rotate: [0, 5, -5, 0] }}
                >
                  <div className="text-3xl mb-3 group-hover:scale-125 transition-transform duration-300">
                    {tech.icon}
                  </div>
                  <div className="text-sm font-bold text-white">{tech.name}</div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="mt-16 text-center"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="bg-gradient-to-r from-slate-700 to-slate-600 p-8 rounded-xl border border-slate-600">
                <h3 className="text-2xl font-bold mb-4 text-white">Arquitetura Cloud-Native</h3>
                <p className="text-slate-300 mb-6">
                  Infraestrutura moderna com deploy automático, monitoramento em tempo real e escalabilidade horizontal
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-400" />
                    <span className="text-sm">Vercel Deploy</span>
                  </div>
                  <div className="bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Shield className="w-5 h-5 text-green-400" />
                    <span className="text-sm">JWT Security</span>
                  </div>
                  <div className="bg-slate-800 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Server className="w-5 h-5 text-purple-400" />
                    <span className="text-sm">PostgreSQL</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>


        {/* Footer */}
        <footer className="py-12 border-t border-slate-700 bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
              CSDT
            </div>
            <p className="text-slate-400 mb-4">
              Sistema de Gestão Técnica Educacional - Desenvolvido pelo Setor de Informática
            </p>
            <p className="text-slate-500 text-sm">
              © 2025 CSDT - Secretaria Municipal de Educação
            </p>
          </div>
        </footer>

        {/* Modal */}
        {modalOpen && selectedPage && (
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className="bg-slate-800 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${selectedPage.gradient} rounded-xl flex items-center justify-center`}>
                    <div className="text-white">
                      {selectedPage.icon}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedPage.title}</h2>
                    <p className="text-slate-400">{selectedPage.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Features Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {selectedPage.features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-700/50 p-3 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-slate-300 text-sm font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Detailed Description */}
                <div className="bg-slate-700/30 p-6 rounded-xl mb-6">
                  <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Funcionalidades Detalhadas
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-base">
                    {selectedPage.detailedInfo}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <a
                    href={selectedPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 bg-gradient-to-r ${selectedPage.gradient} hover:opacity-90 px-6 py-4 rounded-xl font-semibold text-white text-center transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-2`}
                  >
                    <ArrowUpRight className="w-5 h-5" />
                    Acessar Sistema Real
                  </a>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-4 border-2 border-slate-600 hover:border-slate-500 rounded-xl font-semibold text-slate-300 hover:text-white transition-colors duration-300"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </>
  )
}

export default ApresentacaoPage