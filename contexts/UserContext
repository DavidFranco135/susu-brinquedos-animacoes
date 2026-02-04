import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, loading: true });

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser deve ser usado dentro de UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // ✅ CORREÇÃO: Verifica qual é o email admin atual no documento settings/admin
        let adminEmail = 'admsusu@gmail.com'; // valor padrão inicial
        
        try {
          const adminDoc = await getDoc(doc(db, "settings", "admin"));
          if (adminDoc.exists() && adminDoc.data().email) {
            adminEmail = adminDoc.data().email;
          } else {
            // Se não existe o documento, cria com o email padrão
            await setDoc(doc(db, "settings", "admin"), { email: adminEmail });
          }
        } catch (error) {
          console.log("Erro ao buscar email admin:", error);
        }

        // Monitora em tempo real o documento do usuário no Firestore
        const unsubUser = onSnapshot(doc(db, "users", firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else {
            // Se não existe, cria um novo usuário
            // ✅ CORREÇÃO: Agora compara com o email admin dinâmico
            const isAdmin = firebaseUser.email === adminEmail;
            
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.email?.split('@')[0] || 'Usuário',
              email: firebaseUser.email || '',
              role: isAdmin ? 'ADMIN' : 'EMPLOYEE',
              allowedPages: isAdmin ? [] : [] // Admin tem acesso a tudo
            };
            
            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
            setUser(newUser);
          }
          setLoading(false);
        });

        return () => unsubUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};
