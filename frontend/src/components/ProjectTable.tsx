import React, { useState } from 'react';
import { Project, UserRole } from '../types';
import {
  Plus,
  Search,
  Layers,
  Eye,
  Trash2,
  Globe,
  FileText,
  BarChart2,
} from 'lucide-react';

interface ProjectTableProps {
  projects: Project[];
  onCreateProject: (name: string, description?: string) => Promise<void>;
  onDeleteProject: (id: number) => Promise<void>;
  onSelectProjectOnMap: (projectId: number) => void;
  onOpenCompare?: () => void;
  onOpenExportSummary?: (project: Project) => void;
  userRole?: UserRole;
  searchQuery?: string;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onCreateProject,
  onDeleteProject,
  onSelectProjectOnMap,
  onOpenCompare,
  onOpenExportSummary,
  userRole,
  searchQuery: externalSearchQuery = '',
}) => {
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'archived'
  >('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeSearch = externalSearchQuery || internalSearchQuery;

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      (p.description &&
        p.description.toLowerCase().includes(activeSearch.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setErrorMsg('Project name is required');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onCreateProject(
        newProjectName.trim(),
        newProjectDesc.trim() || undefined
      );
      setNewProjectName('');
      setNewProjectDesc('');
      setShowCreateModal(false);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to create project'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        padding: '24px',
        height: '100%',
        overflowY: 'auto',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '20px',
              color: 'var(--color-ink)',
              fontWeight: 700,
            }}
          >
            Conservation Projects Directory
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-ink-muted)',
              marginTop: '2px',
            }}
          >
            High-density enterprise index of carbon offset reserves and
            biodiversity restoration projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              className="btn-secondary"
              style={{ height: '32px', fontSize: '12px' }}
            >
              <BarChart2 size={14} className="text-emerald-600" />
              Compare Sites
            </button>
          )}

          {(userRole === 'admin' || userRole === 'analyst') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-canopy"
              style={{ height: '32px', fontSize: '12px' }}
            >
              <Plus size={14} />
              New Project
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card-container"
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '10px 14px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={14}
            color="var(--color-ink-muted)"
            style={{
              position: 'absolute',
              left: '10px',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Filter projects by name or description..."
            value={internalSearchQuery}
            onChange={(e) => setInternalSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '30px', height: '30px', fontSize: '12px' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(e.target.value as 'all' | 'active' | 'archived')
          }
          className="input-field"
          style={{ width: '150px', height: '30px', fontSize: '12px' }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active projects</option>
          <option value="archived">Archived projects</option>
        </select>
      </div>

      {/* Scannable Project Index Table */}
      <div className="card-container" style={{ overflow: 'hidden' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              className="font-mono"
              style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid var(--color-line)',
                fontSize: '10px',
                color: 'var(--color-ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '10px 16px' }}>Project Name</th>
              <th style={{ padding: '10px 16px' }}>Status</th>
              <th style={{ padding: '10px 16px' }}>Sites Count</th>
              <th style={{ padding: '10px 16px' }}>Estimated Hectares</th>
              <th style={{ padding: '10px 16px' }}>Created Date</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '36px',
                    textAlign: 'center',
                    color: 'var(--color-ink-muted)',
                    fontSize: '13px',
                  }}
                >
                  No sites yet in this project. Draw one on the map to get
                  started.
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => {
                const estHectares = (project.site_count || 1) * 128;

                return (
                  <tr
                    key={project.id}
                    style={{
                      borderBottom: '1px solid var(--color-line)',
                      transition: 'background-color 0.12s ease',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#F8FAFC')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div
                        style={{ fontWeight: 600, color: 'var(--color-ink)' }}
                      >
                        {project.name}
                      </div>
                      {project.description && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-ink-muted)',
                            marginTop: '2px',
                          }}
                        >
                          {project.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className={
                          project.status === 'active'
                            ? 'badge badge-emerald'
                            : 'badge badge-neutral'
                        }
                      >
                        {project.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        className="font-mono"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                        }}
                      >
                        <Layers size={13} color="var(--color-teal)" />
                        {project.site_count || 0} sites
                      </span>
                    </td>
                    <td
                      className="font-mono"
                      style={{ padding: '12px 16px', fontSize: '12px' }}
                    >
                      {estHectares.toLocaleString()} ha
                    </td>
                    <td
                      className="font-mono"
                      style={{
                        padding: '12px 16px',
                        fontSize: '11px',
                        color: 'var(--color-ink-muted)',
                      }}
                    >
                      {project.created_at
                        ? new Date(project.created_at).toLocaleDateString()
                        : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => onSelectProjectOnMap(project.id)}
                          className="btn-secondary"
                          style={{
                            height: '26px',
                            fontSize: '11px',
                            padding: '0 8px',
                          }}
                        >
                          <Eye size={12} />
                          Inspect Map
                        </button>

                        {onOpenExportSummary && (
                          <button
                            onClick={() => onOpenExportSummary(project)}
                            className="btn-secondary"
                            style={{
                              height: '26px',
                              fontSize: '11px',
                              padding: '0 8px',
                            }}
                            title="Export executive project summary report"
                          >
                            <FileText size={12} className="text-emerald-600" />
                            Summary
                          </button>
                        )}

                        {userRole === 'admin' && (
                          <button
                            onClick={() => onDeleteProject(project.id)}
                            className="btn-danger"
                            style={{
                              height: '26px',
                              fontSize: '11px',
                              padding: '0 8px',
                            }}
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="card-container"
            style={{
              width: '440px',
              padding: '20px 24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <Globe size={18} color="var(--color-teal)" />
              <h2
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                }}
              >
                Create Conservation Project
              </h2>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid rgba(181, 86, 60, 0.4)',
                  color: 'var(--color-clay)',
                  fontSize: '12px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Western Ghats Biodiversity Reserve"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input-field"
                  style={{ height: '32px' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  Description & Regional Objectives
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of carbon offset targets, ecosystem type, and regional focus..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="input-field"
                  style={{ height: 'auto', padding: '8px 10px' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  style={{ height: '30px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-canopy"
                  style={{ height: '30px' }}
                >
                  {isSubmitting ? 'Creating Project...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
