import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { MapView } from './components/MapView';
import { SiteDetailPanel } from './components/SiteDetailPanel';
import { ProjectTable } from './components/ProjectTable';
import { ActivityFeed } from './components/ActivityFeed';
import { SiteFormModal } from './components/SiteFormModal';
import { SiteEditModal } from './components/SiteEditModal';
import { SiteCompareModal } from './components/SiteCompareModal';
import { ProjectExportModal } from './components/ProjectExportModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { AuthModal } from './components/AuthModal';
import {
  api,
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
} from './api';
import {
  User,
  Project,
  Site,
  UserRole,
  SiteType,
  GeoJSONPolygon,
} from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<NavTab>(() => {
    const saved = localStorage.getItem('darukaa_current_tab');
    return saved === 'dashboard' ||
      saved === 'map' ||
      saved === 'projects' ||
      saved === 'activity'
      ? saved
      : 'dashboard';
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const [drawnGeoJSON, setDrawnGeoJSON] = useState<GeoJSONPolygon | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [showSiteForm, setShowSiteForm] = useState<boolean>(false);

  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editingBoundarySite, setEditingBoundarySite] = useState<Site | null>(
    null
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Enhancement Modals State
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [exportProject, setExportProject] = useState<Project | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] =
    useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('darukaa_current_tab', currentTab);
  }, [currentTab]);

  useEffect(() => {
    if (selectedSite) {
      localStorage.setItem('darukaa_selected_site_id', String(selectedSite.id));
    }
  }, [selectedSite]);

  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (accessToken) {
      api.auth
        .me()
        .then((user) => {
          setCurrentUser(user);
          loadData();
        })
        .catch(() => {
          clearStoredTokens();
          setShowAuthModal(true);
        });
    } else {
      setShowAuthModal(true);
    }
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const projList = await api.projects.list();
      setProjects(projList);

      const siteList = await api.sites.list();
      const savedSiteId = localStorage.getItem('darukaa_selected_site_id');
      const found =
        savedSiteId && siteList.length > 0
          ? siteList.find((s) => s.id === Number(savedSiteId)) || null
          : null;

      // Set sites and selectedSite simultaneously to avoid interim null selectedSite
      setSites(siteList);
      if (found) {
        setSelectedSite(found);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setStoredTokens(res.access_token, res.refresh_token);
    setCurrentUser(res.user);
    setShowAuthModal(false);
    await loadData();
  };

  const handleRegister = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole
  ) => {
    await api.auth.register(email, password, fullName, role);
    await handleLogin(email, password);
  };

  const handleLogout = () => {
    clearStoredTokens();
    setCurrentUser(null);
    setShowAuthModal(true);
  };

  const handleCreateProject = async (name: string, description?: string) => {
    const newProj = await api.projects.create({ name, description });
    setProjects([newProj, ...projects]);
  };

  const handleDeleteProject = async (id: number) => {
    await api.projects.delete(id);
    setProjects(projects.filter((p) => p.id !== id));
    setSites(sites.filter((s) => s.project_id !== id));
    if (selectedSite?.project_id === id) {
      setSelectedSite(null);
    }
  };

  const handleSaveSite = async (
    projectId: number | null,
    newProjectName: string | null,
    name: string,
    siteType: SiteType,
    geojson: GeoJSONPolygon
  ) => {
    let targetProjectId = projectId;
    if (!targetProjectId && newProjectName) {
      const newProj = await api.projects.create({
        name: newProjectName,
        description: 'Conservation project created via site boundary mapping',
      });
      targetProjectId = newProj.id;
    }

    if (!targetProjectId) {
      throw new Error('Please select or enter a valid parent project.');
    }

    const newSite = await api.sites.create({
      project_id: targetProjectId,
      name,
      site_type: siteType,
      geojson,
    });

    setSites([newSite, ...sites]);
    setSelectedSite(newSite);
    setDrawnGeoJSON(null);
    setIsDrawing(false);
    setShowSiteForm(false);

    const updatedProjects = await api.projects.list();
    setProjects(updatedProjects);
  };

  const handleDeleteSite = async (id: number) => {
    await api.sites.delete(id);
    setSites(sites.filter((s) => s.id !== id));
    if (selectedSite?.id === id) {
      setSelectedSite(null);
    }

    const updatedProjects = await api.projects.list();
    setProjects(updatedProjects);
  };

  const handleUpdateSite = async (
    siteId: number,
    data: { name?: string; site_type?: SiteType; geojson?: GeoJSONPolygon }
  ) => {
    const updated = await api.sites.update(siteId, data);
    setSites((prev) => prev.map((s) => (s.id === siteId ? updated : s)));
    if (selectedSite?.id === siteId) {
      setSelectedSite(updated);
    }
    setEditingSite(null);
  };

  const handleSaveEditedBoundary = async (
    siteId: number,
    updatedGeoJSON: GeoJSONPolygon
  ) => {
    try {
      const updated = await api.sites.update(siteId, {
        geojson: updatedGeoJSON,
      });
      setSites((prev) => prev.map((s) => (s.id === siteId ? updated : s)));
      if (selectedSite?.id === siteId) {
        setSelectedSite(updated);
      }
      setEditingBoundarySite(null);
    } catch (err) {
      console.error('Failed to update site boundary:', err);
      throw err;
    }
  };

  const handleStartEditBoundaryOnMap = (site: Site) => {
    setEditingSite(null);
    setEditingBoundarySite(site);
    setDrawnGeoJSON(null);
    setIsDrawing(false);
  };

  const handleSelectSite = (site: Site | null) => {
    if (editingBoundarySite && site?.id !== editingBoundarySite.id) {
      setEditingBoundarySite(null);
    }
    setSelectedSite(site);
  };

  const handleSelectProjectOnMap = (projectId: number) => {
    const proj = projects.find((p) => p.id === projectId);
    const firstSite = sites.find((s) => s.project_id === projectId);
    if (proj) {
      setSearchQuery(proj.name);
    }
    if (firstSite) {
      setSelectedSite(firstSite);
    }
    setCurrentTab('map');
  };

  const handleSelectSiteOnMap = (site: Site) => {
    localStorage.setItem('darukaa_current_tab', 'map');
    localStorage.setItem('darukaa_selected_site_id', String(site.id));
    window.location.reload();
  };

  const handleJumpToCoordinates = (lat: number, lng: number) => {
    localStorage.setItem('darukaa_current_tab', 'map');
    localStorage.setItem('darukaa_jump_coords', JSON.stringify([lat, lng]));
    window.location.reload();
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'map' && currentTab !== 'map') {
      localStorage.setItem('darukaa_current_tab', 'map');
      window.location.reload();
      return;
    }
    setCurrentTab(tab);
  };

  const handleOpenDrawMode = () => {
    if (currentTab !== 'map') {
      localStorage.setItem('darukaa_current_tab', 'map');
      localStorage.setItem('darukaa_start_draw', 'true');
      window.location.reload();
      return;
    }
    setIsDrawing(true);
  };

  const handleCancelDraw = () => {
    setIsDrawing(false);
    setDrawnGeoJSON(null);
    setEditingBoundarySite(null);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim().toLowerCase();
    if (trimmed && projects.length > 0 && sites.length > 0) {
      const matchedProj = projects.find(
        (p) => p.name.trim().toLowerCase() === trimmed
      );
      if (matchedProj) {
        const projSites = sites.filter((s) => s.project_id === matchedProj.id);
        if (
          projSites.length > 0 &&
          (!selectedSite || selectedSite.project_id !== matchedProj.id)
        ) {
          setSelectedSite(projSites[0]);
        }
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--color-bg)',
      }}
    >
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <Header
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          userRole={currentUser?.role}
          onOpenDrawMode={handleOpenDrawMode}
          onCancelDraw={handleCancelDraw}
          isDrawing={isDrawing}
          hasDrawnPolygon={!!drawnGeoJSON}
          onOpenNewProject={() => setShowCreateProjectModal(true)}
          activeTab={currentTab}
          sites={sites}
          projects={projects}
          onSelectSite={handleSelectSiteOnMap}
          onSelectProject={handleSelectProjectOnMap}
          onJumpToCoordinates={handleJumpToCoordinates}
        />

        <main
          style={{
            flex: 1,
            height: 'calc(100% - 52px)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {currentTab === 'dashboard' ? (
            <DashboardView
              projects={projects}
              sites={sites}
              onSelectSiteOnMap={handleSelectSiteOnMap}
              onNavigateTab={setCurrentTab}
              userRole={currentUser?.role}
              searchQuery={searchQuery}
              isLoading={loadingData}
            />
          ) : currentTab === 'map' ? (
            <div
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              <MapView
                sites={sites}
                projects={projects}
                selectedSite={selectedSite}
                onSelectSite={handleSelectSite}
                onPolygonDrawn={setDrawnGeoJSON}
                onOpenSiteForm={() => setShowSiteForm(true)}
                isDrawing={isDrawing}
                setIsDrawing={setIsDrawing}
                drawnGeoJSON={drawnGeoJSON}
                userRole={currentUser?.role}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                editingBoundarySite={editingBoundarySite}
                onSaveEditedBoundary={handleSaveEditedBoundary}
                onCancelEditBoundary={() => setEditingBoundarySite(null)}
              />

              <SiteDetailPanel
                site={selectedSite}
                projects={projects}
                sites={sites}
                onSelectSite={handleSelectSite}
                currentUser={currentUser}
                onClose={() => setSelectedSite(null)}
                onDeleteSite={handleDeleteSite}
                onEditSite={(site) => setEditingSite(site)}
                userRole={currentUser?.role}
                isEditingBoundary={!!editingBoundarySite}
              />
            </div>
          ) : currentTab === 'projects' ? (
            <ProjectTable
              projects={projects}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onSelectProjectOnMap={handleSelectProjectOnMap}
              onOpenCompare={() => setShowCompareModal(true)}
              onOpenExportSummary={(proj) => setExportProject(proj)}
              userRole={currentUser?.role}
              searchQuery={searchQuery}
              isLoading={loadingData}
            />
          ) : (
            <ActivityFeed />
          )}
        </main>
      </div>

      {showSiteForm && (
        <SiteFormModal
          projects={projects}
          drawnGeoJSON={drawnGeoJSON}
          onSaveSite={handleSaveSite}
          onClose={() => setShowSiteForm(false)}
          onSuccessBulk={loadData}
          onDiscard={handleCancelDraw}
        />
      )}

      {editingSite && (
        <SiteEditModal
          site={editingSite}
          projectName={
            projects.find((p) => p.id === editingSite.project_id)?.name
          }
          currentUser={currentUser}
          isOpen={!!editingSite}
          onClose={() => setEditingSite(null)}
          onSave={handleUpdateSite}
          onStartEditBoundaryOnMap={handleStartEditBoundaryOnMap}
        />
      )}

      {showCompareModal && (
        <SiteCompareModal
          sites={sites}
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {exportProject && (
        <ProjectExportModal
          project={exportProject}
          isOpen={!!exportProject}
          onClose={() => setExportProject(null)}
        />
      )}

      {showCreateProjectModal && (
        <CreateProjectModal
          isOpen={showCreateProjectModal}
          onClose={() => setShowCreateProjectModal(false)}
          onProjectCreated={(newProj) => {
            setProjects([newProj, ...projects]);
          }}
        />
      )}

      {showAuthModal && (
        <AuthModal onLogin={handleLogin} onRegister={handleRegister} />
      )}
    </div>
  );
};

export default App;
