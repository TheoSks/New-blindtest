import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Lobby from './pages/Lobby';
import Room from './pages/Room';
import Game from './pages/Game';
import Solo from './pages/Solo';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/solo" element={<Solo />} />
      <Route path="/lobby" element={<Lobby />} />
      <Route path="/room/:code" element={<Room />} />
      <Route path="/game/:code" element={<Game />} />
    </Routes>
  );
}

export default App;
