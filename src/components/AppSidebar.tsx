import { MessageSquare, FileText, Mail, Users, Settings, BarChart3 } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import logo from "@/assets/fitlogic-logo.png";

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
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Inquiries", url: "/", icon: MessageSquare },
  { title: "FAQ Manager", url: "/faqs", icon: FileText },
];

const comingSoon = [
  { title: "Intake Forms", url: "#", icon: FileText },
  { title: "Campaigns", url: "#", icon: Mail },
  { title: "Patients", url: "#", icon: Users },
  { title: "Analytics", url: "#", icon: BarChart3 },
  { title: "Settings", url: "#", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="FitLogic" className="h-9 w-9 rounded-lg object-contain" />
          {!collapsed && (
            <div>
              <h2 className="font-heading text-sm font-bold text-sidebar-primary-foreground">FitLogic</h2>
              <p className="text-[10px] text-sidebar-foreground/60">Patient Platform</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end activeClassName="bg-sidebar-accent text-sidebar-primary">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Coming Soon</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {comingSoon.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton disabled className="opacity-40 cursor-not-allowed">
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-[11px] text-sidebar-foreground/70">Phase 1 — Inquiry System</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
