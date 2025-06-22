import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import PanelAdministrador from "./components/PanelAdministrador";
import PrivateRoute from "./components/PrivateRoute";
import '@fontsource/poppins'; // Fuente para todo el proyecto

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Rutas protegidas */}
        <Route element={<PrivateRoute />}>
          <Route path="/paneladministrador" element={<PanelAdministrador />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
