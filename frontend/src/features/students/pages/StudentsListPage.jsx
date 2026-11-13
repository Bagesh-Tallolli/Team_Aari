import React, { useState, useEffect } from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import Table from '../../../components/common/Table.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { SkeletonTable } from '../../../components/common/Skeleton.jsx';
import apiService from '../../../services/apiService.js';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

function StudentsListPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('all');

  const navigate = useNavigate();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const riskParam = selectedRisk === 'all' ? null : selectedRisk;
      const searchParam = searchTerm.trim() || null;

      let result = await apiService.students.getAll(page, limit, searchParam, riskParam);
      if (!result.success) {
        result = await apiService.data.getAllStudents(page, limit);
      }

      if (result.success) {
        const rawList = Array.isArray(result.data)
          ? result.data
          : result.data?.students || [];

        const formatted = rawList.map((s) => ({
          ...s,
          gender: s.gender || s.sex || 'Other',
          bmi: s.current_bmi || 0,
          riskLevel: s.risk_level || 'healthy',
          classGrade: s.class_grade || 'Primary',
        }));

        setTotal(result.total || result.data?.total || rawList.length);
        setStudents(formatted);
      } else {
        setError(result.error || 'Failed to fetch students roster');
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();

    const onRegistered = () => setPage(1);
    window.addEventListener('studentRegistered', onRegistered);
    return () => window.removeEventListener('studentRegistered', onRegistered);
  }, [page, limit, selectedRisk]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const columns = [
    {
      key: 'name',
      label: 'Student Name',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-white">{val}</p>
          <p className="text-[11px] text-slate-400 font-mono">
            {row.admission_number || `ID: #${row.id}`}
          </p>
        </div>
      ),
    },
    {
      key: 'classGrade',
      label: 'Class & Section',
      render: (val, row) => (
        <span className="text-xs text-slate-300">
          {val} {row.section ? `(${row.section})` : ''}
        </span>
      ),
    },
    {
      key: 'rfid_card_id',
      label: 'RFID UID',
      render: (val) => (
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
          {val || 'None'}
        </span>
      ),
    },
    {
      key: 'age',
      label: 'Age / Sex',
      render: (val, row) => (
        <span className="text-xs text-slate-300">
          {val ? `${val}y` : '--'} • {row.gender}
        </span>
      ),
    },
    {
      key: 'bmi',
      label: 'BMI (kg/m²)',
      render: (val) => (
        <span className="text-xs font-semibold text-white">
          {val ? parseFloat(val).toFixed(1) : '--'}
        </span>
      ),
    },
    {
      key: 'riskLevel',
      label: 'Health Status',
      render: (value) => {
        const level = value?.toLowerCase();
        let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        let label = 'Healthy';

        if (level === 'at_risk' || level === 'at risk') {
          badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
          label = 'At Risk';
        } else if (level === 'critical') {
          badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
          label = 'Critical';
        } else if (level === 'underweight') {
          badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
          label = 'Thinness';
        }

        return (
          <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${badgeColor}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/students/${row.id}`)}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors"
          >
            Profile
          </button>
          <button
            onClick={() => navigate(`/students/nutrition-tracker?studentId=${row.id}`)}
            className="px-2.5 py-1 text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors"
          >
            Nutrition
          </button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Student Nutrition Registry
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Active roster of students tracked for PM POSHAN meal distribution and growth screening
            </p>
          </div>

          <Link
            to="/students/register"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all self-start sm:self-auto"
          >
            <UserPlus size={16} />
            <span>Enroll New Student</span>
          </Link>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name..."
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </form>

          {/* Status Filter buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mr-1">
              <Filter size={13} /> Status:
            </span>
            {[
              { id: 'all', label: 'All Students' },
              { id: 'healthy', label: 'Healthy' },
              { id: 'at_risk', label: 'At Risk' },
              { id: 'critical', label: 'Critical' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => { setSelectedRisk(f.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedRisk === f.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-800 text-red-200 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Table / List */}
        {loading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <Table
              columns={columns}
              data={students}
              onRowClick={(row) => navigate(`/students/${row.id}`)}
              emptyMessage="No students match the selected criteria."
            />
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs text-slate-400 px-2">
          <span>
            Total: <strong className="text-white">{total}</strong> enrolled students
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg disabled:opacity-40 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="px-2">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={students.length === 0 || page * limit >= total}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg disabled:opacity-40 flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>
    </MainLayout>
  );
}

export default StudentsListPage;