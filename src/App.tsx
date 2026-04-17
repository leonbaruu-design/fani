import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Gamepad2, CreditCard, History, ShieldCheck, ChevronRight, Menu, X, Rocket, Sparkles, Trophy, MessageSquare, Send, Bot, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { Game } from './types.ts';
import { GoogleGenAI } from "@google/genai";
import { auth, db, googleProvider, handleFirestoreError, OperationType, FirebaseUser } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, where, orderBy, setDoc, doc } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Error Boundary for Firestore Error Handling
class ErrorBoundary extends React.Component<{ children: ReactNode }, { hasError: boolean, errorInfo: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    try {
      const parsed = JSON.parse(error.message);
      return { hasError: true, errorInfo: parsed };
    } catch (e) {
      return { hasError: true, errorInfo: { error: error.message } };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-white/10 p-10 rounded-[40px] max-w-lg shadow-2xl">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="text-red-400 w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Waduh, Ada Masalah!</h2>
            <p className="text-slate-400 mb-6 font-medium">
              Sepertinya ada gangguan saat mengakses data. Mohon maaf atas ketidaknyamanannya.
            </p>
            <pre className="bg-slate-950 p-4 rounded-xl text-xs text-left text-red-400 overflow-x-auto mb-8 font-mono">
              {JSON.stringify(this.state.errorInfo, null, 2)}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-2xl font-bold transition-all"
            >
              Segarkan Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedDenom, setSelectedDenom] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');

  // AI Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Update user profile in Firestore
        const userRef = doc(db, 'users', u.uid);
        try {
          await setDoc(userRef, {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName,
            photoURL: u.photoURL,
            role: 'user', // Default role
            updatedAt: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error("Error updating user profile:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedGame(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

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

  const handleOrder = async () => {
    if (!selectedDenom || !selectedPayment || !selectedGame) return;
    if (!user) {
      handleLogin();
      return;
    }

    setIsProcessing(true);
    const path = 'transactions';
    try {
      const orderData = {
        userId: user.uid,
        gameId: selectedGame.id,
        gameName: selectedGame.name,
        denomination: `${selectedDenom * 10} Diamonds`,
        price: selectedDenom * 1000,
        status: 'pending',
        gameUserId: 'Player_ID_123', // Demo placeholder
        paymentMethod: selectedPayment,
        createdAt: Date.now()
      };
      
      const docRef = await addDoc(collection(db, path), orderData);
      setLastOrderId(`TV-${docRef.id.slice(0, 6).toUpperCase()}`);
      
      setTimeout(() => {
        setIsProcessing(false);
        setOrderComplete(true);
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const PAYMENT_METHODS = [
    { id: 'qris', name: 'QRIS', icon: 'https://seeklogo.com/images/Q/qris-logo-3820047E2A-seeklogo.com.png' },
    { id: 'gopay', name: 'GoPay', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg' },
    { id: 'ovo', name: 'OVO', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg' },
    { id: 'dana', name: 'DANA', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_danamon_blue.svg' },
    { id: 'va', name: 'Virtual Account', icon: 'CreditCard' }
  ];

  const filteredGames = POPULAR_GAMES.filter(game => 
    game.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg text-text-main font-sans selection:bg-accent selection:text-white">
        {/* Navigation */}
        <nav className="fixed top-0 w-full z-50 bg-bg/80 backdrop-blur-md border-b border-border">
          <div className="max-w-7xl mx-auto px-10 h-[72px] flex items-center justify-between">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setSelectedGame(null)}>
              <div className="logo text-xl font-extrabold tracking-tighter flex items-center gap-2">
                TOPUP<span className="text-accent">VERSE</span>
              </div>
            </div>

            <div className="flex-1 max-w-lg mx-12 hidden lg:block">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim w-4 h-4 group-focus-within:text-accent transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search your favorite game..."
                  className="w-full bg-surface border border-border rounded-lg py-2.5 pl-12 pr-4 text-sm outline-none focus:border-accent transition-all text-text-main placeholder:text-text-dim"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-text-dim">
              <a href="#" className="hover:text-white transition-colors" onClick={() => setSelectedGame(null)}>Main Menu</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
              
              {isAuthReady && (
                user ? (
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                      <span className="text-white text-xs font-bold leading-none">{user.displayName?.split(' ')[0]}</span>
                      <button onClick={handleLogout} className="text-[10px] text-text-dim hover:text-red-400 transition-colors uppercase tracking-widest">Logout</button>
                    </div>
                    <img src={user.photoURL || ''} alt="User" className="w-9 h-9 rounded-full border border-border" />
                  </div>
                ) : (
                  <button 
                    onClick={handleLogin}
                    className="bg-accent hover:opacity-90 text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-accent/20 flex items-center gap-2"
                  >
                    Login
                  </button>
                )
              )}
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
              <section className="max-w-7xl mx-auto px-10 mb-20 relative">
                <div className="absolute top-0 right-0 -z-10 w-96 h-96 bg-accent/10 blur-[120px] rounded-full" />
                
                <div className="flex flex-col lg:flex-row items-center gap-16 py-12">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex-1 text-left"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-accent/10 border border-accent/20 text-accent text-[11px] font-bold uppercase tracking-widest mb-6">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                      Official Authorized Partner
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black tracking-tighter mb-6 leading-none">
                      LEVEL UP YOUR<br />
                      <span className="text-accent underline decoration-accent/30 underline-offset-8">GAME EXPERIENCE</span>
                    </h1>
                    <p className="text-lg text-text-dim mb-10 max-w-lg leading-relaxed font-medium">
                      Premium game top-up service. Fast, secure, and 100% legal. Join thousands of gamers who trust TopUpVerse.
                    </p>
                    
                    <div className="flex gap-4">
                      <button className="bg-accent hover:opacity-90 px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all">
                        Explore Games <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-4 px-6 border border-border rounded-xl text-sm font-bold text-text-dim">
                        <ShieldCheck className="w-5 h-5 text-emerald-500" />
                        Verified
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="hidden lg:block w-[400px] aspect-square bg-surface border border-border rounded-[40px] p-8 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/5 to-transparent" />
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-auto">
                        <div className="w-16 h-16 bg-surface-light rounded-2xl flex items-center justify-center border border-border">
                          <Trophy className="text-accent w-8 h-8" />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-text-dim uppercase tracking-widest font-bold">Total Transactions</p>
                          <p className="text-2xl font-black">100k+</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {[1, 2].map(i => (
                          <div key={i} className="flex gap-4 p-3 bg-bg border border-border rounded-xl">
                            <div className="w-10 h-10 bg-accent/20 rounded-lg" />
                            <div className="flex-1 flex flex-col justify-center">
                              <div className="h-2 w-24 bg-surface-light rounded-full mb-2" />
                              <div className="h-1.5 w-16 bg-surface-light/50 rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </section>

              {/* Categories / Grid */}
              <section className="max-w-7xl mx-auto px-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-1 h-8 bg-accent rounded-full" />
                  <h2 className="text-2xl font-bold tracking-tight">Popular Games</h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {filteredGames.map((game, idx) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                      className="group bg-surface border border-border rounded-2xl p-4 cursor-pointer hover:border-accent transition-all hover:shadow-2xl hover:shadow-accent/5"
                      onClick={() => setSelectedGame(game)}
                    >
                      <div className="aspect-video overflow-hidden rounded-xl bg-surface-light mb-4 relative">
                        <img 
                          src={game.image} 
                          alt={game.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                        />
                        <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight group-hover:text-accent transition-colors">{game.name}</h3>
                        <p className="text-xs font-bold text-text-dim uppercase tracking-widest mt-1">{game.publisher}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Features Info */}
              <section className="max-w-7xl mx-auto px-10 mt-32 grid md:grid-cols-3 gap-8">
                {[
                  { icon: ShieldCheck, title: "100% Aman & Legal", desc: "Transaksi terenkripsi dan sumber diamond resmi." },
                  { icon: CreditCard, title: "Metode Terlengkap", desc: "Support e-wallet, VA, gerai retail, hingga kartu kredit." },
                  { icon: History, title: "Layanan 24/7", desc: "Sistem otomatis yang bekerja setiap saat, bahkan di hari libur." }
                ].map((feature, i) => (
                  <div key={i} className="bg-surface border border-border p-8 rounded-3xl hover:bg-surface-light transition-colors group">
                    <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 border border-accent/20 group-hover:bg-accent group-hover:border-accent transition-all">
                      <feature.icon className="text-accent w-6 h-6 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-text-dim leading-relaxed text-sm">{feature.desc}</p>
                  </div>
                ))}
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="game-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto px-10"
            >
              <button 
                onClick={() => setSelectedGame(null)}
                className="flex items-center gap-2 text-text-dim hover:text-white mb-8 transition-colors group text-sm font-bold uppercase tracking-widest"
              >
                <ChevronRight className="rotate-180 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Return to Dashboard
              </button>

              <div className="grid lg:grid-cols-12 gap-[1px] bg-border rounded-[32px] overflow-hidden border border-border">
                {/* Game Info Panel */}
                <div className="lg:col-span-3 bg-bg p-8">
                  <div className="sticky top-28">
                    <div className="aspect-[3/4] rounded-2xl overflow-hidden mb-6 border border-border shadow-2xl">
                      <img 
                        src={selectedGame.image} 
                        alt={selectedGame.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h2 className="text-2xl font-black mb-1">{selectedGame.name}</h2>
                    <p className="text-accent text-sm font-bold uppercase tracking-widest mb-6">{selectedGame.publisher}</p>
                    <div className="space-y-4 text-xs text-text-dim leading-relaxed font-medium">
                      <p>Experience instant and secure top-ups for {selectedGame.name}. Use our official authorized channel for 100% legal delivery.</p>
                      <div className="p-4 bg-surface border border-border rounded-xl flex items-center gap-3 text-emerald-500 font-bold uppercase tracking-tighter">
                        <ShieldCheck className="w-4 h-4" />
                        Official Partner
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selection Forms */}
                <div className="lg:col-span-5 bg-bg p-8 border-x border-border">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
                    <span className="w-1 h-6 bg-accent rounded-full" />
                    Configure Order
                  </h3>

                  <div className="space-y-10">
                    <div>
                      <label className="block text-[11px] font-bold text-text-dim uppercase tracking-widest mb-4">Step 1: Account Information</label>
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          placeholder="Your User ID (e.g. 12345678)"
                          className="w-full bg-surface border border-border rounded-xl py-4 px-6 focus:border-accent outline-none transition-all font-mono"
                        />
                        {selectedGame.slug === 'mobile-legends' && (
                          <input 
                            type="text" 
                            placeholder="Zone ID (e.g. 1234)"
                            className="w-full bg-surface border border-border rounded-xl py-4 px-6 focus:border-accent outline-none transition-all font-mono"
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-dim uppercase tracking-widest mb-4">Step 2: Selection Nominal</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[10, 50, 100, 250, 500, 1000].map((amount) => (
                          <button 
                            key={amount}
                            onClick={() => setSelectedDenom(amount)}
                            className={`text-left p-4 rounded-xl border transition-all ${
                              selectedDenom === amount 
                                ? 'border-accent bg-accent/5' 
                                : 'border-border bg-surface hover:bg-surface-light'
                            }`}
                          >
                            <span className="block text-[10px] text-text-dim font-bold uppercase mb-1">Game Item</span>
                            <span className={`block font-bold ${selectedDenom === amount ? 'text-white' : 'text-text-main'}`}>
                              {amount * 10} Diamonds
                            </span>
                            <span className="block text-xs font-bold text-accent mt-2">Rp {new Intl.NumberFormat('id-ID').format(amount * 1000)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Checkout Panel */}
                <div className="lg:col-span-4 bg-surface p-8">
                  <h3 className="text-xl font-bold mb-8">Order Summary</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] font-bold text-text-dim uppercase tracking-widest mb-4">Step 3: Payment Method</label>
                      <div className="space-y-3">
                        {PAYMENT_METHODS.map((method) => (
                          <button 
                            key={method.id}
                            onClick={() => setSelectedPayment(method.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                              selectedPayment === method.id 
                                ? 'border-accent bg-accent/10 shadow-lg shadow-accent/5' 
                                : 'border-border bg-bg hover:bg-surface-light'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-7 bg-white rounded-md flex items-center justify-center p-1 overflow-hidden">
                                {method.icon === 'CreditCard' ? (
                                  <CreditCard className="text-bg w-4 h-4" />
                                ) : (
                                  <img src={method.icon} alt={method.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                )}
                              </div>
                              <span className="text-sm font-bold uppercase tracking-tight">{method.name}</span>
                            </div>
                            {selectedDenom && (
                              <span className="text-xs font-black text-accent">IDR {new Intl.NumberFormat('id-ID').format(selectedDenom * 1000 + (method.id === 'va' ? 2500 : 0))}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-border mt-10">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-sm text-text-dim font-bold uppercase tracking-widest">Total Pay</span>
                        <span className="text-2xl font-black text-white">
                          {selectedDenom ? `Rp ${new Intl.NumberFormat('id-ID').format(selectedDenom * 1000)}` : 'Rp 0'}
                        </span>
                      </div>
                      
                      <button 
                        disabled={!selectedDenom || !selectedPayment}
                        onClick={handleOrder}
                        className="w-full bg-accent hover:opacity-90 disabled:bg-surface-light disabled:text-text-dim disabled:cursor-not-allowed py-5 rounded-2xl font-black text-lg shadow-2xl shadow-accent/20 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
                      >
                        {isProcessing ? (
                          <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>CONFIRM TOP UP <Rocket className="w-5 h-5" /></>
                        )}
                      </button>
                      <p className="text-[10px] text-text-dim text-center mt-6 font-medium">Transaction protected by 256-bit SSL Encryption</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Tracking / Success Modal */}
              <AnimatePresence>
                {orderComplete && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] bg-bg/95 backdrop-blur-xl flex items-center justify-center p-4"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-surface border border-border p-10 rounded-[40px] max-w-sm w-full text-center shadow-2xl"
                    >
                      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                        <ShieldCheck className="text-emerald-400 w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Order Proceeding!</h3>
                      <p className="text-text-dim text-sm mb-8 font-medium">Thank you for choosing TopUpVerse. Your diamonds are being delivered to your account instantly.</p>
                      
                      <div className="bg-bg rounded-2xl p-5 mb-8 text-left space-y-3 border border-border">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-text-dim">Order ID</span>
                          <span className="text-accent">{lastOrderId}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-text-dim">Player ID</span>
                          <span className="text-white">Player_One</span>
                        </div>
                        <div className="flex justify-between text-xs pt-3 border-t border-border">
                          <span className="text-text-dim font-black uppercase">Total Paid</span>
                          <span className="text-accent font-black">Rp {new Intl.NumberFormat('id-ID').format(selectedDenom! * 1000)}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setOrderComplete(false);
                          setSelectedGame(null);
                          setSelectedDenom(null);
                          setSelectedPayment(null);
                        }}
                        className="w-full bg-surface-light hover:bg-border py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all border border-border"
                      >
                        Close Portal
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border bg-surface-light/30 backdrop-blur-sm py-12">
        <div className="max-w-7xl mx-auto px-10 text-xs text-text-dim flex flex-wrap justify-center gap-12 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2"><span className="w-2 h-2 bg-emerald-500 rounded-full" /> Server Status: 100% Operational</div>
          <div>Official Authorized Partner</div>
          <div>24/7 Customer Support</div>
          <div>Instant Delivery Guarantee</div>
        </div>
        <div className="mt-12 text-center text-[10px] text-text-dim/50 uppercase tracking-[0.2em]">
          &copy; 2026 TopUpVerse. Premium Game Experience.
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
              className="absolute bottom-20 right-0 w-80 h-[450px] bg-surface border border-border rounded-[32px] shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
            >
              <div className="p-5 bg-accent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  <span className="font-black text-xs uppercase tracking-widest">Verse Assistant</span>
                </div>
                <button onClick={() => setIsChatOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {chatHistory.length === 0 && (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="text-accent w-6 h-6" />
                    </div>
                    <p className="text-text-dim text-xs font-bold uppercase tracking-widest">Need help with top-up?</p>
                  </div>
                )}
                {chatHistory.map((chat, i) => (
                  <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-medium ${
                      chat.role === 'user' ? 'bg-accent text-white' : 'bg-surface-light border border-border text-text-main'
                    }`}>
                      {chat.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-surface-light p-3 rounded-2xl flex gap-1 border border-border">
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-75" />
                      <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-bg border-t border-border">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Type your message..."
                    className="w-full bg-surface border border-border rounded-xl py-2 pl-4 pr-10 text-xs outline-none focus:border-accent transition-colors text-white"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-accent hover:text-white transition-colors"
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
          className="w-14 h-14 bg-accent rounded-full flex items-center justify-center shadow-lg shadow-accent/30 text-white relative group border border-white/10"
        >
          <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          {!isChatOpen && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-bg rounded-full" />
          )}
        </motion.button>
      </div>
    </div>
  </ErrorBoundary>
);
}

