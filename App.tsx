import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, query, orderBy, deleteDoc 
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
  messagingSenderId: "367175248550",
  appId: "1:367175248550:web:48a91443657b98f98ec43f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>(['Geral']);
  const [company, setCompany] = useState<CompanyType>({
    name: 'SUSU Animações',
    logoUrl: '', address: '', phone: '', email: '', contractTerms: ''
  });

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const local = localStorage.getItem('susu_user');
        setUser(local ? JSON.parse(local) : { id: fbUser.uid, email: fbUser.email, name: 'Admin', role: UserRole.ADMIN });
      } else { setUser(null); }
      setLoading(false);
    });

    // Escutando mudanças em tempo real no Firebase
    const unsubRentals = onSnapshot(collection(db, "rentals"), (snap) => {
      setRentals(snap.docs.map(d => d.data() as Rental));
    });
    const unsubCustomers = onSnapshot(collection(db, "customers"), (snap) => {
      setCustomers(snap.docs.map(d => d.data() as Customer));
    });
    const unsubToys = onSnapshot(collection(db, "toys"), (snap) => {
      setToys(snap.docs.map(d => d.data() as Toy));
    });
    const unsubTransactions = onSnapshot(collection(db, "transactions"), (snap) => {
      setTransactions(snap.docs.map(d => d.data() as FinancialTransaction));
    });
    const unsubCats = onSnapshot(doc(db, "settings", "categories"), (snap) => {
      if (snap.exists()) setCategories(snap.data().list || ['Geral']);
    });
    const unsubCompany = onSnapshot(doc(db, "settings", "company"), (snap) => {
      if (snap.exists()) setCompany(snap.data() as CompanyType);
    });

    return () => { unsubAuth(); unsubRentals(); unsubCustomers(); unsubToys(); unsubTransactions(); unsubCats(); unsubCompany(); };
  }, []);

  // Funções de Persistência (Cloud)
  const saveToFirebase = async (col: string, data: any) => {
    await setDoc(doc(db, col, data.id), data);
  };

  const handleUpdateCategories = (newList: string[]) => {
    setCategories(newList);
    setDoc(doc(db, "settings", "categories"), { list: newList });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  return (
    <Router>
      <Routes>
        <Route path="/resumo-publico/:id" element={<PublicRentalSummary rentals={rentals} toys={toys} company={company} />} />
        <Route path="/*" element={
          !user ? <Navigate to="/login" /> : (
            <Layout user={user} onLogout={() => signOut(auth)} onUpdateUser={setUser}>
              <Routes>
                <Route path="/" element={<Dashboard rentals={rentals} toysCount={toys.length} transactions={transactions} />} />
                
                <Route path="/clientes" element={<CustomersPage customers={customers} setCustomers={(action: any) => {
                  const next = typeof action === 'function' ? action(customers) : action;
                  next.forEach((c: Customer) => saveToFirebase("customers", c));
                }} />} />

                <Route path="/brinquedos" element={<Inventory toys={toys} categories={categories} setCategories={handleUpdateCategories} setToys={(action: any) => {
                  const next = typeof action === 'function' ? action(toys) : action;
                  next.forEach((t: Toy) => saveToFirebase("toys", t));
                }} />} />

                <Route path="/reservas" element={<Rentals 
                  rentals={rentals} 
                  customers={customers} 
                  toys={toys} 
                  categories={categories}
                  setRentals={(action: any) => {
                    const next = typeof action === 'function' ? action(rentals) : action;
                    next.forEach((r: Rental) => saveToFirebase("rentals", r));
                  }} 
                />} />

                <Route path="/financeiro" element={<Financial rentals={rentals} transactions={transactions} setTransactions={(action: any) => {
                  const next = typeof action === 'function' ? action(transactions) : action;
                  next.forEach((t: FinancialTransaction) => saveToFirebase("transactions", t));
                }} setRentals={()=>{}} />} />

                <Route path="/configuracoes" element={<AppSettings company={company} setCompany={(c) => setDoc(doc(db, "settings", "company"), c)} user={user} onUpdateUser={setUser} />} />
                <Route path="/disponibilidade" element={<Availability rentals={rentals} toys={toys} />} />
                <Route path="/orcamentos" element={<BudgetsPage rentals={rentals} customers={customers} toys={toys} company={company} />} />
              </Routes>
            </Layout>
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;
