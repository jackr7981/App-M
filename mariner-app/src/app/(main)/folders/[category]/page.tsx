import { FolderView } from "./FolderView";

export async function generateStaticParams() {
    return [
        { category: "certificates" },
        { category: "cdc" },
        { category: "passport" },
        { category: "medical" },
        { category: "training" },
        { category: "service" },
    ];
}

export default async function FolderPage({ params }: { params: Promise<{ category: string }> }) {
    const { category } = await params;
    return <FolderView category={category} />;
}
