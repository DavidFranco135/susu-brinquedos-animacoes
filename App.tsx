import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";
import { getFirestore, collection, onSnapshot, doc, setDoc, query, orderBy } from "firebase/firestore";

import { UserProvider, useUser } from './contexts/UserContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Rentals from './pages/Rentals';
import Staff from './pages/Staff';
import AppSettings from './pages/AppSettings';
import { User, UserRole, Toy, Customer, Rental, FinancialTransaction, CompanySettings as CompanyType } from './types';
import { Loader2 } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBUvwY-e7h0KZyFJv7n0ignpzlMUGJIurU",
  authDomain: "niklaus-b2b.firebaseapp.com",
  projectId: "niklaus-b2b",
  storageBucket: "niklaus-b2b.firebasestorage.app",
  messagingSenderId: "936430517671",
  appId: "1:936430517671:web:6a0f1b86a39621d74c4a82"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const AppContent: React.FC = () => {
  const { user, loading } = useUser();
  const [staff, setStaff] = useState<User[]>([]);
  const [toys, setToys] = useState<Toy[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [company, setCompany] = useState<CompanyType | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listeners em tempo real
    const unsubStaff = onSnapshot(collection(db, "users"), (snap) => {
      setStaff(snap.docs.map(d => ({ ...d.data(), id: d.id })) as User[]);
    });

    const unsubToys = onSnapshot(collection(db, "toys"), (snap) => {
      setToys(snap.docs.map(d => ({ ...d.data(), id: d.id })) as Toy[]);
    });

    const unsubCompany = onSnapshot(doc(db, "settings", "company"), (d) => {
      if (d.exists()) setCompany(d.data() as CompanyType);
    });

    return () => { unsubStaff(); unsubToys(); unsubCompany(); };
  }, [user]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <Router>
      <Layout user={user} onLogout={() => signOut(auth)}>
        <Routes>
          <Route index element={<Dashboard rentals={rentals} toys={toys} customers={customers} staff={staff} />} />
          <Route path="/inventario" element={<Inventory toys={toys} setToys={() => {}} categories={[]} setCategories={() => {}} />} />
          
          {/* ROTA CORRIGIDA: Sem lógica de gravação automática */}
          <Route path="/colaboradores" element={
            user.role === UserRole.ADMIN ? (
              <Staff staff={staff} setStaff={setStaff} />
            ) : <Navigate to="/" />
          } />

          <Route path="/configuracoes" element={<AppSettings company={company || {} as CompanyType} setCompany={(c) => setDoc(doc(db, "settings", "company"), c)} user={user} onUpdateUser={(u) => setDoc(doc(db, "users", u.id), u)} />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
