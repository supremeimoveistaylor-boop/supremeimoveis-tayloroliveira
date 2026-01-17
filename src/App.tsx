import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Comprar from "./pages/Comprar";
import Alugar from "./pages/Alugar";
import Rurais from "./pages/Rurais";
import Sobre from "./pages/Sobre";
import Contato from "./pages/Contato";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import AddProperty from "./pages/AddProperty";
import EditProperty from "./pages/EditProperty";
import Admin from "./pages/Admin";
import PropertyDetails from "./pages/PropertyDetails";
import LeadsManagement from "./pages/LeadsManagement";
import SearchResults from "./pages/SearchResults";
import NotFound from "./pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ExitPopup } from "@/components/ExitPopup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* Error boundary to avoid blank screens */}
        <ErrorBoundary>
          <HashRouter>
            <ExitPopup />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/comprar" element={<Comprar />} />
              <Route path="/alugar" element={<Alugar />} />
              <Route path="/rurais" element={<Rurais />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/contato" element={<Contato />} />
              <Route path="/buscar" element={<SearchResults />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/add-property" element={<AddProperty />} />
              <Route path="/edit-property/:id" element={<EditProperty />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/leads" element={<LeadsManagement />} />
              <Route path="/property/:id" element={<PropertyDetails />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
