"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from "@vybx/ui";
import { clearSession, getUser, displayName } from "@/lib/auth";
import { api } from "@/lib/api";
import type { NotificationsResponse } from "@/lib/types";

interface HeaderProps {
  onMenuClick?: () => void;
  breadcrumb?: React.ReactNode;
}

export function Header({ onMenuClick, breadcrumb }: HeaderProps) {
  const router = useRouter();
  const user = getUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api
      .get<NotificationsResponse>("/promoter/notifications")
      .then((res) => setUnreadCount(res.unreadCount))
      .catch(() => {});
  }, []);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  const name = displayName(user);
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-sm"
      style={{ height: "var(--header-height)" }}
    >
      <button
        onClick={onMenuClick}
        className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1 min-w-0">{breadcrumb}</div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent transition-colors">
              <Avatar className="size-7">
                {user?.profileImageUrl && (
                  <AvatarImage src={user.profileImageUrl} alt={name} />
                )}
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                {name}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon className="size-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
