import { StoreProvider } from "@/components/providers/StoreProvider";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
