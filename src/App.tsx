import { Router, RouterProvider, Route, RootRoute, createHashHistory } from '@tanstack/react-router'
import Tasks from './components/Tasks'
import Dashboard from './components/Dashboard'
import DashboardLayout from './components/DashboardLayout'
import Today from './components/Today'
import Overdue from './components/Overdue'
import NextAction from './components/NextAction'
import FeaturePreview from './components/FeaturePreview'
import AuthRoute from './components/AuthRoute'
import ProviderSelection from './components/auth/ProviderSelection'
import MsToDoCallback from './components/auth/MsToDoCallback'
import { TaskSourceProvider } from './contexts/TaskSourceContext'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from './components/ui/sonner'

const rootRoute = new RootRoute()

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  ),
})

const dashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <DashboardLayout>
      <Dashboard />
    </DashboardLayout>
  ),
})

const nextActionRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/next-action',
  component: () => (
    <DashboardLayout>
      <NextAction />
    </DashboardLayout>
  ),
})

const tasksRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  component: () => (
    <DashboardLayout>
      <Tasks />
    </DashboardLayout>
  ),
})

const profileRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: () => (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Profile</h1>
        <p>Profile page coming soon...</p>
      </div>
    </DashboardLayout>
  ),
})


const todayRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/today',
  component: () => (
    <DashboardLayout>
      <Today />
    </DashboardLayout>
  ),
})

const overdueRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/overdue',
  component: () => (
    <DashboardLayout>
      <Overdue />
    </DashboardLayout>
  ),
})

const settingsRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: () => (
    <AuthRoute requireAuth={false}>
      <FeaturePreview />
    </AuthRoute>
  ),
})

const loginRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: () => (
    <AuthRoute requireAuth={false}>
      <ProviderSelection />
    </AuthRoute>
  ),
})

const msToDoCallbackRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/auth/mstodo/callback',
  component: MsToDoCallback,
})

const routeTree = rootRoute.addChildren([indexRoute, dashboardRoute, nextActionRoute, tasksRoute, profileRoute, todayRoute, overdueRoute, settingsRoute, loginRoute, msToDoCallbackRoute])

// Create a hash history instance for Electron compatibility
const hashHistory = createHashHistory({
  window: window
})

const router = new Router({ 
  routeTree,
  history: hashHistory,
  defaultNotFoundComponent: () => {
    console.log('Route not found. Current location:', window.location.href);
    
    // Check if this is an OAuth callback with access_token in hash
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      console.log('Detected OAuth callback with access token, redirecting...');
      // Redirect to the proper callback route while preserving the token
      window.location.hash = '/auth/mstodo/callback';
      return <div>Redirecting OAuth callback...</div>;
    }
    
    return <div>Route not found: {window.location.hash}</div>;
  },
  defaultPreload: 'intent'
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return (
    <TaskSourceProvider>
      <RouterProvider router={router} />
      <Toaster />
    </TaskSourceProvider>
  )
}

export default App