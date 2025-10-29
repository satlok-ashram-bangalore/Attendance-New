"use client"

import { Menu } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/components/ThemeToggle"
import Link from "next/link"

interface DashboardNavbarProps {
  toggleSidebar: () => void
  role: string
}

export function DashboardNavbar({ toggleSidebar, role }: DashboardNavbarProps) {
  const { user, logout } = useAuth()

  return (
    <header className="w-full bg-card border-b border-border py-3 px-6 z-30">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center">
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-muted-foreground hover:text-foreground hover:bg-accent mr-2"
              aria-label="Toggle Sidebar"
            >
              <>
                <Menu size={20} />
                <span className="sr-only">Toggle Sidebar</span>
              </>
            </Button>
          </div>

          <div className="items-center hidden space-x-2 lg:flex ">
            <span className="text-foreground font-bold text-xl mr-2">Attendance</span>
          </div>

          <div className="hidden lg:block">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="text-muted-foreground hover:text-foreground hover:bg-accent ml-4"
              aria-label="Toggle Sidebar"
            >
              <>
                <Menu size={20} />
                <span className="sr-only">Toggle Sidebar</span>
              </>
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-4 ">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.avatar || "/placeholder.svg?width=32&height=32&query=user+avatar"}
                    alt={user?.email || "User Avatar"}
                  />
                  <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-secondary border-border" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name || user?.email || `${role.charAt(0).toUpperCase() + role.slice(1)} User`}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email || `${role}@example.com`}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="focus:bg-accent p-0">
                <div className="flex justify-center w-full py-1">
                  <ThemeToggle />
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Link href={`/dashboard/${role}/settings`}>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
