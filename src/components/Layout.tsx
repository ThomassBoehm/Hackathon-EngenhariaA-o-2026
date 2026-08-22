import React from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  UploadCloud,
  FileCheck2,
  Search,
  BarChart3,
  ShieldAlert,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface LayoutProps {
  children?: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard & Obras', href: '/', icon: LayoutDashboard },
    { name: 'Upload & IA', href: '/upload', icon: UploadCloud, badge: 'IA Leitora' },
    { name: 'Entenda os alertas', href: '/classificacao', icon: ShieldAlert },
    { name: 'Busca Avançada', href: '/busca', icon: Search },
    { name: 'Relatórios & Auditoria', href: '/relatorios', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-slate-200 dark:border-slate-800">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          {/* Logo SIGO */}
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <Link to="/" className="flex items-center gap-3 group min-w-0">
              <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-700/20 group-hover:bg-blue-800 transition-colors">
                <FileCheck2 className="h-6 w-6" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                    SIGO
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 font-semibold"
                  >
                    v2.4
                  </Badge>
                </div>
                <span
                  className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tighter truncate max-w-[200px] sm:max-w-[260px] md:max-w-none -mt-0.5"
                  title="Acompanhe as obras da sua cidade"
                >
                  Acompanhe as obras da sua cidade
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive =
                location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href))
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}
                  />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            {/* Modal de Metodologia SIGO */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700"
                >
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  <span>Metodologia SIGO</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2 text-blue-900 dark:text-blue-300">
                    <ShieldAlert className="h-5 w-5 text-blue-600" />
                    Princípios de Cálculo do SIGO (Hackathon 2026)
                  </DialogTitle>
                  <DialogDescription className="text-sm pt-2 text-slate-600 dark:text-slate-300">
                    "A IA lê. O sistema calcula. O fiscal decide."
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      1. Como acompanhamos
                    </h4>
                    <p className="text-xs leading-relaxed">
                      <strong>Marco Contratual:</strong> Entrega datada da empresa. Quando vence, a
                      falha é da empresa (sem carência).
                      <br />
                      <strong>Liquidações:</strong> Pagamento feito pela Administração. Protegido
                      por carência de trâmite de 15 dias.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      2. Como calculamos o alerta
                    </h4>
                    <code className="text-xs bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded font-mono font-bold block my-1">
                      G = A × log₁₀(V) × S
                    </code>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      <strong>A:</strong> Dias sem liquidação ÷ periodicidade do contrato
                      <br />
                      <strong>V:</strong> Valor global em reais (logaritmo impede distorção)
                      <br />
                      <strong>S:</strong> Maior percentual de multa previsto ÷ 10 (1.0 quando
                      remetido ao TR/Edital)
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <h4 className="font-semibold text-slate-900 dark:text-slate-200 mb-1">
                      3. As 4 verificações de problemas no texto
                    </h4>
                    <ul className="list-disc pl-4 text-xs space-y-1 text-slate-600 dark:text-slate-400">
                      <li>Referência a cláusula que não existe no contrato.</li>
                      <li>Número por extenso diferente do algarismo (ex: 12 (dez)).</li>
                      <li>Conta errada ou limite de mudanças acima da Lei 14.133.</li>
                      <li>Identificador de pregão/contrato conflitante no documento.</li>
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-2 pb-4 space-y-1 shadow-lg">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-blue-600" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className="text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </header>

      {/* Subheader Banner Institucional */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-2 px-4 border-b border-blue-950">
        <div className="container mx-auto flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium">
              Painel de Fiscalização Ativo — Hackathon Cidades Inteligentes SP 2026
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 sm:px-8 py-6 md:py-8 max-w-7xl">
        {children}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 text-xs py-6 mt-12">
        <div className="container mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
              S
            </div>
            <span>
              <strong>SIGO</strong> · Transparência de Obras Públicas.
            </span>
          </div>
          <p className="text-center sm:text-right text-slate-400">
            Conforme documentação técnica do Desafio de Gestão de Obras Públicas de São Paulo · 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
