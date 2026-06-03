import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { AvatarUpload } from "@/components/AvatarUpload";
import { SignOutButton } from "@/components/SignOutButton";
import { PageNote } from "@/components/PageNote";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId || userId === "admin") redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto">
      <PageNote pageKey="profile" />
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Profile</p>
        <h1 className="font-serif text-3xl font-medium text-stone-900">Your profile</h1>
        <p className="text-stone-600 mt-2 text-sm">
          This is what other campers see on the roster. Update anytime.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-6 md:p-8 space-y-8">
        <div className="flex justify-center">
          <AvatarUpload userId={user.id} currentUrl={user.avatarUrl} name={user.name} />
        </div>
        <div className="border-t border-stone-200 pt-8">
          <ProfileForm
            userId={user.id}
            email={user.email}
            defaults={{
              name: user.name,
              username: user.username ?? "",
              phone: user.phone ?? "",
              bio: user.bio ?? "",
              gender: user.gender ?? "",
              sleepTags: user.sleepTags ?? [],
              sleepNote: user.sleepNote ?? "",
            }}
          />
        </div>
      </div>

      <div className="mt-8 bg-white border border-stone-200 rounded-xl p-6 md:p-8">
        <h2 className="font-serif text-lg font-medium text-stone-900">Sign out</h2>
        <p className="text-stone-600 text-sm mt-1">
          End your session on this device. You can sign back in anytime.
        </p>
        <div className="mt-4">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
