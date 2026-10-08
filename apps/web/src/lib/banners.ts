export type BannerPlacement = "ECOMMERCE" | "INSTITUTIONAL";

export type StoreBanner = {
  id: string;
  placement?: BannerPlacement;
  title: string;
  subtitle?: string | null;
  actionLabel: string;
  href: string;
  alt: string;
  imageUrl: string;
  mobileImageUrl?: string | null;
  position: number;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
};

export function validBannerDestination(href: string, placement: BannerPlacement): boolean {
  if (!/^\/(?!\/)[^\\\s]*$/.test(href) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(href)) return false;
  const path = new URL(href, "https://districo.invalid").pathname;
  return placement === "INSTITUTIONAL" || /^\/tienda(?:$|\/)/.test(path);
}
