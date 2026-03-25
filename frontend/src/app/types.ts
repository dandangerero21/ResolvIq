// Feature: Types - Data models for the application

export type UserRole = 'user' | 'staff' | 'admin';

export type ComplaintStatus = 'open' | 'Open' | 'assigned' | 'In Progress' | 'resolved' | 'Resolved' | 'cancelled' | 'Cancelled';

export type ComplaintCategory = 
  | 'Technical Issue' 
  | 'Billing' 
  | 'Account Access' 
  | 'Product Defect' 
  | 'Service Quality' 
  | 'Other';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface User {
  userId?: number;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  specialization?: string;
}

export interface Message {
  messageId?: number;
  id?: string;
  complaintId: number;
  senderId: number;
  senderName: string;
  senderRole?: UserRole;
  content: string;
  timestamp: Date;
  isSolved?: boolean;
  isSolutionProposal?: boolean;
  isSystemMessage?: boolean;
}

export interface Complaint {
  complaintId?: number;
  id?: string;
  createdById?: number;
  userId?: string;
  userName?: string;
  createdByName?: string;
  title: string;
  description: string;
  categoryId?: number;
  categoryName?: string;
  /** User-provided label when category is Other */
  customCategory?: string;
  category?: ComplaintCategory;
  priority?: Priority;
  status: ComplaintStatus;
  assignedStaffId?: number;
  assignedStaffName?: string;
  createdAt?: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  rating?: number;
  messages?: Message[];
  assignment?: Assignment;
}

export interface Assignment {
  assignmentId?: number;
  complaintId: number;
  assignedToId: number;
  assignedToName: string;
  assignedToSpecialization?: string;
}
