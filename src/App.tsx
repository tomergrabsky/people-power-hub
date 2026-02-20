import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import MovingSouth from "./pages/MovingSouth";
import AiAssistant from "./pages/AiAssistant";
import Auth from "./pages/Auth";
import Employees from "./pages/Employees";
import AdminProjects from "./pages/admin/Projects";
import AdminRoles from "./pages/admin/Roles";
import AdminUsers from "./pages/admin/Users";
import AdminEmployingCompanies from "./pages/admin/EmployingCompanies";
import AdminBranches from "./pages/admin/Branches";
import AdminSeniorityLevels from "./pages/admin/SeniorityLevels";
import AdminLeavingReasons from "./pages/admin/LeavingReasons";
import AdminPerformanceLevels from "./pages/admin/PerformanceLevels";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/moving-south" element={<MovingSouth />} />
            <Route path="/ai-assistant" element={<AiAssistant />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/admin/projects" element={<AdminProjects />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            <Route path="/admin/branches" element={<AdminBranches />} />
            <Route path="/admin/seniority-levels" element={<AdminSeniorityLevels />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/companies" element={<AdminEmployingCompanies />} />
            <Route path="/admin/leaving-reasons" element={<AdminLeavingReasons />} />
            <Route path="/admin/performance-levels" element={<AdminPerformanceLevels />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
