import type { Metadata } from "next";
import { Calculators } from "@/components/Calculators";
import { PageTitle } from "@/components/PageParts";

export const metadata: Metadata = { title: "Calculators" };

export default function CalculatorsPage() {
  return (
    <>
      <PageTitle title="Pricing calculators">Room price difference, city tax and wallet discount, from the supplied workbook.</PageTitle>
      <Calculators />
    </>
  );
}
