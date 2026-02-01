import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query,
  orderBy
} from "firebase/firestore";

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Rentals from './pages/Rentals';
import Financial from './pages/Financial';
import Staff from './pages/Staff';
import AppSettings from './pages/AppSettings';
import Availability from './pages/Availability';
import CustomersPage from './pages/CustomersPage';
import BudgetsPage from './pages/BudgetsPage';
import DocumentsPage from './pages/DocumentsPage';
import PublicRentalSummary from './pages/PublicRentalSummary';
import { Customer, Toy, Rental, User, UserRole, FinancialTransaction, CompanySettings as CompanyType } from './types';
import { Loader2 } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.appspot.com",
  messagingSenderId: "365824558296",
  appId: "1:365824558296:web:15610e6e76550772718e87"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const Login: React.FC = () => {
  const [email, setEmail] = useState('admsusu@gmail.com');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [displayPhoto] = useState(() => {
    try {
      const userStr = localStorage.getItem('susu_user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        return userData.profilePhotoUrl || "https://images.unsplash.com/photo-1530103862676-fa8c91811678?q=80&w=500&auto=format&fit=crop";
      }
    } catch (e) { console.error(e); }
    return "https://images.unsplash.com/photo-1530103862676-fa8c91811678?q=80&w=500&auto=format&fit=crop";
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 border border-slate-100 flex flex-col items-center">
        <div className="text-center mb-10 w-full flex flex-col items-center">
          <div style={{ width: '128px', height: '128px', minWidth: '128px' }} className="bg-slate-50 rounded-[40px] flex items-center justify-center mb-6 shadow-xl border-4 border-white overflow-hidden relative">
             <img src={displayPhoto} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest brand-font">Painel Administrativo</h2>
          <p className="text-slate-400 mt-1 font-medium text-sm">SUSU Animações e Brinquedos</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {error && <div className="p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl text-center">{error}</div>}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
            <input type="email" required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none font-bold text-slate-700" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <input type="password" required className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none font-bold text-slate-700" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 uppercase tracking-widest text-sm flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" size={20}/> : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toys, setToys] = useState<Toy[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>(['Cama Elástica', 'Infláveis', 'Piscina de Bolinhas', 'Jogos', 'Geral']);
  const [company, setCompany] = useState<CompanyType>({
    name: 'Susu Animações', logoUrl: '', address: '', phone: '', email: '', contractTerms: ''
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const cachedUser = localStorage.getItem('susu_user');
        if (cachedUser) setUser(JSON.parse(cachedUser));
        else {
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Administrador',
            email: firebaseUser.email || '',
            role: UserRole.ADMIN,
            profilePhotoUrl: firebaseUser.photoURL || ''
          };
          setUser(newUser);
          localStorage.setItem('susu_user', JSON.stringify(newUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem('susu_user');
      }
      setAuthLoading(false);
    });

    onSnapshot(collection(db, "toys"), (snap) => setToys(snap.docs.map(d => ({ id: d.id, ...d.data() } as Toy))));
    onSnapshot(query(collection(db, "rentals"), orderBy("date", "desc")), (snap) => setRentals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Rental))));
    onSnapshot(collection(db, "customers"), (snap) => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))));
    onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc")), (snap) => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialTransaction))));
    onSnapshot(doc(db, "settings", "company"), (snap) => snap.exists() && setCompany(snap.data() as CompanyType));
    onSnapshot(doc(db, "settings", "categories"), (snap) => snap.exists() && setCategories(snap.data().list || []));

    return () => unsubscribe();
  }, []);

  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <Router>
      <Routes>
        <Route path="/resumo-reserva/:id" element={<PublicRentalSummary rentals={rentals} company={company} />} />
        <Route path="/*" element={
          !user ? <Login /> : (
            <Layout user={user} onLogout={() => signOut(auth)}>
              <Routes>
                <Route path="/" element={<Dashboard rentals={rentals} toys={toys} transactions={transactions} />} />
                <Route path="/estoque" element={<Inventory toys={toys} setToys={setToys} categories={categories} setCategories={(c) => setDoc(doc(db, "settings", "categories"), { list: c })} />} />
                <Route path="/catalogo" element={<Inventory toys={toys} setToys={setToys} categories={categories} setCategories={(c) => setDoc(doc(db, "settings", "categories"), { list: c })} />} />
                <Route path="/clientes" element={<CustomersPage customers={customers} setCustomers={()=>{}} />} />
                <Route path="/disponibilidade" element={<Availability rentals={rentals} toys={toys} />} />
                <Route path="/orcamentos" element={<BudgetsPage rentals={rentals} setRentals={()=>{}} customers={customers} toys={toys} company={company} />} />
                <Route path="/reservas" element={<Rentals rentals={rentals} setRentals={(action: any) => {
                    const next = typeof action === 'function' ? action(rentals) : action;
                    next.forEach((r: Rental) => setDoc(doc(db, "rentals", r.id), r));
                }} customers={customers} toys={toys} company={company} />} />
                <Route path="/financeiro" element={user.role === UserRole.ADMIN ? <Financial rentals={rentals} setRentals={()=>{}} transactions={transactions} setTransactions={(action: any) => {
                    const next = typeof action === 'function' ? action(transactions) : action;
                    next.forEach((t: FinancialTransaction) => setDoc(doc(db, "transactions", t.id), t));
                }} /> : <Navigate to="/reservas" />} />
                <Route path="/contratos" element={<DocumentsPage type="contract" rentals={rentals} customers={customers} company={company} />} />
                <Route path="/recibos" element={<DocumentsPage type="receipt" rentals={rentals} customers={customers} company={company} />} />
                <Route path="/colaboradores" element={user.role === UserRole.ADMIN ? <Staff staff={[]} setStaff={()=>{}} /> : <Navigate to="/reservas" />} />
                <Route path="/configuracoes" element={user.role === UserRole.ADMIN ? <AppSettings company={company} setCompany={(c) => setDoc(doc(db, "settings", "company"), c)} user={user} onUpdateUser={(u) => { setUser(u); localStorage.setItem('susu_user', JSON.stringify(u)); }} /> : <Navigate to="/reservas" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;
