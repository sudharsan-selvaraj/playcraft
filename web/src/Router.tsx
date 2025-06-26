import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home.page';
import { ResizableDividerDemoPage } from './pages/ResizableDividerDemo.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/resizable-divider',
    element: <ResizableDividerDemoPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
