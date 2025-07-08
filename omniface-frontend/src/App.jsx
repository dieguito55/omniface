// omniface-frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login               from "./components/Login";
import PanelAdministrador  from "./components/PanelAdministrador";
import PrivateRoute        from "./components/PrivateRoute";
import { ReconProvider }   from "./context/ReconContext";

import "@fontsource/poppins";   // fuente global

function App() {
  return (
    <BrowserRouter>
      {/* El contexto de reconocimiento envuelve TODO el árbol de rutas */}
      <ReconProvider>
        <Routes>
          {/* pública */}
          <Route path="/" element={<Login />} />

          {/* protegidas */}
          <Route element={<PrivateRoute />}>
            <Route
              path="/paneladministrador"
              element={<PanelAdministrador />}
            />
          </Route>
        </Routes>
      </ReconProvider>
    </BrowserRouter>
  );
}

export default App;
