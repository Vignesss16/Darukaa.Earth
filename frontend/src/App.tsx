import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { MapView } from './components/MapView';
import { SiteDetailPanel } from './components/SiteDetailPanel';
import { ProjectTable } from './components/ProjectTable';
import { ActivityFeed } from './components/ActivityFeed';
import { SiteFormModal } from './components/SiteFormModal';
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
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');

  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const [drawnGeoJSON, setDrawnGeoJSON] = useState<GeoJSONPolygon | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [showSiteForm, setShowSiteForm] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');

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
    try {
      const projList = await api.projects.list();
      setProjects(projList);

      const siteList = await api.sites.list();
      setSites(siteList);
    } catch (err) {
      console.error('Failed to load initial data:', err);
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

  const handleSelectProjectOnMap = (projectId: number) => {
    setCurrentTab('map');
    const firstSite = sites.find((s) => s.project_id === projectId);
    if (firstSite) {
      setSelectedSite(firstSite);
    }
  };

  const handleSelectSiteOnMap = (site: Site) => {
    setCurrentTab('map');
    setSelectedSite(site);
  };

  const handleOpenDrawMode = () => {
    setCurrentTab('map');
    setIsDrawing(true);
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
        onTabChange={setCurrentTab}
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
          onSearchChange={setSearchQuery}
          userRole={currentUser?.role}
          onOpenDrawMode={handleOpenDrawMode}
          onOpenNewProject={() => setCurrentTab('projects')}
          activeTab={currentTab}
        />

        <main
          style={{
            flex: 1,
            height: 'calc(100% - 48px)',
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
            />
          ) : currentTab === 'map' ? (
            <div
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              <MapView
                sites={sites}
                selectedSite={selectedSite}
                onSelectSite={setSelectedSite}
                onPolygonDrawn={setDrawnGeoJSON}
                onOpenSiteForm={() => setShowSiteForm(true)}
                isDrawing={isDrawing}
                setIsDrawing={setIsDrawing}
                drawnGeoJSON={drawnGeoJSON}
                userRole={currentUser?.role}
              />

              <SiteDetailPanel
                site={selectedSite}
                projects={projects}
                onClose={() => setSelectedSite(null)}
                onDeleteSite={handleDeleteSite}
                userRole={currentUser?.role}
              />
            </div>
          ) : currentTab === 'projects' ? (
            <ProjectTable
              projects={projects}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onSelectProjectOnMap={handleSelectProjectOnMap}
              userRole={currentUser?.role}
              searchQuery={searchQuery}
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
        />
      )}

      {showAuthModal && (
        <AuthModal onLogin={handleLogin} onRegister={handleRegister} />
      )}
    </div>
  );
};

export default App;
