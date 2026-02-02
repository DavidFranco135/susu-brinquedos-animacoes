import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
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
  orderBy,
  deleteDoc
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

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.appspot.com",
  messagingSenderId: "367332768565",
  appId: "1:367332768565:web:2f03f3747d337257917246"
};

// Inicialização única do Firebase para evitar erros de console
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toys, setToys] = useState<Toy[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [company, setCompany] = useState<CompanyType | null>(null);
  const [categories, setCategories] = useState<string[]>(['Geral', 'Infláveis', 'Eletrônicos', 'Jogos']);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = doc(db, "users", firebaseUser.uid);
        onSnapshot(userDoc, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    onSnapshot(query(collection(db, "toys")), (s) => setToys(s.docs.map(d => ({ ...d.data() as Toy, id: d.id }))));
    onSnapshot(query(collection(db, "rentals"), orderBy("date", "desc")), (s) => setRentals(s.docs.map(d => ({ ...d.data() as Rental, id: d.id }))));
    onSnapshot(query(collection(db, "customers")), (s) => setCustomers(s.docs.map(d => ({ ...d.data() as Customer, id: d.id }))));
    onSnapshot(query(collection(db, "users")), (s) => setStaff(s.docs.map(d => ({ ...d.data() as User, id: d.id }))));
    onSnapshot(query(collection(db, "transactions"), orderBy("date", "desc")), (s) => setTransactions(s.docs.map(d => ({ ...d.data() as FinancialTransaction, id: d.id }))));
    onSnapshot(doc(db, "settings", "company"), (d) => d.exists() && setCompany(d.data() as CompanyType));

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = () => signOut(auth);
  const handleUpdateUser = (u: User) => setDoc(doc(db, "users", u.id), u);
  const handleUpdateCompany = (c: CompanyType) => setDoc(doc(db, "settings", "company"), c);

  // FUNÇÃO QUE GARANTE QUE O ADMIN ACESSA TUDO E O COLABORADOR SÓ O PERMITIDO
  const hasAccess = (pageId: string) => {
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true; // Se for ADMIN, ignora as travas
    return user.allowedPages?.includes(pageId); // Se for COLABORADOR, checa a lista
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600" size={40} />
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/resumo-reserva/:id" element={<PublicRentalSummary rentals={rentals} toys={toys} company={company || {} as CompanyType} />} />
        
        <Route path="/*" element={
          !user ? <Navigate to="/login" /> : (
            <Layout user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser}>
              <Routes>
                <Route path="/" element={hasAccess('dashboard') ? <Dashboard toys={toys} rentals={rentals} transactions={transactions} /> : <Navigate to="/reservas" />} />
                
                <Route path="/estoque" element={hasAccess('toys') ? <Inventory toys={toys} setToys={setToys} categories={categories} setCategories={setCategories} /> : <Navigate to="/reservas" />} />
                
                <Route path="/reservas" element={hasAccess('rentals') ? <Rentals rentals={rentals} setRentals={() => {}} toys={toys} customers={customers} /> : <Navigate to="/login" />} />
                
                <Route path="/disponibilidade" element={<Availability toys={toys} rentals={rentals} />} />
                
                <Route path="/financeiro" element={hasAccess('financial') ? <Financial transactions={transactions} rentals={rentals} /> : <Navigate to="/reservas" />} />
                
                <Route path="/clientes" element={hasAccess('customers') ? <CustomersPage customers={customers} rentals={rentals} /> : <Navigate to="/reservas" />} />
                
                <Route path="/orcamentos" element={hasAccess('budgets') ? <BudgetsPage rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />
                
                <Route path="/contratos" element={hasAccess('documents') ? <DocumentsPage type="contract" rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />
                <Route path="/recibos" element={hasAccess('documents') ? <DocumentsPage type="receipt" rentals={rentals} customers={customers} company={company || {} as CompanyType} /> : <Navigate to="/reservas" />} />

                {/* Áreas exclusivas de Configuração do Admin */}
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

export default App;
