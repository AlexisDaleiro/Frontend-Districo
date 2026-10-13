import { AccountFrame } from "@/components/account-frame";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountFrame>{children}</AccountFrame>;
}
