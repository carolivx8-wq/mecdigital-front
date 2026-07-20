import { BrandHeader } from "@/components/BrandHeader";
import { PublicLookup } from "@/components/PublicLookup";

export const metadata = {
  title: "Registro compartilhado | MecDigital",
  robots: { index: false, follow: false, noarchive: true }
};

export default function SharedRecordPage() {
  return (
    <>
      <BrandHeader />
      <PublicLookup direct />
    </>
  );
}
