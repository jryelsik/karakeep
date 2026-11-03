import { redirect } from "next/navigation";
import GlobalActions from "@/components/dashboard/GlobalActions";
import HeaderLogoSection from "@/components/dashboard/header/HeaderLogoSection";
import ProfileOptions from "@/components/dashboard/header/ProfileOptions";
import { SearchInput } from "@/components/dashboard/search/SearchInput";
import { getServerAuthSession } from "@/server/auth";

export default async function Header() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/");
  }

  return (
    <header className="sticky left-0 right-0 top-0 z-50 flex h-16 w-full items-center justify-between overflow-x-auto overflow-y-hidden bg-background p-4">
      <HeaderLogoSection />
      <div className="flex flex-1 gap-2">
        <SearchInput className="rounded-md bg-muted" />
        <GlobalActions />
      </div>
      <div className="flex items-center">
        <ProfileOptions />
      </div>
    </header>
  );
}
