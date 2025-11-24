import React from "react"
import { LayoutDashboard, Users, UserPlus, UserCircle, FileText, CircleFadingPlus, HousePlus, UserCog, NotebookPen, Presentation, Notebook, House, ClipboardMinus } from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const adminNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/user",
    icon: Users,
    children: [
      {
        title: "Add User",
        href: "/user/add",
        icon: UserPlus,
      },

      {
        title: "View Users",
        href: "/user/view",
        icon: UserCog,
      },

    ],
  },
  {
    title: "Plans",
    href: "/plan",
    icon: Notebook,
    children: [
      {
        title: "Add Plan",
        href: "/plan/add",
        icon: NotebookPen,
      },

      {
        title: "View Plans",
        href: "/plan/view",
        icon: Presentation,
      },
    ],
  },
  {
    title: "Namdan",
    href: "/namdan",
    icon: House,
    children: [
      {
        title: "Add Namdan",
        href: "/namdan/add",
        icon: HousePlus,
      },

      {
        title: "View Namdan Attendance",
        href: "/namdan/view",
        icon: ClipboardMinus,
      },
    ],
  }
]

const authenticatedNavItems: NavItem[] = [
  {
    title: "My Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Member",
    href: "/member/add",
    icon: UserPlus,
    children: [
      {
        title: "Add Member",
        href: "/member/add",
        icon: UserPlus,
      },
      {
        title: "View Members",
        href: "/member/view",
        icon: Users,
      },
    ],
  },
  {
    title: "Attendance",
    href: "/attendance/regular",
    icon: FileText,
    children: [
      {
        title: "Regular Attendance",
        href: "/attendance/regular",
        icon: CircleFadingPlus,
      },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: UserCircle,
  },
]

const namdanUserNavItems: NavItem[] = [
  {
    title: "My Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Member",
    href: "/member/add",
    icon: UserPlus,
    children: [
      {
        title: "Add Member",
        href: "/member/add",
        icon: UserPlus,
      },
      {
        title: "View Members",
        href: "/member/view",
        icon: Users,
      },
    ],
  },
  {
    title: "Attendance",
    href: "/attendance/regular",
    icon: FileText,
    children: [
      {
        title: "Regular Attendance",
        href: "/attendance/regular",
        icon: CircleFadingPlus,
      },
      {
        title: "Namdan Attendance",
        href: "/attendance/namdan",
        icon: HousePlus,
      },
    ],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: UserCircle,
  },
]

// Archived users have no navigation items - read-only access
const archivedNavItems: NavItem[] = []

export function getNavItems(role: string): NavItem[] {
  if (role === "admin") {
    return adminNavItems
  }
  if (role === "authenticated") {
    return authenticatedNavItems
  }
  if (role === "namdan_user") {
    return namdanUserNavItems
  }
  if (role === "archived") {
    return archivedNavItems
  }
  return []
}
