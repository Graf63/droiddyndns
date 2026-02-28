/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Settings, 
  Activity, 
  History, 
  Play, 
  Square, 
  RefreshCw, 
  Shield, 
  Globe, 
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'error';
  message: string;
  ip?: string;
}

interface Config {
  provider: 'ovh' | 'noip';
  domain: string;
  user: string;
  pass: string;
  interval: number; // in minutes
  customIpUrl: string;
}

const STORAGE_KEY_CONFIG = 'dyndns_config';
const STORAGE_KEY_LOGS = 'dyndns_logs';

type Language = 'fr' | 'en';

const translations = {
  fr: {
    dashboard: 'Tableau de bord',
    settings: 'Configuration',
    history: 'Historique',
    start: 'Démarrer',
    stop: 'Arrêter',
    currentIp: 'IP Publique Actuelle',
    nextUpdate: 'Prochaine mise à jour',
    interval: 'Intervalle',
    monitoringActive: 'Surveillance Active',
    monitoringStopped: 'Surveillance Arrêtée',
    systemStatus: 'État du Système',
    hostname: 'Nom d\'hôte',
    lastSuccess: 'Dernier Succès',
    updateMethod: 'Méthode de mise à jour',
    providerCredentials: 'Fournisseur & Identifiants',
    serviceProvider: 'Fournisseur de service',
    dyndnsHostname: 'Nom d\'hôte DynDNS',
    identifier: 'Identifiant',
    password: 'Mot de passe',
    advanced: 'Avancé',
    updateInterval: 'Intervalle de mise à jour (Minutes)',
    customIpUrl: 'URL personnalisée de détection d\'IP (Optionnel)',
    customIpNote: 'Laisse vide pour utiliser le service par défaut.',
    eventLogs: 'Logs d\'événements',
    clear: 'Effacer',
    time: 'Heure',
    status: 'Statut',
    message: 'Message',
    ip: 'IP',
    noLogs: 'Aucun log enregistré.',
    noteAndroid: 'Note sur l\'autonomie Android',
    noteAndroidText: 'Pour que cette application fonctionne en arrière-plan sur Android, elle doit être compilée avec Capacitor et utiliser un plugin de Background Task.',
    ipDetection: 'Détection d\'IP',
    ipDetectionText: 'Le téléphone ne peut pas connaître son IP publique sans interroger un serveur externe. L\'utilisation de votre page perso est recommandée.',
    responsiveDesign: 'Design Adaptatif',
    responsiveDesignText: 'Interface optimisée pour smartphones, tablettes et appareils pliables. Support des modes Clair, Sombre et Système.',
    configIncomplete: 'Configuration incomplète',
    fetchingIp: 'Vérification de l\'IP...',
    ipFetchFailed: 'Impossible de récupérer l\'IP publique',
    ipChanged: 'Changement d\'IP détecté',
    ipNotChanged: 'L\'IP n\'a pas changé',
    updateSuccess: 'DNS mis à jour avec succès',
    updateFailed: 'Mise à jour DNS échouée',
    never: 'Jamais',
    language: 'Langue',
    system: 'Système'
  },
  en: {
    dashboard: 'Dashboard',
    settings: 'Settings',
    history: 'History',
    start: 'Start',
    stop: 'Stop',
    currentIp: 'Current Public IP',
    nextUpdate: 'Next Update In',
    interval: 'Interval',
    monitoringActive: 'Monitoring Active',
    monitoringStopped: 'Monitoring Stopped',
    systemStatus: 'System Status',
    hostname: 'Hostname',
    lastSuccess: 'Last Success',
    updateMethod: 'Update Method',
    providerCredentials: 'Provider & Credentials',
    serviceProvider: 'Service Provider',
    dyndnsHostname: 'DynDNS Hostname',
    identifier: 'Identifier',
    password: 'Password',
    advanced: 'Advanced',
    updateInterval: 'Update Interval (Minutes)',
    customIpUrl: 'Custom IP Check URL (Optional)',
    customIpNote: 'Leave empty to use the default service.',
    eventLogs: 'Event Logs',
    clear: 'Clear',
    time: 'Time',
    status: 'Status',
    message: 'Message',
    ip: 'IP',
    noLogs: 'No logs recorded yet.',
    noteAndroid: 'Note on Android Autonomy',
    noteAndroidText: 'For this app to work in the background on Android, it must be compiled with Capacitor and use a Background Task plugin.',
    ipDetection: 'IP Detection',
    ipDetectionText: 'The phone cannot know its public IP without querying an external server. Using your personal page is recommended.',
    responsiveDesign: 'Responsive Design',
    responsiveDesignText: 'Interface optimized for smartphones, tablets, and foldable devices. Support for Light, Dark, and System modes.',
    configIncomplete: 'Incomplete configuration',
    fetchingIp: 'Checking IP...',
    ipFetchFailed: 'Unable to fetch public IP',
    ipChanged: 'IP change detected',
    ipNotChanged: 'IP has not changed',
    updateSuccess: 'DNS updated successfully',
    updateFailed: 'DNS update failed',
    never: 'Never',
    language: 'Language',
    system: 'System'
  }
};

export default function App() {
  // State
  const [config, setConfig] = useState<Config>({
    provider: 'ovh',
    domain: '',
    user: '',
    pass: '',
    interval: 5,
    customIpUrl: ''
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [nextUpdate, setNextUpdate] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'logs'>('status');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [lang, setLang] = useState<Language>('fr');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  // Theme & Language logic
  useEffect(() => {
    const savedTheme = localStorage.getItem('dyndns_theme') as any;
    if (savedTheme) setTheme(savedTheme);

    const savedLang = localStorage.getItem('dyndns_lang') as any;
    if (savedLang) {
      setLang(savedLang);
    } else {
      // System detection
      const systemLang = navigator.language.split('-')[0];
      if (systemLang === 'fr' || systemLang === 'en') {
        setLang(systemLang as Language);
      } else {
        setLang('en');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dyndns_lang', lang);
  }, [lang]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    localStorage.setItem('dyndns_theme', theme);
    const root = window.document.documentElement;
    
    const applyTheme = (t: string) => {
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.toggle('dark', systemTheme === 'dark');
      } else {
        root.classList.toggle('dark', t === 'dark');
      }
    };

    applyTheme(theme);

    // Listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Load data
  useEffect(() => {
    const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (savedConfig) setConfig(JSON.parse(savedConfig));

    const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs.slice(0, 100))); // Keep last 100
  }, [logs]);

  const addLog = useCallback((type: LogEntry['type'], message: string, ip?: string) => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type,
      message,
      ip
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const fetchPublicIp = async (): Promise<string | null> => {
    // List of public IP detection services to try in order
    const services = [
      config.customIpUrl, // User's custom URL first if provided
      'https://api.ipify.org',
      'https://ifconfig.me/ip',
      '/api/my-ip',       // Our own server proxy as fallback
      'https://icanhazip.com',
      'https://ident.me'
    ].filter(Boolean) as string[];

    for (const url of services) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const text = await res.text();
        
        // Try to parse as JSON first if it looks like it
        try {
          if (text.trim().startsWith('{')) {
            const json = JSON.parse(text);
            if (json.ip) return json.ip;
          }
        } catch (e) {}

        // Fallback to regex for plain text responses
        const ipMatch = text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
        if (ipMatch) return ipMatch[0];
      } catch (err) {
        console.warn(`Failed to fetch IP from ${url}, trying next...`);
      }
    }
    
    return null;
  };

  const updateDns = async (ip: string) => {
    if (!config.domain || !config.user || !config.pass) {
      addLog('error', t.configIncomplete);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/update-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          domain: config.domain,
          user: config.user,
          password: config.pass,
          ip
        })
      });

      const data = await res.json();
      if (res.ok) {
        addLog('success', `${t.updateSuccess} (${config.provider.toUpperCase()}): ${data.status}`, ip);
        setLastUpdate(Date.now());
      } else {
        addLog('error', `${t.updateFailed} ${config.provider.toUpperCase()}: ${data.error || data.details}`, ip);
      }
    } catch (err) {
      addLog('error', t.updateFailed);
    } finally {
      setIsUpdating(false);
    }
  };

  const checkAndUpdate = useCallback(async () => {
    addLog('info', t.fetchingIp);
    const ip = await fetchPublicIp();
    
    if (!ip) {
      addLog('error', t.ipFetchFailed);
      return;
    }

    if (ip !== currentIp) {
      addLog('info', `${t.ipChanged}: ${currentIp || 'N/A'} -> ${ip}`);
      setCurrentIp(ip);
      await updateDns(ip);
    } else {
      addLog('info', t.ipNotChanged, ip);
    }

    setNextUpdate(Date.now() + config.interval * 60 * 1000);
  }, [config, currentIp, addLog, t]);

  // Start/Stop logic
  useEffect(() => {
    if (isRunning) {
      checkAndUpdate();
      timerRef.current = setInterval(checkAndUpdate, config.interval * 60 * 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setNextUpdate(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, config.interval]); // Note: we don't include checkAndUpdate to avoid infinite loops if it changes

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY_LOGS);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans selection:bg-[var(--fg)] selection:text-[var(--bg)] transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-[var(--border)] p-4 md:p-6 flex justify-between items-center bg-[var(--card-bg)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 border border-[var(--border)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div>
            <h1 className="font-serif italic text-xl md:text-2xl tracking-tight flex items-center gap-2">
              <Globe className="w-5 h-5 md:w-6 md:h-6" />
              DroidDynDNS
            </h1>
            <p className="hidden sm:block text-[9px] md:text-[10px] uppercase tracking-widest opacity-50 font-mono mt-1">
              OVH & No-IP Client • Android Edition
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Language Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className={cn(
                "p-2 border border-[var(--border)] transition-colors bg-[var(--bg)]/50 hover:bg-[var(--fg)] hover:text-[var(--bg)]",
                isLangMenuOpen && "bg-[var(--fg)] text-[var(--bg)]"
              )}
              title={t.language}
            >
              <Languages className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {isLangMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-40 bg-[var(--card-bg)] border border-[var(--border)] shadow-xl z-[60]"
                >
                  {[
                    { id: 'fr', label: 'Français', flag: '🇫🇷' },
                    { id: 'en', label: 'English', flag: '🇬🇧' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setLang(l.id as Language);
                        setIsLangMenuOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-xs font-mono uppercase tracking-tighter text-left hover:bg-[var(--fg)]/5 transition-colors",
                        lang === l.id && "bg-[var(--fg)]/10 font-bold"
                      )}
                    >
                      <span className="text-base">{l.flag}</span>
                      {l.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center border border-[var(--border)] p-1 bg-[var(--bg)]/50">
            {[
              { id: 'light', icon: Sun },
              { id: 'system', icon: Monitor },
              { id: 'dark', icon: Moon },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={cn(
                  "p-1.5 transition-colors",
                  theme === t.id ? "bg-[var(--fg)] text-[var(--bg)]" : "hover:bg-[var(--fg)]/10"
                )}
                title={t.id}
              >
                <t.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-2 rounded-none border border-[var(--border)] transition-all font-mono text-[10px] md:text-xs uppercase tracking-tighter",
              isRunning 
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700" 
                : "bg-emerald-500 text-white hover:bg-emerald-600 border-emerald-600"
            )}
          >
            {isRunning ? <><Square className="w-3 h-3 fill-current" /> {t.stop}</> : <><Play className="w-3 h-3 fill-current" /> {t.start}</>}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
        {/* Sidebar Navigation - Desktop & Tablet */}
        <nav className={cn(
          "md:col-span-3 lg:col-span-2 space-y-2 transition-all duration-300",
          "fixed inset-0 top-[73px] bg-[var(--bg)] z-40 p-4 md:relative md:top-0 md:bg-transparent md:p-0 md:block",
          isMenuOpen ? "block" : "hidden"
        )}>
          {[
            { id: 'status', label: t.dashboard, icon: Activity },
            { id: 'settings', label: t.settings, icon: Settings },
            { id: 'logs', label: t.history, icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setIsMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-mono uppercase tracking-tighter border transition-all",
                activeTab === tab.id 
                  ? "bg-[var(--fg)] text-[var(--bg)] border-[var(--border)]" 
                  : "bg-[var(--card-bg)] border-transparent hover:border-[var(--border)]/20"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="md:col-span-9 lg:col-span-10">
          <AnimatePresence mode="wait">
            {activeTab === 'status' && (
              <motion.div
                key="status"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Globe className="w-12 h-12" />
                    </div>
                    <p className="font-serif italic text-xs opacity-50 uppercase mb-2">{t.currentIp}</p>
                    <p className="font-mono text-xl lg:text-2xl font-bold tracking-tighter">
                      {currentIp || '---.---.---.---'}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", isRunning ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                      <span className="text-[10px] font-mono uppercase opacity-70">
                        {isRunning ? t.monitoringActive : t.monitoringStopped}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Clock className="w-12 h-12" />
                    </div>
                    <p className="font-serif italic text-xs opacity-50 uppercase mb-2">{t.nextUpdate}</p>
                    <p className="font-mono text-xl lg:text-2xl font-bold tracking-tighter">
                      {nextUpdate ? format(nextUpdate, 'HH:mm:ss') : '--:--:--'}
                    </p>
                    <p className="text-[10px] font-mono uppercase opacity-70 mt-4">
                      {t.interval}: {config.interval} min
                    </p>
                  </div>

                  <div className="hidden lg:block bg-[var(--card-bg)] border border-[var(--border)] p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Shield className="w-12 h-12" />
                    </div>
                    <p className="font-serif italic text-xs opacity-50 uppercase mb-2">Provider</p>
                    <p className="font-mono text-xl lg:text-2xl font-bold tracking-tighter uppercase">
                      {config.provider}
                    </p>
                    <p className="text-[10px] font-mono uppercase opacity-70 mt-4">
                      Secure HTTPS
                    </p>
                  </div>
                </div>

                {/* Status Card */}
                <div className="bg-[var(--card-bg)] border border-[var(--border)] p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif italic text-lg">{t.systemStatus}</h3>
                    <button 
                      onClick={checkAndUpdate}
                      disabled={isUpdating}
                      className="p-2 border border-[var(--border)] hover:bg-[var(--fg)] hover:text-[var(--bg)] transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-4 h-4", isUpdating && "animate-spin")} />
                    </button>
                  </div>
                  
                  <div className="space-y-4 font-mono text-xs">
                    <div className="flex justify-between border-b border-[var(--border)]/10 pb-2">
                      <span className="opacity-50 uppercase">{t.hostname}</span>
                      <span className="font-bold break-all text-right ml-4">{config.domain || t.never}</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)]/10 pb-2">
                      <span className="opacity-50 uppercase">{t.lastSuccess}</span>
                      <span className="font-bold">{lastUpdate ? format(lastUpdate, 'dd/MM HH:mm:ss') : t.never}</span>
                    </div>
                    <div className="flex justify-between border-b border-[var(--border)]/10 pb-2">
                      <span className="opacity-50 uppercase">{t.updateMethod}</span>
                      <span className="font-bold">{config.provider.toUpperCase()} API (HTTPS)</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[var(--card-bg)] border border-[var(--border)] p-6 md:p-8 space-y-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5" />
                  <h3 className="font-serif italic text-xl">{t.providerCredentials}</h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono tracking-widest opacity-50">{t.serviceProvider}</label>
                    <div className="flex flex-wrap gap-2">
                      {(['ovh', 'noip'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setConfig({...config, provider: p})}
                          className={cn(
                            "flex-1 min-w-[120px] py-2.5 border border-[var(--border)] font-mono text-xs uppercase transition-all",
                            config.provider === p ? "bg-[var(--fg)] text-[var(--bg)]" : "bg-[var(--card-bg)] hover:bg-[var(--fg)]/5"
                          )}
                        >
                          {p === 'ovh' ? 'OVH Cloud' : 'No-IP'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono tracking-widest opacity-50">{t.dyndnsHostname}</label>
                    <input 
                      type="text"
                      placeholder="home.mondomaine.com"
                      value={config.domain}
                      onChange={(e) => setConfig({...config, domain: e.target.value})}
                      className="w-full bg-[var(--bg)]/30 border border-[var(--border)] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--border)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest opacity-50">{t.identifier}</label>
                      <input 
                        type="text"
                        placeholder="user-123"
                        value={config.user}
                        onChange={(e) => setConfig({...config, user: e.target.value})}
                        className="w-full bg-[var(--bg)]/30 border border-[var(--border)] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--border)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-mono tracking-widest opacity-50">{t.password}</label>
                      <input 
                        type="password"
                        placeholder="••••••••"
                        value={config.pass}
                        onChange={(e) => setConfig({...config, pass: e.target.value})}
                        className="w-full bg-[var(--bg)]/30 border border-[var(--border)] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--border)]"
                      />
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)]/10 pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Activity className="w-5 h-5" />
                      <h3 className="font-serif italic text-xl">{t.advanced}</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono tracking-widest opacity-50">{t.updateInterval}</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="range"
                            min="1"
                            max="60"
                            value={config.interval}
                            onChange={(e) => setConfig({...config, interval: parseInt(e.target.value)})}
                            className="flex-1 accent-[var(--border)]"
                          />
                          <span className="font-mono text-sm w-12 text-right">{config.interval}m</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-mono tracking-widest opacity-50">{t.customIpUrl}</label>
                        <input 
                          type="text"
                          placeholder="https://ip.mon-domaine.fr"
                          value={config.customIpUrl}
                          onChange={(e) => setConfig({...config, customIpUrl: e.target.value})}
                          className="w-full bg-[var(--bg)]/30 border border-[var(--border)] p-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[var(--border)]"
                        />
                        <p className="text-[9px] opacity-50 font-mono">
                          {t.customIpNote}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[var(--card-bg)] border border-[var(--border)] overflow-hidden"
              >
                <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--fg)]/5">
                  <h3 className="font-serif italic text-lg">{t.eventLogs}</h3>
                  <button 
                    onClick={clearLogs}
                    className="text-[10px] uppercase font-mono tracking-widest flex items-center gap-1 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> {t.clear}
                  </button>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="p-12 text-center opacity-30 font-serif italic">
                      {t.noLogs}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--border)]">
                          <tr className="font-serif italic text-[10px] uppercase opacity-50">
                            <th className="p-4 font-normal">{t.time}</th>
                            <th className="p-4 font-normal">{t.status}</th>
                            <th className="p-4 font-normal">{t.message}</th>
                            <th className="p-4 font-normal">{t.ip}</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-[11px]">
                          {logs.map((log) => (
                            <tr key={log.id} className="border-b border-[var(--border)]/5 hover:bg-[var(--fg)]/5 transition-colors">
                              <td className="p-4 opacity-50 whitespace-nowrap">{format(log.timestamp, 'HH:mm:ss')}</td>
                              <td className="p-4">
                                {log.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                {log.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                                {log.type === 'info' && <Activity className="w-4 h-4 text-blue-600" />}
                              </td>
                              <td className="p-4">{log.message}</td>
                              <td className="p-4 font-bold whitespace-nowrap">{log.ip || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto p-6 md:p-8 mt-12 border-t border-[var(--border)]/10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h4 className="font-serif italic text-sm">{t.noteAndroid}</h4>
            <p className="text-xs leading-relaxed opacity-70">
              {t.noteAndroidText}
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-serif italic text-sm">{t.ipDetection}</h4>
            <p className="text-xs leading-relaxed opacity-70">
              {t.ipDetectionText}
            </p>
          </div>
          <div className="space-y-4 md:col-span-2 lg:col-span-1">
            <h4 className="font-serif italic text-sm">{t.responsiveDesign}</h4>
            <p className="text-xs leading-relaxed opacity-70">
              {t.responsiveDesignText}
            </p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-[var(--border)]/5 text-center">
          <p className="text-[10px] font-mono uppercase opacity-30 tracking-[0.2em]">
            Crafted for Professional IT Management • 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
