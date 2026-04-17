import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Gamepad2, CreditCard, History, ShieldCheck, ChevronRight, Menu, X, Rocket, Sparkles, Trophy, MessageSquare, Send, Bot } from 'lucide-react';
import { Game } from './types.ts';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Mock Data
const POPULAR_GAMES: Game[] = [
  { id: '1', name: 'Mobile Legends', publisher: 'Moonton', image: 'https://picsum.photos/seed/mlbb/400/500', category: 'Mobile', slug: 'mobile-legends' },
  { id: '2', name: 'Free Fire', publisher: 'Garena', image: 'https://picsum.photos/seed/ff/400/500', category: 'Mobile', slug: 'free-fire' },
  { id: '3', name: 'Genshin Impact', publisher: 'Hoyoverse', image: 'https://picsum.photos/seed/genshin/400/500', category: 'PC', slug: 'genshin-impact' },
  { id: '4', name: 'Valorant', publisher: 'Riot Games', image: 'https://picsum.photos/seed/valorant/400/500', category: 'PC', slug: 'valorant' },
  { id: '5', name: 'PUBG Mobile', publisher: 'Tencent', image: 'https://picsum.photos/seed/pubgm/400/500', category: 'Mobile', slug: 'pubg-mobile' },
  { id: '6', name: 'Honor of Kings', publisher: 'Tencent', image: 'https://picsum.photos/seed/hok/400/500', category: 'Mobile', slug: 'honor-of-kings' },
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedDenom, setSelectedDenom] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userText = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setChatMessage('');
    setIsTyping(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "Anda adalah asisten cerdas untuk 'TopUpVerse', platform top-up game terpercaya. Gunakan bahasa Indonesia yang ramah, gaul (gamers style), dan membantu. Bantu pengguna memilih game, jelaskan cara top-up, atau beri rekomendasi paket. Game populer kami: Mobile Legends, Free Fire, genshin impact, Valorant, PUBG Mobile, Honor of Kings. Selalu tekankan keamanan dan kecepatan transaksi kami.",
        },
        contents: [{ parts: [{ text: userText }] }],
      });
      
      setChatHistory(prev => [...prev, { role: 'bot', text: response.text || "Maaf, saya tidak mengerti. Bisa diulangi?" }]);
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'bot', text: "Waduh, koneksi lagi lagging nih. Coba lagi ya!" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const PAYMENT_METHODS = [
    { id: 'qris', name: 'QRIS', icon: 'https://seeklogo.com/images/Q/qris-logo-3820047E2A-seeklogo.com.png' },
    { id: 'gopay', name: 'GoPay', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg' },
    { id: 'ovo', name: 'OVO', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg' },
    { id: 'dana', name: 'DANA', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_danamon_blue.svg' }, // Note: Using dana placeholder logic
    { id: 'va', name: 'Virtual Account', icon: 'CreditCard' }
  ];

  const handleOrder = () => {
    if (!selectedDenom || !selectedPayment) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setOrderComplete(true);
    }, 2000);
  };

  const filteredGames = POPULAR_GAMES.filter(game => 
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setSelectedGame(null)}>
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              <Gamepad2 className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              TopUpVerse
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-white transition-colors" onClick={() => setSelectedGame(null)}>Beranda</a>
            <a href="#" className="hover:text-white transition-colors">Daftar Harga</a>
            <a href="#" className="hover:text-white transition-colors">Lacak Pesanan</a>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full transition-all shadow-lg shadow-indigo-500/10">
              Masuk
            </button>
          </div>

          <button 
            className="md:hidden p-2 text-slate-400"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        <AnimatePresence mode="wait">
          {!selectedGame ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Hero Section */}
              <section className="max-w-7xl mx-auto px-4 mb-20 relative">
                <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 -z-10 w-64 h-64 bg-fuchsia-600/20 blur-[100px] rounded-full" />
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-center max-w-3xl mx-auto"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
                    <Sparkles className="w-3.5 h-3.5" />
                    Promo Spesial Ramadhan
                  </div>
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                    Top Up Game <br />
                    <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">Kilat & Terpercaya</span>
                  </h1>
                  <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto leading-relaxed">
                    Dapatkan diamond, credit, dan mata uang game favoritmu dengan harga termurah dan proses otomatis 24 jam.
                  </p>
                  
                  <div className="relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Cari game favoritmu..."
                      className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-slate-100 shadow-xl placeholder:text-slate-600"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </motion.div>
              </section>

              {/* Categories / Grid */}
              <section className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Rocket className="text-indigo-500" />
                    Game Populer
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {filteredGames.map((game, idx) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -8 }}
                      className="group relative cursor-pointer"
                      onClick={() => setSelectedGame(game)}
                    >
                      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-900 relative">
                        <img 
                          src={game.image} 
                          alt={game.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-4">
                          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-1">{game.publisher}</p>
                          <h3 className="font-bold text-lg leading-tight group-hover:text-indigo-400 transition-colors">{game.name}</h3>
                        </div>
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Features Info */}
              <section className="max-w-7xl mx-auto px-4 mt-32 grid md:grid-cols-3 gap-8">
                {[
                  { icon: ShieldCheck, title: "100% Aman & Legal", desc: "Transaksi terenkripsi dan sumber diamond resmi." },
                  { icon: CreditCard, title: "Metode Terlengkap", desc: "Support e-wallet, VA, gerai retail, hingga kartu kredit." },
                  { icon: History, title: "Layanan 24/7", desc: "Sistem otomatis yang bekerja setiap saat, bahkan di hari libur." }
                ].map((feature, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 p-8 rounded-3xl hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
                      <feature.icon className="text-indigo-400 w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
                  </div>
                ))}
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="game-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto px-4"
            >
              <button 
                onClick={() => setSelectedGame(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
              >
                <ChevronRight className="rotate-180 w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Kembali ke Beranda
              </button>

              <div className="grid md:grid-cols-3 gap-8">
                {/* Game Info Card */}
                <div className="md:col-span-1">
                  <div className="sticky top-24 bg-slate-900 border border-white/5 rounded-3xl overflow-hidden p-6 text-center">
                    <img 
                      src={selectedGame.image} 
                      alt={selectedGame.name}
                      referrerPolicy="no-referrer"
                      className="w-32 h-40 object-cover rounded-2xl mx-auto mb-6 shadow-2xl"
                    />
                    <h2 className="text-2xl font-bold mb-2">{selectedGame.name}</h2>
                    <p className="text-indigo-400 text-sm font-medium mb-6">{selectedGame.publisher}</p>
                    <div className="text-left text-xs text-slate-500 space-y-4">
                      <p>Top Up {selectedGame.name} resmi dan aman 100%. Masukkan User ID Anda, pilih nominal, dan selesaikan pembayaran. Saldo akan otomatis masuk ke akun Anda.</p>
                      <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-emerald-400 font-semibold uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" />
                        Terverifikasi
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selection Forms */}
                <div className="md:col-span-2 space-y-8">
                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                      <h3 className="text-lg font-bold">Lengkapi Data Akun</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">User ID</label>
                        <input 
                          type="text" 
                          placeholder="Masukkan User ID"
                          className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        />
                      </div>
                      {selectedGame.slug === 'mobile-legends' && (
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Zone ID</label>
                          <input 
                            type="text" 
                            placeholder="Masukkan Zone ID"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                      <h3 className="text-lg font-bold">Pilih Nominal Top Up</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[10, 50, 100, 250, 500, 1000].map((amount) => (
                        <button 
                          key={amount}
                          onClick={() => setSelectedDenom(amount)}
                          className={`text-left p-4 rounded-2xl border transition-all group relative overflow-hidden ${
                            selectedDenom === amount 
                              ? 'border-indigo-500 bg-indigo-500/10' 
                              : 'border-white/5 bg-slate-950 hover:border-indigo-500/50 hover:bg-slate-900'
                          }`}
                        >
                          <p className="text-xs text-slate-500 mb-1 font-medium italic">💎 Diamonds</p>
                          <p className={`text-lg font-bold transition-colors ${selectedDenom === amount ? 'text-indigo-400' : 'group-hover:text-indigo-400'}`}>
                            {amount * 10} Diamonds
                          </p>
                          <p className="text-sm font-semibold text-slate-400">Rp {new Intl.NumberFormat('id-ID').format(amount * 1000)}</p>
                          {selectedDenom === amount && (
                            <div className="absolute top-2 right-2">
                              <ShieldCheck className="w-4 h-4 text-indigo-400" />
                            </div>
                          )}
                          <div className={`absolute -right-4 -bottom-4 w-12 h-12 bg-indigo-600/10 blur-xl rounded-full ${selectedDenom === amount ? 'scale-150 opacity-100' : 'opacity-0'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-white/5 rounded-3xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                      <h3 className="text-lg font-bold">Pilih Metode Pembayaran</h3>
                    </div>
                    <div className="space-y-3">
                      {PAYMENT_METHODS.map((method) => (
                        <button 
                          key={method.id}
                          onClick={() => setSelectedPayment(method.id)}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                            selectedPayment === method.id 
                              ? 'border-indigo-500 bg-indigo-500/10' 
                              : 'border-white/5 bg-slate-950 hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-white rounded-lg flex items-center justify-center p-1 overflow-hidden">
                              {method.icon === 'CreditCard' ? (
                                <CreditCard className="text-slate-900 w-6 h-6" />
                              ) : (
                                <img src={method.icon} alt={method.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                              )}
                            </div>
                            <span className="font-bold">{method.name}</span>
                          </div>
                          {selectedDenom && (
                            <span className="text-sm font-semibold">Rp {new Intl.NumberFormat('id-ID').format(selectedDenom * 1000 + (method.id === 'va' ? 2500 : 0))}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    disabled={!selectedDenom || !selectedPayment}
                    onClick={handleOrder}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Beli Sekarang"
                    )}
                  </button>
                </div>
              </div>

              {/* Order Tracking / Success Modal */}
              <AnimatePresence>
                {orderComplete && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-slate-900 border border-white/10 p-8 rounded-[40px] max-w-sm w-full text-center shadow-2xl"
                    >
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="text-emerald-400 w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Pesanan Diproses!</h3>
                      <p className="text-slate-400 mb-8">Terima kasih telah melakukan top up di TopUpVerse. Diamonds akan masuk secara otomatis dalam beberapa menit.</p>
                      
                      <div className="bg-slate-950 rounded-2xl p-4 mb-8 text-left space-y-2 border border-white/5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">No. Pesanan</span>
                          <span className="font-mono text-indigo-400 uppercase">TV-{Math.random().toString(36).substr(2, 9)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Username</span>
                          <span className="font-bold">Player_One</span>
                        </div>
                        <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                          <span className="text-slate-500 font-bold uppercase tracking-wider">Total</span>
                          <span className="text-indigo-400 font-bold">Rp {new Intl.NumberFormat('id-ID').format(selectedDenom! * 1000)}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setOrderComplete(false);
                          setSelectedGame(null);
                          setSelectedDenom(null);
                          setSelectedPayment(null);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 py-4 rounded-2xl font-bold transition-all"
                      >
                        Selesai
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-white/5 bg-slate-950 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6 cursor-pointer" onClick={() => setSelectedGame(null)}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-bold uppercase tracking-tighter">TopUpVerse</span>
              </div>
              <p className="text-slate-500 max-w-sm leading-relaxed mb-8">
                Penyedia layanan top up game favorit Anda yang telah melayani ribuan transaksi setiap harinya dengan tingkat kepuasan pelanggan yang tinggi.
              </p>
              <div className="flex gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-indigo-600 hover:border-indigo-600 transition-all cursor-pointer group">
                    <Trophy className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-slate-500">Bantuan</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Hubungi Kami</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Syarat & Ketentuan</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-slate-500">Socials</h4>
              <ul className="space-y-4 text-sm text-slate-400 font-medium">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Instagram</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">TikTok</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Twitter</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-white/5 text-center text-slate-600 text-sm">
            &copy; 2026 TopUpVerse. Seluruh hak cipta dilindungi.
          </div>
        </div>
      </footer>

      {/* AI Assistant Chat Blob */}
      <div className="fixed bottom-6 right-6 z-[200]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-80 h-[450px] bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
            >
              <div className="p-5 bg-indigo-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <span className="font-bold text-sm">Verse AI Assistant</span>
                </div>
                <button onClick={() => setIsChatOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {chatHistory.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="text-indigo-400 w-6 h-6" />
                    </div>
                    <p className="text-slate-400 text-sm">Halo! Ada yang bisa saya bantu buat top up hari ini?</p>
                  </div>
                )}
                {chatHistory.map((chat, i) => (
                  <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      chat.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white/5 border border-white/5 text-slate-200'
                    }`}>
                      {chat.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 p-3 rounded-2xl flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-75" />
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-slate-950 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Tanya sesuatu..."
                    className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 pl-4 pr-10 text-sm outline-none focus:border-indigo-500 transition-colors"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-indigo-400 hover:text-white transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white relative group"
        >
          <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          {!isChatOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-fuchsia-500 border-2 border-slate-950 rounded-full" />
          )}
        </motion.button>
      </div>
    </div>
  );
}

