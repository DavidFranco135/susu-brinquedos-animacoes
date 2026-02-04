import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, getDoc } from 'firebase/firestore';

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
        // ✅ Busca o documento do usuário no Firestore
        const unsubUser = onSnapshot(doc(db, "users", firebaseUser.uid), async (docSnap) => {
          if (docSnap.exists()) {
            // ✅ Usuário existe no Firestore - carrega normalmente
            setUser(docSnap.data() as User);
            setLoading(false);
          } else {
            // ❌ REMOVIDO: Criação automática de usuário
            // Se o usuário não existe no Firestore, NÃO cria automaticamente
            // Isso significa que apenas usuários criados manualmente em "Colaboradores" terão acesso
            
            console.warn('⚠️ Usuário autenticado mas sem documento no Firestore:', firebaseUser.email);
            console.warn('📋 Para dar acesso, crie o usuário em: Colaboradores → Novo Colaborador');
            
            // Define user como null para bloquear acesso
            setUser(null);
            setLoading(false);
          }
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
