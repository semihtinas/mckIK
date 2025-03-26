import React, { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Layout, Modal, Spin } from 'antd';
import Main from './components/layout/Main';
import PrivateRoute from './PrivateRoute';
import axios from 'axios';

// Lazy-loaded components
const Dashboard = React.lazy(() => import('./pages/dashboardPages/Dashboard'));
const Reports = React.lazy(() => import('./pages/Reports'));
const LeaveTabs = React.lazy(() => import('./pages/leavePages/LeaveTabs'));
const PersonnelList = React.lazy(() => import('./pages/PersonnelList'));
const PersonnelDetail = React.lazy(() => import('./pages/personneldetailstabs/PersonnelDetail'));
const SettingsForm = React.lazy(() => import('./pages/settingtabs/SettingsForm'));
const LeaveRequestForm = React.lazy(() => import('./pages/leavePages/components/LeaveRequestForm'));
const LoginPage = React.lazy(() => import('./pages/loginPage/LoginPage'));
const UnauthorizedPage = React.lazy(() => import('./pages/UnauthorizedPage'));
const CalendarTab = React.lazy(() => import('./pages/calendarPages/CalendarTab'));
const MeetingsPage = React.lazy(() => import('./pages/MeetingPage/MeetingPage'));
const MeetingDetail = React.lazy(() => import('./pages/MeetingPage/MeetingDetail'));
const MeetingResponse = React.lazy(() => import('./pages/MeetingPage/MeetingResponse')); // Bunu ekleyin
const JobWorkflowPage = React.lazy(() => import('./pages/jobWorkflow/JobWorkflowPage'));
const ShiftManagement = React.lazy(() => import('./pages/shiftManagementPage/ShiftManagement'));
const AdvanceRequestForm = React.lazy(() => import('./pages/advancePages/AdvanceRequestForm'));
const AdvanceManagement = React.lazy(() => import('./pages/advancePages/AdvanceManagement'));
const ExpenseRequestForm = React.lazy(() => import('./pages/expensePage/ExpenseRequestForm'));
const ExpenseManagement = React.lazy(() => import('./pages/expensePage/ExpenseManagement'));
const KanbanBoard = React.lazy(() => import('./pages/kanbanPages/KanbanBoard'));
const OvertimeManagement = React.lazy(() => import('./pages/overtimePages/OvertimeManagement'));






// Route parameter handler component
const RouteParameterHandler = ({ children }) => {
  const params = useParams();
  return children(params);
};

// Optimized permission wrapper
const OptimizedPermissionWrapper = React.memo(({
  children,
  permissions = [],
  requiredPermission,
  ownPermission,
  userInfo,
  isPermissionsLoaded,
  routeId = null
}) => {
  const [accessState, setAccessState] = useState({
    isChecking: true,
    hasAccess: false
  });

  useEffect(() => {
    if (!isPermissionsLoaded || !Array.isArray(permissions)) {
      setAccessState({ isChecking: true, hasAccess: false });
      return;
    }

    const hasRequiredPermission = permissions.includes(requiredPermission);
    const hasOwnPermission = ownPermission && permissions.includes(ownPermission);
    const isAccessingOwnPage = routeId && userInfo && String(routeId) === String(userInfo.id);
    const hasAccess = hasRequiredPermission || (hasOwnPermission && isAccessingOwnPage);

    setAccessState({
      isChecking: false,
      hasAccess
    });
  }, [permissions, requiredPermission, ownPermission, userInfo, routeId, isPermissionsLoaded]);

  if (accessState.isChecking) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!accessState.hasAccess) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
});

// Optimized routes component
const AppRoutes = React.memo(({ 
  userPermissions, 
  userInfo, 
  isPermissionsLoaded, 
  isAuthenticated,
  selectedPersonnel,
  setSelectedPersonnel 
}) => {
  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
              permissions={userPermissions}
              requiredPermission="view_dashboard"
              userInfo={userInfo}
              isPermissionsLoaded={isPermissionsLoaded}
            >
              <Dashboard />
            </OptimizedPermissionWrapper>
          </PrivateRoute>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
              permissions={userPermissions}
              requiredPermission="view_reports"
              userInfo={userInfo}
              isPermissionsLoaded={isPermissionsLoaded}
            >
              <Reports />
            </OptimizedPermissionWrapper>
          </PrivateRoute>
        }
      />

      {/* Leaves */}
      <Route
        path="/leaves"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
              permissions={userPermissions}
              requiredPermission="view_leaves"
              userInfo={userInfo}
              isPermissionsLoaded={isPermissionsLoaded}
            >
              <LeaveTabs />
            </OptimizedPermissionWrapper>
          </PrivateRoute>
        }
      />

      {/* Settings */}
      <Route
        path="/settings"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
              permissions={userPermissions}
              requiredPermission="view_settings"
              userInfo={userInfo}
              isPermissionsLoaded={isPermissionsLoaded}
            >
              <SettingsForm />
            </OptimizedPermissionWrapper>
          </PrivateRoute>
        }
      />

      {/* Personnel List */}
      <Route
        path="/personnel"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
              permissions={userPermissions}
              requiredPermission="view_personnel_list"
              userInfo={userInfo}
              isPermissionsLoaded={isPermissionsLoaded}
            >
              <PersonnelList
                onPersonnelClick={setSelectedPersonnel}
              />
            </OptimizedPermissionWrapper>
          </PrivateRoute>
        }
      />

      {/* Personnel Detail */}
      <Route
        path="/personnel/:id"
        element={
          <PrivateRoute isAuthenticated={isAuthenticated}>
            <RouteParameterHandler>
              {(params) => (
                <OptimizedPermissionWrapper
                  permissions={userPermissions}
                  requiredPermission="view_personnel_detail"
                  ownPermission="view_own_personnel_detail"
                  userInfo={userInfo}
                  isPermissionsLoaded={isPermissionsLoaded}
                  routeId={params.id}
                >
                  <PersonnelDetail personnel={selectedPersonnel} userInfo={userInfo} />
                </OptimizedPermissionWrapper>
              )}
            </RouteParameterHandler>
          </PrivateRoute>
        }
      />



      {/* Personnel Shifts */}
      <Route
    path="/shifts"
    element={
        <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
                permissions={userPermissions}
                requiredPermission="view_shifts"
                userInfo={userInfo}
                isPermissionsLoaded={isPermissionsLoaded}
            >
                <ShiftManagement />
            </OptimizedPermissionWrapper>
        </PrivateRoute>
    }
/>


{/* Kanban Board */}
<Route
    path="/kanban"
    element={
        <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
                permissions={userPermissions}
                requiredPermission="view_kanban"
                userInfo={userInfo}
                isPermissionsLoaded={isPermissionsLoaded}
            >
                <KanbanBoard />
            </OptimizedPermissionWrapper>
        </PrivateRoute>
    }
/>





            {/* Calendar Tab */}
            <Route
  path="/calendar"
  element={
    <PrivateRoute isAuthenticated={isAuthenticated}>
      <OptimizedPermissionWrapper
        permissions={userPermissions}
        requiredPermission="view_calendar"
        userInfo={userInfo}
        isPermissionsLoaded={isPermissionsLoaded}
      >
        <CalendarTab 
          canEdit={userPermissions.includes('edit_calendar')}
          canCreate={userPermissions.includes('create_calendar')}
          canDelete={userPermissions.includes('delete_calendar')}
        />
      </OptimizedPermissionWrapper>
    </PrivateRoute>
  }
/>


{/* Advance Tab */}
<Route
    path="/advances"
    element={
        <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
                permissions={userPermissions}
                requiredPermission="view_advances"
                userInfo={userInfo}
                isPermissionsLoaded={isPermissionsLoaded}
            >
                <AdvanceManagement />
            </OptimizedPermissionWrapper>
        </PrivateRoute>
    }
/>

{/* Expense Tab */}
<Route
    path="/expenses"
    element={
        <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
                permissions={userPermissions}
                requiredPermission="view_expenses"
                userInfo={userInfo}
                isPermissionsLoaded={isPermissionsLoaded}
            >
                <ExpenseManagement />
            </OptimizedPermissionWrapper>
        </PrivateRoute>
    }
/>

<Route
    path="/overtime"
    element={
        <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
                permissions={userPermissions}
                requiredPermission="view_overtime"
                userInfo={userInfo}
                isPermissionsLoaded={isPermissionsLoaded}
            >
                <OvertimeManagement />
            </OptimizedPermissionWrapper>
        </PrivateRoute>
    }
/>


<Route
    path="/meetings"
    element={
        <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
                permissions={userPermissions}
                requiredPermission="view_meetings"
                userInfo={userInfo}
                isPermissionsLoaded={isPermissionsLoaded}
            >
                <MeetingsPage />
            </OptimizedPermissionWrapper>
        </PrivateRoute>
    }
/>
<Route
    path="/meetings/:id"
    element={
        <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
                permissions={userPermissions}
                requiredPermission="view_meetings"
                userInfo={userInfo}
                isPermissionsLoaded={isPermissionsLoaded}
            >
                <MeetingDetail />
            </OptimizedPermissionWrapper>
        </PrivateRoute>
    }
/>
<Route
    path="/workflow"
    element={
        <PrivateRoute isAuthenticated={isAuthenticated}>
            <OptimizedPermissionWrapper
                permissions={userPermissions}
                requiredPermission="view_workflow"
                userInfo={userInfo}
                isPermissionsLoaded={isPermissionsLoaded}
            >
                <JobWorkflowPage />
            </OptimizedPermissionWrapper>
        </PrivateRoute>
    }
/>

{/* Toplantı yanıt sayfası - Public route olarak ekleyin */}
<Route path="/meetings/:meetingId/respond" element={<MeetingResponse />} />

{/* Default Route */}
<Route path="*" element={<Navigate to="/dashboard" replace />} />

    </Routes>
  );
});

const App = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true,
    userInfo: null,
    userPermissions: [],
    isPermissionsLoaded: false
  });
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [isAdvanceModalVisible, setIsAdvanceModalVisible] = useState(false);
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          isLoading: false,
          isPermissionsLoaded: true
        }));
        navigate('/login', { replace: true });
        return;
      }

      try {
        const [permissionsResponse, userInfoResponse] = await Promise.all([
          axios.get('http://localhost:5001/api/permissions/user-permissions', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5001/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          userInfo: userInfoResponse.data,
          userPermissions: permissionsResponse.data.permissions || [],
          isPermissionsLoaded: true
        });

      } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('token');
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          userInfo: null,
          userPermissions: [],
          isPermissionsLoaded: true
        });
        navigate('/login', { replace: true });
      }
    };

    fetchUserData();
  }, [navigate]);

  // Axios interceptor
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && authState.isAuthenticated) {
          localStorage.removeItem('token');
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            userInfo: null,
            userPermissions: [],
            isPermissionsLoaded: true
          });
          navigate('/login', { replace: true });
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [navigate, authState.isAuthenticated]);

  const showLeaveModal = useCallback(() => {
    setIsLeaveModalVisible(true);
  }, []);

  const showAdvanceModal = useCallback(() => {
    setIsAdvanceModalVisible(true);
  }, []);

  const showExpenseModal = useCallback(() => {
    setIsExpenseModalVisible(true);
  }, []);


  const handleLeaveModalCancel = useCallback(() => {
    setIsLeaveModalVisible(false);
  }, []);

  const handleAdvanceModalCancel = useCallback(() => {
    setIsAdvanceModalVisible(false);
  }, []);

  const handleExpenseModalCancel = useCallback(() => {
    setIsExpenseModalVisible(false);
  }, []);

  

  if (authState.isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    }>
      {authState.isAuthenticated ? (
        <Main 
          onShowLeaveRequest={showLeaveModal}
          onShowAdvanceRequest={showAdvanceModal}
          onShowExpenseRequest={showExpenseModal}
          userInfo={authState.userInfo}
        >
          <Layout>
            <AppRoutes 
              userPermissions={authState.userPermissions}
              userInfo={authState.userInfo}
              isPermissionsLoaded={authState.isPermissionsLoaded}
              isAuthenticated={authState.isAuthenticated}
              selectedPersonnel={selectedPersonnel}
              setSelectedPersonnel={setSelectedPersonnel}
            />
            
            {/* İzin talebi modalı */}
            {isLeaveModalVisible && (
              <Modal
                title="İzin Talebi"
                open={isLeaveModalVisible}
                onCancel={handleLeaveModalCancel}
                footer={null}
              >
                <LeaveRequestForm closeModal={handleLeaveModalCancel} />
              </Modal>
            )}

            {/* Avans talebi modalı */}
            {isAdvanceModalVisible && (
              <Modal
                title="Avans Talebi"
                open={isAdvanceModalVisible}
                onCancel={handleAdvanceModalCancel}
                footer={null}
              >
                <AdvanceRequestForm closeModal={handleAdvanceModalCancel} />
              </Modal>
            )}

                        {/* Harcama talebi modalı */}
                        {isExpenseModalVisible && (
              <Modal
                title="Harcama Talebi"
                open={isExpenseModalVisible}
                onCancel={handleExpenseModalCancel}
                footer={null}
              >
                <ExpenseRequestForm closeModal={handleExpenseModalCancel} />
              </Modal>
            )}

          </Layout>
        </Main>
      ) : (
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage 
                setAuthState={setAuthState}
              />
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </Suspense>
  );
};

export default App;