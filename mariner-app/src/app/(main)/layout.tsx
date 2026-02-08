import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { UIProvider } from "@/context/UIContext";
import { UploadModal } from "@/components/UploadModal";

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <UIProvider>
            <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
                <Sidebar className="hidden md:flex" />

                <div className="flex flex-1 flex-col overflow-hidden">
                    <Header />

                    <main className="flex-1 overflow-y-auto p-4 md:p-8">
                        {children}
                    </main>
                </div>

                <UploadModal />
            </div>
        </UIProvider>
    );
}
