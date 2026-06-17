"use client";
import React, { createContext, useContext, useState } from "react";
const Ctx = createContext({ active: "", set: (_: string) => {} });
export function Tabs({ value, onValueChange, children, className = "" }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return <Ctx.Provider value={{ active: value, set: onValueChange }}><div className={className}>{children}</div></Ctx.Provider>;
}
export function TabsList({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex gap-1 p-1 rounded-lg bg-gray-100 ${className}`}>{children}</div>;
}
export function TabsTrigger({ value, children, className = "" }: { value: string; children: React.ReactNode; className?: string }) {
  const { active, set } = useContext(Ctx);
  const isActive = active === value;
  return (
    <button
      onClick={() => set(value)}
      className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"} ${className}`}
    >
      {children}
    </button>
  );
}
export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const { active } = useContext(Ctx);
  return active === value ? <div>{children}</div> : null;
}
