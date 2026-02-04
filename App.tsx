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

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await new Promise<any>((resolve) => {
        onSnapshot(doc(db, "users", userCredential.user.uid), (doc) => {
          resolve(doc.data());
        });
      });

      if (userDoc) {
        login({
          id: userCredential.user.uid,
          email: userDoc.email,
          name: userDoc.name,
          role: userDoc.role,
          allowedPages: userDoc.allowedPages
        });
      }
    } catch (error) {
      alert('Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[48px] shadow-xl p-12 border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <UserIcon size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Acesso Restrito</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] mt-2 tracking-widest">Painel Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">E-mail</label>
            <input
              type="email"
              required
              className="w-full px-8 py-5 bg-slate-50 rounded-3xl border-none focus:ring-4 focus:ring-blue-500/10 font-bold transition-all outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Senha</label>
            <input
              type="password"
              required
              className="w-full px-8 py-5 bg-slate-50 rounded-3xl border-none focus:ring-4 focus:ring-blue-500/10 font-bold transition-all outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, logout, login } = useUser();
  const [staff, setStaff] = useState<User[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [company, setCompany] = useState<CompanyType | null>(null);

  useEffect(() => {
    const qStaff = query(collection(db, "users"));
    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as User[];
      setStaff(data);
    });

    const qToys = query(collection(db, "toys"));
    const unsubToys = onSnapshot(qToys, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Toy[];
      setToys(data);
    });

    const qCats = query(collection(db, "categories"));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data().name) as string[];
      setCategories(data);
    });

    const qCustomers = query(collection(db, "customers"));
    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Customer[];
      setCustomers(data);
    });

    const qRentals = query(collection(db, "rentals"), orderBy("date", "desc"));
    const unsubRentals = onSnapshot(qRentals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Rental[];
      setRentals(data);
    });

    const qTransactions = query(collection(db, "transactions"), orderBy("date", "desc"));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FinancialTransaction[];
      setTransactions(data);
    });

    const unsubCompany = onSnapshot(doc(db, "settings", "company"), (doc) => {
      if (doc.exists()) setCompany(doc.data() as CompanyType);
    });

    return () => {
      unsubStaff();
      unsubToys();
      unsubCats();
      unsubCustomers();
      unsubRentals();
      unsubTransactions();
      unsubCompany();
    };
  }, []);

  const handleUpdateCompany = async (newCompany: CompanyType) => {
    await setDoc(doc(db, "settings", "company"), newCompany);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await setDoc(doc(db, "users", updatedUser.id), updatedUser);
    login(updatedUser);
  };

  const handleLogout = async () => {
    await signOut(auth);
    logout();
  };

  const hasAccess = (pageId: string) => {
    if (user.role === UserRole.ADMIN) return true;
    return user.allowedPages?.includes(pageId);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user.id ? <Login /> : <Navigate to="/" />} />
        <Route path="/resumo-reserva/:id" element={<PublicRentalSummary rentals={rentals} company={company || {} as CompanyType} />} />
        <Route path="/catalogo/:companyId" element={<PublicCatalog />} />
        
        <Route path="/" element={
          !user.id ? <Navigate to="/login" /> : (
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                <Route index element={<Dashboard rentals={rentals} toys={toys} customers={customers} staff={staff} />} />
                <Route path="/reservas" element={<Rentals rentals={rentals} setRentals={setRentals} toys={toys} customers={customers} />} />
                <Route path="/disponibilidade" element={<Availability toys={toys} rentals={rentals} />} />
                <Route path="/financeiro" element={hasAccess('financial') ? <Financial transactions={transactions} setTransactions={setTransactions} rentals={rentals} /> : <Navigate to="/reservas" />} />
                <Route path="/clientes" element={hasAccess('customers') ? <CustomersPage customers={customers} setCustomers={setCustomers} /> : <Navigate to="/reservas" />} />
                <Route path="/orcamentos" element={hasAccess('budgets') ? <BudgetsPage rentals={rentals} setRentals={setRentals} toys={toys} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />
                <Route path="/inventario" element={hasAccess('toys') ? <Inventory toys={toys} setToys={setToys} categories={categories} setCategories={setCategories} /> : <Navigate to="/reservas" />} />
                <Route path="/recibos" element={hasAccess('documents') ? <DocumentsPage type="receipt" rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />
                
                {/* ROTA CORRIGIDA ABAIXO - REMOVIDA LÓGICA DE SETDOC REPETITIVA */}
                <Route path="/colaboradores" element={
                  user.role === UserRole.ADMIN ? (
                    <Staff 
                      staff={staff.filter(u => u.email !== 'admsusu@gmail.com')} 
                      setStaff={setStaff} 
                    />
                  ) : <Navigate to="/reservas" />
                } />

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

const App: React.FC = () => (
  <UserProvider>
    <AppContent />
  </UserProvider>
);

export default App;
