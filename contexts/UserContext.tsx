import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

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

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Monitora em tempo real o documento do usuário no Firestore
        const unsubUser = onSnapshot(doc(db, "users", firebaseUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          } else {
            // Se não existe, cria um novo usuário
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.email?.split('@')[0] || 'Usuário',
              email: firebaseUser.email || '',
              role: firebaseUser.email === 'admsusu@gmail.com' ? 'ADMIN' : 'EMPLOYEE',
              allowedPages: []
            };
            setDoc(doc(db, "users", firebaseUser.uid), newUser);
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
