import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Trash2,
  Eye,
  ShieldCheck,
  RefreshCw,
  LayoutGrid,
  List,
} from 'lucide-react';
import PersonCard from '../components/PersonCard';
import { api } from '../services/api';

export default function RegisteredPeople({ onSelectPerson }) {
  const [people, setPeople] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [deleteModal, setDeleteModal] = useState(null); // { id, code }

  const loadPeople = async () => {
    setLoading(true);
    try {
      const res = await api.getRegisteredFaces(search);
      setPeople(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.warn('Failed to load registered people:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadPeople, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await api.deletePerson(deleteModal.id);
      setDeleteModal(null);
      loadPeople();
    } catch (err) {
      alert(`Deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Registered People Directory ({total})
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Cryptographically encrypted biometric profiles and protected registration snapshots.
          </p>
        </div>

        {/* Search & View Toggle */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs ${
                viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-indigo-500 shadow-sm' : 'text-gray-400'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs ${
                viewMode === 'table' ? 'bg-white dark:bg-gray-700 text-indigo-500 shadow-sm' : 'text-gray-400'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Directory Grid / Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Querying encrypted biometric database...</span>
        </div>
      ) : people.length === 0 ? (
        <div className="py-16 text-center text-gray-400 dark:text-gray-500 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300">No Registered People Found</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            Start the camera scanner to allow the identity verification engine to enroll genuinely new consented individuals.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              onView={(id) => onSelectPerson(id)}
              onDelete={(id, code) => setDeleteModal({ id, code })}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 uppercase text-[10px] font-semibold border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-4 py-3">Person Code</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Registered Date</th>
                <th className="px-4 py-3">Latest Mood</th>
                <th className="px-4 py-3">Consent Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {people.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-indigo-500">
                    {person.person_code}
                  </td>
                  <td className="px-4 py-3">
                    <img
                      src={person.registration_image_path}
                      alt={person.name}
                      className="w-8 h-8 rounded-lg object-cover bg-gray-700 border border-gray-700"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                    {person.name}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(person.registered_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                      {person.latest_expression || 'Neutral'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-emerald-400 capitalize">{person.consent_status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => onSelectPerson(person.id)}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-indigo-400"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ id: person.id, code: person.person_code })}
                      className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-red-400"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal (GDPR & Privacy Compliance) */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2 text-red-500">
              <Trash2 className="w-5 h-5" />
              Delete Biometric Record?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Are you sure you want to permanently delete <strong>{deleteModal.code}</strong>? This will permanently purge the registration photo, encrypted 128D embeddings, session history, and expression logs. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-all"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
