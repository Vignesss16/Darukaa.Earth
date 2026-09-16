import React, { useState } from 'react';
import { Project, UserRole } from '../types';
import { Plus, Search, Layers, Eye, Trash2 } from 'lucide-react';

interface ProjectTableProps {
  projects: Project[];
  onCreateProject: (name: string, description?: string) => Promise<void>;
  onDeleteProject: (id: number) => Promise<void>;
  onSelectProjectOnMap: (projectId: number) => void;
  userRole?: UserRole;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onCreateProject,
  onDeleteProject,
  onSelectProjectOnMap,
  userRole,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'archived'
  >('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description &&
        p.description.toLowerCase().includes(searchQuery.toLowerCase()));
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
            className="heading-serif"
            style={{ fontSize: '24px', color: 'var(--color-ink)' }}
          >
            Conservation projects index
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-ink)',
              opacity: 0.75,
              marginTop: '2px',
            }}
          >
            Scannable index of all carbon and biodiversity project reserves
          </p>
        </div>

        {(userRole === 'admin' || userRole === 'analyst') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            Add project
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '16px',
          backgroundColor: '#FFFFFF',
          padding: '12px',
          border: '1px solid var(--color-line)',
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '10px',
              top: '10px',
              color: 'var(--color-ink)',
              opacity: 0.5,
            }}
          />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '32px' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setStatusFilter(e.target.value as 'all' | 'active' | 'archived')
          }
          className="input-field"
          style={{ width: '160px' }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active projects</option>
          <option value="archived">Archived projects</option>
        </select>
      </div>

      {/* Scannable Project Index Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-line)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--color-bg)',
                borderBottom: '1px solid var(--color-line)',
              }}
            >
              <th
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--color-ink)',
                }}
              >
                Project name
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--color-ink)',
                }}
              >
                Status
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--color-ink)',
                }}
              >
                Sites count
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--color-ink)',
                }}
              >
                Created date
              </th>
              <th
                style={{
                  padding: '12px 16px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--color-ink)',
                  textAlign: 'right',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--color-ink)',
                    opacity: 0.6,
                  }}
                >
                  No conservation projects found. Add a project to start
                  tracking carbon reserves.
                </td>
              </tr>
            ) : (
              filteredProjects.map((project) => (
                <tr
                  key={project.id}
                  style={{ borderBottom: '1px solid var(--color-line)' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                      {project.name}
                    </div>
                    {project.description && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-ink)',
                          opacity: 0.7,
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
                          ? 'badge badge-moss'
                          : 'badge badge-neutral'
                      }
                    >
                      {project.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Layers size={14} color="var(--color-canopy)" />
                      {project.site_count || 0} sites
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '12px',
                      color: 'var(--color-ink)',
                      opacity: 0.7,
                    }}
                  >
                    {project.created_at
                      ? new Date(project.created_at).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => onSelectProjectOnMap(project.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        <Eye size={12} />
                        View on map
                      </button>

                      {userRole === 'admin' && (
                        <button
                          onClick={() => onDeleteProject(project.id)}
                          className="btn-secondary"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            color: 'var(--color-clay)',
                          }}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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
            backgroundColor: 'rgba(28, 43, 34, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-line)',
              width: '420px',
              padding: '24px',
            }}
          >
            <h2
              className="heading-serif"
              style={{ fontSize: '18px', marginBottom: '16px' }}
            >
              Add conservation project
            </h2>

            {errorMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(181, 86, 60, 0.1)',
                  border: '1px solid var(--color-clay)',
                  color: 'var(--color-clay)',
                  fontSize: '12px',
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
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                >
                  Project name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Western Ghats Biodiversity Reserve"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                >
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of project goals and regional focus..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="input-field"
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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Creating...' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
