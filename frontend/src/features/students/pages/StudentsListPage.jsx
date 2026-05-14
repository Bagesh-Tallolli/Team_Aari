import React, { useState, useEffect } from 'react';
import MainLayout from '../../../components/layout/MainLayout.jsx';
import Table from '../../../components/common/Table.jsx';
import { useNavigate } from 'react-router-dom';
import { SkeletonTable } from '../../../components/common/Skeleton.jsx';
import apiService from '../../../services/apiService.js';

function StudentsListPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        // Use public data endpoint first to avoid auth-gated failures in dashboard mode.
        let studentsResult = await apiService.data.getAllStudents(page, limit);
        if (!studentsResult.success) {
          studentsResult = await apiService.students.getAll(page, limit);
        }

        if (studentsResult.success) {
          // Map to match UI expectations
          const formattedStudents = studentsResult.data.map(student => ({
            ...student,
            gender: student.gender || student.sex || 'Other',
            bmi: student.current_bmi || 0,
            riskLevel: student.risk_level || 'healthy'
          }));

          setTotal(studentsResult.total || 0);
          setStudents(formattedStudents);
        } else {
          setError(studentsResult.error || 'Failed to fetch students');
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

    fetchStudents();

    // Refresh when a new student is registered elsewhere
    const onRegistered = () => setPage(1);
    window.addEventListener('studentRegistered', onRegistered);
    return () => window.removeEventListener('studentRegistered', onRegistered);
  }, [page, limit]);

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'rfid_card_id', label: 'RFID' },
    {
      key: 'age',
      label: 'Age',
      render: (value) => value ? `${value} yrs` : 'N/A',
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (value) => value || 'Other',
    },
    { key: 'height', label: 'Height (cm)' },
    { key: 'weight', label: 'Weight (kg)' },
    {
      key: 'bmi',
      label: 'BMI',
      render: (value) => value ? parseFloat(value).toFixed(1) : 'N/A',
    },
    {
      key: 'riskLevel',
      label: 'Risk Level',
      render: (value) => {
        const level = value?.charAt(0).toUpperCase() + value?.slice(1).replace('_', ' ');
        const colors = {
          'Healthy': 'text-green-400',
          'At risk': 'text-yellow-400',
          'Underweight': 'text-blue-400',
        };
        return <span className={colors[level] || 'text-slate-300'}>{level}</span>;
      },
    },
  ];

  if (loading) {
    return (
      <MainLayout>
        <SkeletonTable rows={8} columns={4} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fadeIn">
        <div>
          <h1 className="text-3xl font-bold text-white">Students</h1>
          <p className="text-slate-400 mt-1">Manage and monitor students — showing page {page}</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-200 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}

        <Table
          columns={columns}
          data={students}
          onRowClick={(row) => navigate(`/students/${row.id}`)}
          emptyMessage={students.length === 0 ? "No students found" : ""}
        />

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-slate-400">Total: {total}</div>
          <div className="space-x-2">
            <button
              className="px-3 py-1 bg-slate-800 rounded disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <button
              className="px-3 py-1 bg-slate-800 rounded disabled:opacity-50"
              onClick={() => setPage((p) => p + 1)}
              disabled={students.length === 0 || page * limit >= total}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default StudentsListPage;
