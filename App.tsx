import EmergencyAdminRestore from './components/EmergencyAdminRestore';

function App() {
  return (
    <div>

import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query,
  orderBy,
  deleteDoc
} from "firebase/firestore";

import { UserProvider, useUser } from './contexts/UserContext';
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
import PublicCatalog from './PublicCatalog';
import { Customer, Toy, Rental, User, UserRole, FinancialTransaction, CompanySettings as CompanyType } from './types';
import { User as UserIcon, Loader2, ExternalLink } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.firebasestorage.app",
  messagingSenderId: "936430517671",
  appId: "1:936430517671:web:6a0f1b86a39621d74c4a82",
  measurementId: "G-3VGKJGWFSY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// COMPONENTE DE LOGIN
const Login: React.FC<{ company: CompanyType | null }> = ({ company }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-slate-100" 
      style={{ 
        backgroundImage: company?.loginBgUrl ? `url(${company.loginBgUrl})` : 'none', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}
    >
      <div className="w-full max-w-md bg-white/90 backdrop-blur-md rounded-[40px] shadow-2xl p-10 border border-white/20 flex flex-col items-center">
        <div className="text-center mb-10 w-full flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-600 rounded-[30px] flex items-center justify-center mb-6 shadow-xl overflow-hidden">
             {company?.logoUrl ? <img src={company.logoUrl} className="w-full h-full object-cover" alt="Logo" /> : <UserIcon size={40} className="text-white" />}
          </div>
          <h2 className="text-xl font-black text-slate-800 tracking-widest uppercase">MAIS QUE BRINQUEDOS,
          momentos felizes.</h2>
          <p className="text-slate-500 mt-1 font-medium text-sm">{company?.name || 'SUSU Eventos'}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          {error && <div className="p-4 bg-red-50 text-red-500 text-xs font-bold rounded-2xl text-center">{error}</div>}
          <input type="email" required placeholder="E-mail" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required placeholder="Senha" className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-0 font-bold outline-none" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all shadow-xl uppercase tracking-widest text-sm flex items-center justify-center">
            {loading ? <Loader2 className="animate-spin" size={20}/> : 'Entrar'}
          </button>
        </form>
        
        <div className="w-full mt-6 pt-6 border-t border-slate-200">
          <a 
            href="#/catalogo" 
            className="w-full flex items-center justify-center gap-3 bg-slate-50 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-100 transition-all text-xs uppercase tracking-widest"
          >
            <ExternalLink size={16} /> Ver Catálogo Público
          </a>
        </div>
      </div>
    </div>
  );
};

// COMPONENTE PRINCIPAL QUE USA O CONTEXT
const AppContent: React.FC = () => {
  const { user, loading: userLoading } = useUser();
  const [toys, setToys] = useState<Toy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [company, setCompany] = useState<CompanyType | null>(null);

  useEffect(() => {
    // Carrega dados da empresa mesmo deslogado para o Login
    const unsubCompany = onSnapshot(doc(db, "settings", "company"), (docSnap) => {
      if (docSnap.exists()) setCompany(docSnap.data() as CompanyType);
    });

    if (!user) return;

    const unsubToys = onSnapshot(query(collection(db, "toys"), orderBy("name")), (snap) => setToys(snap.docs.map(d => ({ ...d.data(), id: d.id } as Toy))));
    const unsubCustomers = onSnapshot(query(collection(db, "customers"), orderBy("name")), (snap) => setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer))));
    const unsubRentals = onSnapshot(query(collection(db, "rentals"), orderBy("date", "desc")), (snap) => setRentals(snap.docs.map(d => ({ ...d.data(), id: d.id } as Rental))));
    const unsubFinancial = onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc")), (snap) => setTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id } as FinancialTransaction))));
    const unsubStaff = onSnapshot(collection(db, "users"), (snap) => setStaff(snap.docs.map(d => ({ ...d.data(), id: d.id } as User))));
    const unsubCategories = onSnapshot(doc(db, "settings", "categories"), (docSnap) => docSnap.exists() && setCategories(docSnap.data().list || []));

    return () => { unsubToys(); unsubCustomers(); unsubRentals(); unsubFinancial(); unsubCompany(); unsubStaff(); unsubCategories(); };
  }, [user]);

  const handleUpdateUser = async (updatedUser: User) => {
    if (updatedUser.id) {
      try {
        await setDoc(doc(db, "users", updatedUser.id), updatedUser, { merge: true });
      } catch (e) {
        console.error("Erro ao salvar perfil:", e);
      }
    }
  };

  const handleUpdateCompany = async (updatedCompany: CompanyType) => {
    await setDoc(doc(db, "settings", "company"), updatedCompany);
  };

  if (userLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  const hasAccess = (pageId: string) => user?.role === UserRole.ADMIN || user?.allowedPages?.includes(pageId);

  return (
    <Router>
      <Routes>
        <Route path="/catalogo" element={<PublicCatalog />} />
        
        <Route path="/resumo/:id" element={<PublicRentalSummary rentals={rentals} toys={toys} company={company || {} as CompanyType} />} />
        <Route path="*" element={
          !user ? <Login company={company} /> : (
            <Layout user={user} onLogout={() => signOut(auth)} onUpdateUser={handleUpdateUser}>
              <Routes>
                <Route path="/" element={hasAccess('dashboard') ? <Dashboard rentals={rentals} toysCount={toys.length} transactions={transactions} /> : <Navigate to="/reservas" />} />
                
                <Route path="/reservas" element={hasAccess('rentals') ? <Rentals rentals={rentals} setRentals={(a: any) => { 
                  const n = typeof a === 'function' ? a(rentals) : a; 
                  n.forEach((r: Rental) => setDoc(doc(db, "rentals", r.id), r)); 
                }} customers={customers} toys={toys} /> : <Navigate to="/" />} />
                
                <Route path="/brinquedos" element={hasAccess('toys') ? <Inventory 
                  toys={toys} 
                  setToys={(a: any) => { 
                    const n = typeof a === 'function' ? a(toys) : a; 
                    n.forEach((t: Toy) => setDoc(doc(db, "toys", t.id), t)); 
                  }} 
                  categories={categories} 
                  setCategories={(c) => setDoc(doc(db, "settings", "categories"), { list: c })}
                /> : <Navigate to="/reservas" />} />
                
                <Route path="/clientes" element={hasAccess('customers') ? <CustomersPage customers={customers} setCustomers={(a: any) => { 
                  const n = typeof a === 'function' ? a(customers) : a; 
                  n.forEach((c: Customer) => setDoc(doc(db, "customers", c.id), c)); 
                }} /> : <Navigate to="/reservas" />} />
                
                <Route path="/orcamentos" element={hasAccess('budgets') ? <BudgetsPage rentals={rentals} setRentals={(a: any) => { 
                  const n = typeof a === 'function' ? a(rentals) : a; 
                  n.forEach((r: Rental) => setDoc(doc(db, "rentals", r.id), r)); 
                }} customers={customers} toys={toys} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />

                <Route path="/disponibilidade" element={hasAccess('availability') || hasAccess('rentals') ? <Availability rentals={rentals} toys={toys} /> : <Navigate to="/reservas" />} />
                
                <Route path="/financeiro" element={hasAccess('financial') ? <Financial rentals={rentals} transactions={transactions} setTransactions={(a: any) => { 
                  const n = typeof a === 'function' ? a(transactions) : a; 
                  n.forEach((t: FinancialTransaction) => setDoc(doc(db, "transactions", t.id), t)); 
                }} /> : <Navigate to="/reservas" />} />
                
                <Route path="/contratos" element={hasAccess('documents') ? <DocumentsPage type="contract" rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />
                <Route path="/recibos" element={hasAccess('documents') ? <DocumentsPage type="receipt" rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />
                
                <Route path="/colaboradores" element={user.role === UserRole.ADMIN ? <Staff staff={staff.filter(u => u.email !== 'admsusu@gmail.com')} setStaff={(a: any) => { 
                  const n = typeof a === 'function' ? a(staff) : a; 
                  if (n.length < staff.length) { 
                    const r = staff.find(u => !n.find(nx => nx.id === u.id)); 
                    if (r) deleteDoc(doc(db, "users", r.id)); 
                  } 
                  n.forEach((u: User) => setDoc(doc(db, "users", u.id), u)); 
                }} /> : <Navigate to="/reservas" />} />

                <Route path="/configuracoes" element={user.role === UserRole.ADMIN ? <AppSettings company={company || {} as CompanyType} setCompany={handleUpdateCompany} user={user} onUpdateUser={handleUpdateUser} /> : <Navigate to="/reservas" />} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          )
        } />
      </Routes>
    </Router>
  );
};

// COMPONENTE WRAPPER COM O PROVIDER
const App: React.FC = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};
<EmergencyAdminRestore />
    </div>
  );
}
export default App;
