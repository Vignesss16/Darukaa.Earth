import React, { useState } from 'react';
import { Project, UserRole } from '../types';
import { Layers, Eye, Trash2, FileText, BarChart2 } from 'lucide-react';

interface ProjectTableProps {
  projects: Project[];
  onCreateProject?: (name: string, description?: string) => Promise<void>;
  onDeleteProject: (id: number) => Promise<void>;
  onSelectProjectOnMap: (projectId: number) => void;
  onOpenCompare?: () => void;
  onOpenExportSummary?: (project: Project) => void;
  userRole?: UserRole;
  searchQuery?: string;
  isLoading?: boolean;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onDeleteProject,
  onSelectProjectOnMap,
  onOpenCompare,
  onOpenExportSummary,
  userRole,
  searchQuery = '',
  isLoading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'archived'
  >('all');

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description &&
        p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        </div>
      </div>

      {/* Filter & Summary Bar */}
      <div
        className="card-container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '10px 16px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--color-ink)',
          }}
        >
          <span style={{ fontWeight: 600 }}>{filteredProjects.length}</span>
          <span style={{ color: 'var(--color-ink-muted)' }}>
            of {projects.length}{' '}
            {projects.length === 1 ? 'project' : 'projects'}
          </span>
          {searchQuery && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '11px',
                backgroundColor: '#F1F5F9',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600,
                border: '1px solid #E2E8F0',
              }}
            >
              Filtered by: "{searchQuery}"
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setStatusFilter(e.target.value as 'all' | 'active' | 'archived')
            }
            className="input-field"
            style={{ width: '140px', height: '30px', fontSize: '12px' }}
          >
            <option value="all">All statuses</option>
            <option value="active">Active projects</option>
            <option value="archived">Archived projects</option>
          </select>
        </div>
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
            {isLoading ? (
              [1, 2, 3, 4].map((idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: '1px solid var(--color-line)' }}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div
                      className="skeleton-pulse"
                      style={{
                        width: '180px',
                        height: '16px',
                        marginBottom: '6px',
                      }}
                    />
                    <div
                      className="skeleton-pulse"
                      style={{ width: '240px', height: '12px' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div
                      className="skeleton-pulse"
                      style={{
                        width: '64px',
                        height: '18px',
                        borderRadius: '12px',
                      }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div
                      className="skeleton-pulse"
                      style={{ width: '70px', height: '14px' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div
                      className="skeleton-pulse"
                      style={{ width: '90px', height: '14px' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div
                      className="skeleton-pulse"
                      style={{ width: '80px', height: '12px' }}
                    />
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div
                      className="skeleton-pulse"
                      style={{
                        width: '100px',
                        height: '26px',
                        marginLeft: 'auto',
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : filteredProjects.length === 0 ? (
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
    </div>
  );
};
