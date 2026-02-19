import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Users,
  LayoutDashboard,
  UserCog,
  Building2,
  Briefcase,
  LogOut,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  GitBranch,
  DoorOpen,
} from 'lucide-react';

const mainNavItems = [
  { title: 'בית', url: '/', icon: LayoutDashboard },
  { title: 'עובדים', url: '/employees', icon: Users },
  { title: 'דשבורדים ויזואליים', url: '/analytics', icon: BarChart3 },
];

const adminNavItems = [
  { title: 'ניהול תכניות', url: '/admin/projects', icon: Building2 },
  { title: 'ניהול תפקידים', url: '/admin/roles', icon: Briefcase },
  { title: 'ניהול ענפים', url: '/admin/branches', icon: GitBranch },
  { title: 'רמות ותק', url: '/admin/seniority-levels', icon: Briefcase },
  { title: 'חברות מעסיקות', url: '/admin/companies', icon: Building2 },
  { title: 'סיבות רצון לעזוב', url: '/admin/leaving-reasons', icon: DoorOpen },
  { title: 'ניהול משתמשים', url: '/admin/users', icon: UserCog },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut, isSuperAdmin, isManager } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <Sidebar
      side="right"
      className={`gradient-sidebar transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-sidebar-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sidebar-foreground">ניהול עובדים</h2>
                <p className="text-xs text-sidebar-foreground/60">מערכת HR</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs px-3">ראשי</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={`flex items-center py-2.5 rounded-lg transition-all duration-200 ${
                          collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                        } ${
                          isActive(item.url)
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                        }`}
                        activeClassName="bg-sidebar-primary text-sidebar-primary-foreground"
                      >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(isSuperAdmin || isManager) && (
          <SidebarGroup className="mt-6">
            {!collapsed && <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs px-3">ניהול</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
              {adminNavItems.map((item) => {
                  // Only super_admin can access user management
                  if (item.url === '/admin/users' && !isSuperAdmin) {
                    return null;
                  }
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end
                          className={`flex items-center py-2.5 rounded-lg transition-all duration-200 ${
                            collapsed ? 'justify-center px-2' : 'gap-3 px-3'
                          } ${
                            isActive(item.url)
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                              : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          }`}
                          activeClassName="bg-sidebar-primary text-sidebar-primary-foreground"
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.email}</p>
            <p className="text-xs text-sidebar-foreground/60">
              {role === 'super_admin' ? 'מנהל על' : role === 'manager' ? 'מנהל' : 'משתמש'}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={`w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent ${collapsed ? 'justify-center px-2' : 'justify-start'}`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="mr-3">התנתק</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
