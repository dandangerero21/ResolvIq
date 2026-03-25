import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import userService, { User } from '../../../services/userService';
import complaintService from '../../../services/complaintService';
import { Complaint } from '../../types';
import {
  ArrowLeft,
  Mail,
  Star,
  CheckCircle2,
  Clock,
  Zap,
  Loader,
} from 'lucide-react';

export function StaffDirectory() {
  const navigate = useNavigate();
  const [staffMembers, setStaffMembers] = useState<User[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [staff, complaintsList] = await Promise.all([
          userService.getStaffMembers(),
          complaintService.getAllComplaints(),
        ]);
        setStaffMembers(staff);
        setComplaints(complaintsList);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const getStaffStats = (staffId: number) => {
    const staffComplaints = complaints.filter(c => {
      // Compare as numbers - assignedStaffId could be number or string from backend
      const complaintStaffId = typeof c.assignedStaffId === 'string' ? Number(c.assignedStaffId) : c.assignedStaffId;
      return complaintStaffId === staffId;
    });
    const active = staffComplaints.filter(c => c.status !== 'resolved' && c.status !== 'Resolved').length;
    const resolved = staffComplaints.filter(c => c.status === 'resolved' || c.status === 'Resolved');
    const rated = resolved.filter(c => c.rating);
    const avgRating =
      rated.length > 0
        ? (rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length).toFixed(1)
        : null;
    return { total: staffComplaints.length, active, resolved: resolved.length, avgRating };
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-white/5 backdrop-blur px-8 py-6">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors cursor-target"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Admin Panel</p>
        <h1 className="text-white" style={{ fontWeight: 700 }}>Staff Directory</h1>
        <p className="text-white/60 text-sm mt-0.5">{staffMembers.length} staff members</p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-6 h-6 text-white/60 animate-spin mb-3" />
            <p className="text-white/60 text-sm">Loading staff members...</p>
          </div>
        ) : staffMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-white/60 text-sm">No staff members yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {staffMembers.map(staff => {
              const stats = getStaffStats(staff.userId);
              return (
                <div
                  key={staff.userId}
                  className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl overflow-hidden hover:bg-white/20 transition-all cursor-target"
              >
                {/* Card Header */}
                <div className="bg-black px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white flex-shrink-0" style={{ fontWeight: 700, fontSize: '14px' }}>
                    {staff.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{staff.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3 h-3 text-white/40" />
                      <p className="text-white/40 text-xs truncate">{staff.email}</p>
                    </div>
                  </div>
                  {stats.avgRating && (
                    <div className="flex items-center gap-1 bg-amber-500 rounded-full px-2 py-0.5 flex-shrink-0">
                      <Star className="w-3 h-3 fill-white text-white" />
                      <span className="text-white text-xs" style={{ fontWeight: 700 }}>{stats.avgRating}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
                  <div className="flex flex-col items-center py-3 px-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="w-3 h-3 text-white/60" />
                    </div>
                    <p className="text-white" style={{ fontWeight: 700 }}>{stats.total}</p>
                    <p className="text-white/60 text-xs">Total</p>
                  </div>
                  <div className="flex flex-col items-center py-3 px-2">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                    </div>
                    <p className="text-amber-300" style={{ fontWeight: 700 }}>{stats.active}</p>
                    <p className="text-white/60 text-xs">Active</p>
                  </div>
                  <div className="flex flex-col items-center py-3 px-2">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                    <p className="text-emerald-300" style={{ fontWeight: 700 }}>{stats.resolved}</p>
                    <p className="text-white/60 text-xs">Resolved</p>
                  </div>
                </div>

                {/* Specializations */}
                <div className="p-4">
                  <p className="text-xs text-white/60 mb-2.5 uppercase tracking-wider">Specializations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {staff.specialization && staff.specialization.split(',').map(spec => (
                      <span
                        key={spec.trim()}
                        className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-full"
                      >
                        {spec.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}