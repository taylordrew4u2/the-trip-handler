import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
    return (
      <div className="grid grid-cols-3 gap-4 py-2">
        <div className="text-xs uppercase tracking-wide text-stone-500 col-span-1">{label}</div>
        <div className="col-span-2 text-stone-400 text-sm italic">—</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-4 py-2">
      <div className="text-xs uppercase tracking-wide text-stone-500 col-span-1">{label}</div>
      <div className="col-span-2 text-stone-900 text-sm whitespace-pre-wrap">
        {Array.isArray(value) ? value.join(", ") : value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-stone-200 p-5">
      <h2 className="font-serif text-lg font-medium text-stone-900 mb-3">{title}</h2>
      <div className="divide-y divide-stone-100">{children}</div>
    </section>
  );
}

export default async function AdminIntakeDetail({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { guestForm: true },
  });
  if (!user || !user.guestForm) notFound();
  const f = user.guestForm;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/admin/intake" className="text-sm text-stone-500 hover:text-stone-900">
          ← All guest forms
        </Link>
        <h1 className="font-serif text-3xl font-medium text-stone-900 mt-2">{user.name}</h1>
        <p className="text-stone-500 text-sm">
          {user.email} · last updated {new Date(f.updatedAt).toLocaleString()}
        </p>
      </div>

      <Section title="Basic info">
        <Row label="Full name" value={f.fullName} />
        <Row label="Stage name" value={f.stageName} />
        <Row label="Phone" value={f.phoneNumber} />
        <Row label="Pronouns" value={f.pronouns} />
        <Row label="21+" value={f.age21Confirmed ? "Confirmed" : "Not confirmed"} />
        <Row label="Emergency contact" value={`${f.emergencyName ?? ""} · ${f.emergencyPhone ?? ""}`} />
        <Row label="Substance-free ack" value={f.substanceFreeAck ? "Agreed" : "NOT AGREED"} />
      </Section>

      <Section title="Van transportation">
        <Row label="Coming from" value={f.comingFrom} />
        <Row label="Central pickup" value={f.centralPickup} />
        <Row label="Preferred area" value={[f.preferredArea, f.preferredAreaOther].filter(Boolean).join(" — ")} />
        <Row label="Ready Day 1" value={f.readyTimeDay1} />
        <Row label="Back by Day 3" value={f.returnByDay3} />
        <Row label="Carsick" value={f.carsick} />
        <Row label="Needs front seat" value={f.needsFrontSeat} />
        <Row label="Luggage" value={f.luggageSize} />
        <Row label="Bulky items" value={f.bulkyItems} />
        <Row label="Willing to drive" value={f.willingToDrive} />
        <Row label="Acknowledged" value={f.vanAck ? "Yes" : "No"} />
      </Section>

      <Section title="Sleeping">
        <Row label="Share room" value={f.shareRoom} />
        <Row label="Share bed" value={f.shareBed} />
        <Row label="Need own bed" value={f.needOwnBed} />
        <Row label="Bringing" value={f.bringingItems} />
        <Row label="Sleep notes" value={f.sleepNotes} />
      </Section>

      <Section title="Food / allergies">
        <Row label="Has allergies" value={f.hasAllergies} />
        <Row label="Allergies" value={f.allergiesList} />
        <Row label="Severity" value={f.allergySeverity} />
        <Row label="Dietary" value={[...(f.dietaryRestrictions ?? []), f.dietaryOther].filter(Boolean) as string[]} />
        <Row label="Won't eat" value={f.willNotEat} />
        <Row label="Likes" value={f.likedFoods} />
        <Row label="Snacks" value={f.snackRequests} />
        <Row label="Drinks" value={[...(f.drinkPrefs ?? []), f.drinkOther].filter(Boolean) as string[]} />
        <Row label="Communal meals" value={f.communalMeals} />
        <Row label="Help cook/clean" value={f.helpCookClean} />
      </Section>

      <Section title="Medical / safety">
        <Row label="Conditions" value={f.medicalConditions} />
        <Row label="Refrigerated meds" value={f.refrigeratedMeds} />
        <Row label="EpiPen / inhaler" value={f.emergencyMedItem} />
        <Row label="Mobility" value={f.mobilityNeeds} />
        <Row label="Cannot do" value={f.cannotDo} />
        <Row label="Safety notes" value={f.safetyNotes} />
      </Section>

      <Section title="Comedy / workshop">
        <Row label="Working on" value={[...(f.workOnGoals ?? []), f.workOnOther].filter(Boolean) as string[]} />
        <Row label="Material amount" value={f.materialAmount} />
        <Row label="Performing" value={f.comfortPerforming} />
        <Row label="Receiving feedback" value={f.comfortReceivingFb} />
        <Row label="Giving feedback" value={f.comfortGivingFb} />
        <Row label="Don't want feedback on" value={f.feedbackOptOut} />
        <Row label="Useful feedback" value={f.usefulFeedback} />
      </Section>

      <Section title="Content / social media">
        <Row label="Instagram" value={f.instagram} />
        <Row label="TikTok" value={f.tiktok} />
        <Row label="Other handles" value={f.otherHandles} />
        <Row label="Group photos" value={f.comfortGroupPhotos} />
        <Row label="Group videos" value={f.comfortGroupVideos} />
        <Row label="Tagged" value={f.comfortTagged} />
        <Row label="Planned content" value={f.comfortPlannedContent} />
        <Row label="Comfort level" value={f.contentComfort} />
        <Row label="Opt-out content" value={f.contentOptOut} />
        <Row label="Approve clips" value={f.approveClipsBeforePost} />
        <Row label="Acks" value={f.contentAcks} />
      </Section>

      <Section title="Joke / material protection">
        <Row label="Acks" value={f.jokeProtectionAcks} />
      </Section>

      <Section title="Group activities">
        <Row label="Interested in" value={[...(f.activitiesInterested ?? []), f.activitiesOtherText].filter(Boolean) as string[]} />
        <Row label="Opt-out" value={f.activitiesOptOut} />
        <Row label="Structure" value={f.structurePref} />
      </Section>

      <Section title="Payment">
        <Row label="Method" value={[f.paymentMethod, f.paymentMethodOther].filter(Boolean).join(" — ")} />
        <Row label="Username" value={f.paymentUsername} />
        <Row label="Acks" value={f.paymentAcks} />
      </Section>

      <Section title="House rules">
        <Row label="Acks" value={f.houseRulesAcks} />
      </Section>

      <Section title="Final notes">
        <Row label="Anything else" value={f.finalNotes} />
        <Row label="What would make this fun" value={f.whatWouldMakeFun} />
      </Section>
    </div>
  );
}
