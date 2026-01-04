"use client"

import { useState, useRef, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from '@/components/ui/button';

interface DatePickerProps {
  label: string
  value: Date | null
  onChange: (date: Date | null) => void
  required?: boolean
  minDate?: Date | null
  maxDate?: Date | null
  allowFutureDates?: boolean
}

export function DatePicker({ label, value, onChange, required = false, minDate = null, maxDate = null, allowFutureDates = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [openUpward, setOpenUpward] = useState(false)
  const [openDirection, setOpenDirection] = useState<'left' | 'right' | 'center'>('center')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Check available space when opening
    const checkPosition = () => {
      if (buttonRef.current && isOpen) {
        const buttonRect = buttonRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const spaceBelow = viewportHeight - buttonRect.bottom
        const calendarHeight = 400 // Approximate height of calendar
        const calendarWidth = 288 // w-72 = 288px
        
        // Check vertical position
        setOpenUpward(spaceBelow < calendarHeight && buttonRect.top > calendarHeight)
        
        // Check horizontal position
        const buttonCenter = buttonRect.left + buttonRect.width / 2
        const calendarHalfWidth = calendarWidth / 2
        const spaceLeft = buttonCenter - calendarHalfWidth
        const spaceRight = viewportWidth - (buttonCenter + calendarHalfWidth)
        
        if (spaceLeft < 16) { // 16px margin from edge
          setOpenDirection('left')
        } else if (spaceRight < 16) {
          setOpenDirection('right')
        } else {
          setOpenDirection('center')
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      checkPosition()
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev)
      if (direction === "prev") {
        newMonth.setMonth(prev.getMonth() - 1)
      } else {
        newMonth.setMonth(prev.getMonth() + 1)
      }
      return newMonth
    })
  }

  const selectDate = (date: Date) => {
    if (isDateDisabled(date)) {
      return
    }

    onChange(date)
    setIsOpen(false)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return value && date.toDateString() === value.toDateString()
  }

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    // Check if future dates are not allowed
    if (!allowFutureDates && date > today) {
      return true
    }
    
    // Check minDate constraint
    if (minDate) {
      const min = new Date(minDate)
      min.setHours(0, 0, 0, 0)
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      if (checkDate < min) {
        return true
      }
    }
    
    // Check maxDate constraint
    if (maxDate) {
      const max = new Date(maxDate)
      max.setHours(23, 59, 59, 999)
      if (date > max) {
        return true
      }
    }
    
    return false
  }

  const clearDate = () => {
    onChange(null)
    setIsOpen(false)
  }

  const days = getDaysInMonth(currentMonth)
  const monthYear = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })

  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="block text-sm font-medium text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          className="w-full text-left flex items-center justify-between focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value ? formatDate(value) : "Select date"}
          </span>
          <Calendar className="w-4 h-4 shrink-0" />
        </Button>

        {isOpen && (
          <div className={`absolute bg-card border border-border rounded-lg shadow-lg z-50 p-3 w-72 max-w-[90vw] min-w-70 ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          } ${
            openDirection === 'left' ? 'left-0' : 
            openDirection === 'right' ? 'right-0' : 
            'left-1/2 transform -translate-x-1/2'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <Button
                type="button"
                onClick={() => navigateMonth("prev")}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-sm">{monthYear}</span>
              <Button
                type="button"
                onClick={() => navigateMonth("next")}
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground p-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => (
                <div key={index} className="aspect-square">
                  {day && (
                    <Button
                      type="button"
                      onClick={() => selectDate(day)}
                      disabled={isDateDisabled(day)}
                      variant="ghost"
                      size="sm"
                      className={`w-full h-full rounded text-sm transition-colors flex items-center justify-center p-0 ${
                        isDateDisabled(day)
                          ? "text-muted-foreground/50"
                          : isSelected(day)
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : isToday(day)
                              ? "bg-accent text-accent-foreground font-semibold"
                              : ""
                      }`}
                    >
                      {day.getDate()}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div className="mt-4 flex items-center justify-end">
              <Button
                type="button"
                onClick={clearDate}
                variant="outline"
                size="sm"
              >
                Clear date
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
