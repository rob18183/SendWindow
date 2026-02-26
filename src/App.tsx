import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './pages/home';
import MapPage from './pages/map';
import SpotDetail from './pages/spot-detail';
import AlertsPage from './pages/alerts';
import DuoPage from './pages/duo';
import AboutPage from './pages/about';
import AdminAnalyticsPage from './pages/admin-analytics';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 15, // 15 minutes
            retry: 1,
            refetchOnWindowFocus: false // Don't refetch on tab switch to save API calls
        }
    }
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/map" element={<MapPage />} />
                    <Route path="/spot/:id" element={<SpotDetail />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/duo" element={<DuoPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;
