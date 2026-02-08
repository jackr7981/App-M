import { VesselView } from "./VesselView";

export async function generateStaticParams() {
    return [
        { id: "9876543" },
        { id: "1234567" },
        { id: "5558888" },
        { id: "9990001" },
    ];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <VesselView id={id} />;
}
