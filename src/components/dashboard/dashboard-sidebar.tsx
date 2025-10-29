"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import type { NavItem } from "@/lib/dashboard-nav-config"
import { ChevronUp, ChevronDown } from "lucide-react"

interface DashboardSidebarProps {
  isOpen: boolean
  closeSidebar: () => void
  navItems: NavItem[]
  basePath: string // e.g., "/dashboard/admin" or "/dashboard/sevadar"
  role: string // To make localStorage keys unique
}

export function DashboardSidebar({ isOpen, closeSidebar, navItems, basePath, role }: DashboardSidebarProps) {
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const sidebarRef = useRef<HTMLDivElement>(null)
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  const localStorageKeyForSections = useMemo(() => `sidebarOpenSections_${role}`, [role])

  useEffect(() => {
    function checkScreenSize() {
      setIsSmallScreen(window.innerWidth < 1024) // 'lg' breakpoint
    }
    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

  useEffect(() => {
    if (isOpen && isSmallScreen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      // Cleanup style when component unmounts or dependencies change
      document.body.style.overflow = ""
    }
  }, [isOpen, isSmallScreen])

  useEffect(() => {
    const initialOpenSections: Record<string, boolean> = {}
    navItems.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some((child) => {
          const childFullPath = `${basePath}${child.href === "/" ? "" : child.href}`
          return pathname === childFullPath || pathname.startsWith(childFullPath + "/")
        })
        if (isActive) {
          initialOpenSections[item.title] = true
        }
      }
    })
    // Only set if we haven't initialized from localStorage yet or if it's empty
    const savedOpenSections = localStorage.getItem(localStorageKeyForSections)
    if (!savedOpenSections && Object.keys(initialOpenSections).length > 0) {
      setOpenSections(initialOpenSections)
    }
  }, [pathname, navItems, basePath, localStorageKeyForSections])

  useEffect(() => {
    if (Object.keys(openSections).length > 0) {
      localStorage.setItem(localStorageKeyForSections, JSON.stringify(openSections))
    }
  }, [openSections, localStorageKeyForSections])

  useEffect(() => {
    const savedOpenSections = localStorage.getItem(localStorageKeyForSections)
    if (savedOpenSections) {
      try {
        setOpenSections(JSON.parse(savedOpenSections))
      } catch (e) {
        console.error("Failed to parse saved sidebar state", e)
        localStorage.removeItem(localStorageKeyForSections) // Clear corrupted data
      }
    }
  }, [localStorageKeyForSections])

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }))
  }

  const isActive = (itemHref: string) => {
    const fullPath = `${basePath}${itemHref === "/" ? "" : itemHref}`
    // For parent items (overview/dashboard links), allow exact match only if it's the base path.
    if (itemHref === "/") {
      return pathname === fullPath
    }
    return pathname === fullPath || pathname.startsWith(fullPath + "/")
  }

  const handleMenuItemClick = () => {
    if (isSmallScreen) {
      closeSidebar()
    }
  }

  return (
    <>
      {isOpen && isSmallScreen && (
        <div
          className="fixed inset-0 bg-opacity-50 backdrop-blur-sm z-20" // Increased z-index for overlay
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}
      <div
        ref={sidebarRef}
        className={cn(
          "bg-card flex flex-col z-50 transition-all duration-300 ease-in-out border-r border-border fixed lg:relative",
          "h-[calc(100vh-3.5rem)] left-0",
          isOpen
            ? "w-64 opacity-100 visible"
            : "w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden invisible lg:visible lg:opacity-0",
        )}
      >
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map((item) => {
            const itemFullPath = `${basePath}${item.href === "/" ? "" : item.href}`
            return (
              <div key={item.title} className="mb-2">
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleSection(item.title)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md",
                       
                        item.children.some((child) => isActive(child.href)) || isActive(item.href)
                          ? "text-foreground bg-background font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-background",
                      )}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 mr-3"><item.icon /></div>
                        <span>{item.title}</span>
                      </div>
                      {openSections[item.title] ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {openSections[item.title] && (
                      <div className="space-y-1 ml-6 mt-1">
                        {item.children.map((child) => {
                          const childFullPath = `${basePath}${child.href === "/" ? "" : child.href}`
                          return (
                            <Link
                              key={child.href}
                              href={childFullPath}
                              onClick={handleMenuItemClick}
                              className={cn(
                                "flex items-center w-full px-3 py-2 text-sm rounded-md",
                                isActive(child.href)
                                  ? "text-foreground bg-background font-medium"
                                  : "text-muted-foreground hover:text-foreground hover:bg-background",
                              )}
                            >
                              <div className="mr-3 flex-shrink-0"><child.icon /></div>
                              <span>{child.title}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={itemFullPath}
                    onClick={handleMenuItemClick}
                    className={cn(
                      "flex items-center w-full px-3 py-2 text-sm rounded-md",
                      isActive(item.href)
                        ? "text-foreground bg-background font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-background",
                    )}
                  >
                    <div className="flex-shrink-0 mr-3"><item.icon /></div>
                    <span>{item.title}</span>
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>
    </>
  )
}
