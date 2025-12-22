import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/home';
import SpotDetail from './pages/spot-detail';
import AlertsPage from './pages/alerts';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/spot/:id" element={<SpotDetail />} />
                <Route path="/alerts" element={<AlertsPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
