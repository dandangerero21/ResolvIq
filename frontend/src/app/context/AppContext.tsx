import { createContext, useContext, useState, ReactNode } from 'react';
import { Complaint, Message } from '../types';

interface AppContextType {
  complaints: Complaint[];
  messages: Message[];
  addMessage: (message: Message) => void;
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  assignComplaint: (complaintId: string, staffId: string, staffName: string) => void;
  resolveComplaint: (complaintId: string, rating: number) => void;
  cancelComplaint: (complaintId: string) => void;
  addComplaint: (complaint: Complaint) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const updateComplaint = (id: string, updates: Partial<Complaint>) => {
    setComplaints(prev =>
      prev.map(c => (c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c))
    );
  };

  const assignComplaint = (complaintId: string, staffId: string, staffName: string) => {
    setComplaints(prev =>
      prev.map(c =>
        c.id === complaintId
          ? {
              ...c,
              assignedStaffId: Number(staffId),
              assignedStaffName: staffName,
              status: 'In Progress',
              updatedAt: new Date(),
            }
          : c
      )
    );
  };

  const resolveComplaint = (complaintId: string, rating: number) => {
    setComplaints(prev =>
      prev.map(c =>
        c.id === complaintId
          ? {
              ...c,
              status: 'Resolved',
              rating,
              resolvedAt: new Date(),
              updatedAt: new Date(),
            }
          : c
      )
    );
  };

  const cancelComplaint = (complaintId: string) => {
    setComplaints(prev =>
      prev.map(c =>
        c.id === complaintId
          ? {
              ...c,
              status: 'Cancelled',
              updatedAt: new Date(),
            }
          : c
      )
    );
  };

  const addComplaint = (complaint: Complaint) => {
    setComplaints(prev => [complaint, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        complaints,
        messages,
        addMessage,
        updateComplaint,
        assignComplaint,
        resolveComplaint,
        cancelComplaint,
        addComplaint,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
