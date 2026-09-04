/**
 * Seed a rich, self-contained demo so a first-time visitor (or the "Try the
 * demo" button on the login page) lands in a fully-populated trip: an
 * organizer, an approved roster with bios, a 3-day itinerary, a shared
 * contributions board, logged expenses, beds, and trip pricing.
 *
 * Idempotent — safe to re-run. Accounts/trip upsert by their unique keys, and
 * the trip's child records (itinerary, contributions, expenses, beds) are
 * cleared and rebuilt so re-seeding never duplicates rows.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";
const INVITE_TOKEN = "demo-invite-token";
const JOIN_CODE = "TAHOE";

async function upsertUser(
  email: string,
  name: string,
  extra: Record<string, unknown> = {},
) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: { name, ...extra },
    create: { email, name, password, role: "PARTICIPANT", ...extra },
  });
}

// A weekend roughly a month out, so the demo always reads as "upcoming".
function upcomingWeekend() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 30);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 2);
  return { start, end };
}

async function main() {
  const { start, end } = upcomingWeekend();

  const organizer = await upsertUser("demo@thetriphandler.app", "Demo Organizer", {
    bio: "Spreadsheet enthusiast, reluctant trip mom.",
  });

  const trip = await prisma.trip.upsert({
    where: { inviteToken: INVITE_TOKEN },
    update: {
      ownerId: organizer.id,
      destination: "Lake Tahoe, CA",
      startDate: start,
      endDate: end,
      joinCode: JOIN_CODE,
      isApplicationOpen: true,
      housingPrice: 180,
      transportPrice: 60,
      mealsPrice: 90,
    },
    create: {
      name: "Demo Cabin Weekend",
      destination: "Lake Tahoe, CA",
      description:
        "A long-weekend cabin trip — the demo data behind The Trip Handler. Explore the roster, itinerary, meal poll, contributions, expenses, and per-person pricing.",
      inviteToken: INVITE_TOKEN,
      joinCode: JOIN_CODE,
      isApplicationOpen: true,
      ownerId: organizer.id,
      startDate: start,
      endDate: end,
      housingPrice: 180,
      transportPrice: 60,
      mealsPrice: 90,
    },
  });

  // Approved roster (plus one pending applicant to show the review state).
  const alex = await upsertUser("alex@example.com", "Alex Rivera", {
    tripId: trip.id,
    status: "APPROVED",
    gender: "female",
    bio: "Will absolutely overpack snacks.",
    sleepTags: ["early-riser", "light-sleeper"],
  });
  const jordan = await upsertUser("jordan@example.com", "Jordan Lee", {
    tripId: trip.id,
    status: "CONFIRMED_PAID",
    gender: "male",
    bio: "On aux. Non-negotiable.",
    sleepTags: ["night-owl"],
  });
  const morgan = await upsertUser("morgan@example.com", "Morgan Diaz", {
    tripId: trip.id,
    status: "APPROVED",
    gender: "nonbinary",
    bio: "Designated trail navigator and coffee snob.",
    sleepTags: ["snorer"],
  });
  await upsertUser("sam@example.com", "Sam Chen", {
    tripId: trip.id,
    status: "PENDING",
    bio: "Just applied — awaiting approval.",
  });

  // --- Rebuild trip child records idempotently (scoped to this trip) ---
  await prisma.itineraryItem.deleteMany({ where: { day: { tripId: trip.id } } });
  await prisma.day.deleteMany({ where: { tripId: trip.id } });
  await prisma.userContribution.deleteMany({
    where: { contribution: { tripId: trip.id } },
  });
  await prisma.contribution.deleteMany({ where: { tripId: trip.id } });
  await prisma.expense.deleteMany({ where: { tripId: trip.id } });
  await prisma.bed.deleteMany({ where: { tripId: trip.id } });
  await prisma.comment.deleteMany({ where: { tripId: trip.id } });
  await prisma.mealSuggestion.deleteMany({ where: { mealSlot: { tripId: trip.id } } });
  await prisma.mealVote.deleteMany({ where: { mealSlot: { tripId: trip.id } } });

  // Itinerary: three days with a few items each.
  const itinerary: {
    title: string;
    items: { time: string; title: string; location?: string }[];
  }[] = [
    {
      title: "Arrival & settle in",
      items: [
        { time: "3:00 PM", title: "Check in at the cabin", location: "Tahoe Pines" },
        { time: "5:30 PM", title: "Grocery run", location: "Safeway, Tahoe City" },
        { time: "7:30 PM", title: "Welcome dinner + game night" },
      ],
    },
    {
      title: "Lake day",
      items: [
        { time: "9:00 AM", title: "Pancakes" },
        { time: "11:00 AM", title: "Kayaks + lake hang", location: "Commons Beach" },
        { time: "6:00 PM", title: "Group cook: tacos" },
      ],
    },
    {
      title: "Hike & head home",
      items: [
        { time: "8:30 AM", title: "Sunrise hike", location: "Eagle Lake Trail" },
        { time: "11:30 AM", title: "Pack up & clean" },
        { time: "1:00 PM", title: "Depart" },
      ],
    },
  ];

  for (let d = 0; d < itinerary.length; d++) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + d);
    const day = await prisma.day.create({
      data: { tripId: trip.id, dayNumber: d + 1, date, title: itinerary[d].title },
    });
    await prisma.itineraryItem.createMany({
      data: itinerary[d].items.map((it, i) => ({
        dayId: day.id,
        time: it.time,
        title: it.title,
        location: it.location ?? null,
        orderIndex: i,
      })),
    });
  }

  // Contributions board with a couple of sign-ups.
  const firewood = await prisma.contribution.create({
    data: { tripId: trip.id, title: "Firewood + kindling", category: "Supplies" },
  });
  const coffee = await prisma.contribution.create({
    data: { tripId: trip.id, title: "Coffee + filters", category: "Food" },
  });
  await prisma.contribution.create({
    data: { tripId: trip.id, title: "Board games", category: "Fun" },
  });
  await prisma.userContribution.create({
    data: { contributionId: firewood.id, userId: jordan.id },
  });
  await prisma.userContribution.create({
    data: {
      contributionId: coffee.id,
      userId: morgan.id,
      notes: "Bringing a French press too.",
    },
  });

  // Logged shared expenses.
  await prisma.expense.createMany({
    data: [
      { tripId: trip.id, submittedBy: organizer.id, title: "Costco grocery run", amount: 214.5, category: "Food", approved: true },
      { tripId: trip.id, submittedBy: jordan.id, title: "Gas — van", amount: 92.0, category: "Transport", approved: true },
      { tripId: trip.id, submittedBy: alex.id, title: "Firewood bundle", amount: 35.0, category: "Supplies", approved: false },
    ],
  });

  // Beds, with two of them already claimed. An empty grid doesn't show what
  // the page is for; a partly-full one does.
  const beds = await Promise.all(
    [
      { label: "Queen", room: "Loft", type: "DOUBLE" as const },
      { label: "Bunk — top", room: "Bunk room", type: "SINGLE" as const },
      { label: "Bunk — bottom", room: "Bunk room", type: "SINGLE" as const },
      { label: "Pull-out", room: "Living room", type: "DOUBLE" as const, womenOnly: true },
    ].map((bed) => prisma.bed.create({ data: { tripId: trip.id, ...bed } })),
  );
  await prisma.bedAssignment.deleteMany({
    where: { userId: { in: [jordan.id, morgan.id] } },
  });
  await prisma.bedAssignment.create({ data: { bedId: beds[0].id, userId: jordan.id } });
  await prisma.bedAssignment.create({ data: { bedId: beds[1].id, userId: morgan.id } });

  // A board with real traffic on it, including reactions.
  const boardPosts: { author: string; body: string; reactions: [string, string][] }[] = [
    {
      author: organizer.id,
      body: "Cabin is confirmed! Check-in is 3pm Friday. Anyone who can get there early to grab firewood, shout.",
      reactions: [[alex.id, "🔥"], [jordan.id, "👍"], [morgan.id, "👍"]],
    },
    {
      author: jordan.id,
      body: "Taking the van, leaving the city around noon Friday. Three seats free — first come.",
      reactions: [[alex.id, "👍"], [morgan.id, "❤️"]],
    },
    {
      author: morgan.id,
      body: "Trail near the cabin is a 4 mile loop with a lake at the halfway point. Saturday morning, whoever's up.",
      reactions: [[organizer.id, "💯"], [alex.id, "❤️"]],
    },
    {
      author: alex.id,
      body: "Reminder that I am bringing an unreasonable quantity of snacks and I will not be taking questions.",
      reactions: [[jordan.id, "😂"], [morgan.id, "😂"], [organizer.id, "😂"]],
    },
  ];
  // Backdated so the timestamps read like a conversation rather than a bulk import.
  let minutesAgo = 60 * 26;
  for (const post of boardPosts) {
    const createdAt = new Date(Date.now() - minutesAgo * 60_000);
    minutesAgo -= 60 * 6;
    const comment = await prisma.comment.create({
      data: { tripId: trip.id, userId: post.author, body: post.body, createdAt },
    });
    for (const [userId, emoji] of post.reactions) {
      await prisma.reaction.create({ data: { commentId: comment.id, userId, emoji } });
    }
  }

  // The meal poll, mid-vote: ideas on the board and votes already cast, which
  // is the state that actually shows what the page does.
  await prisma.mealPlanPhase.upsert({
    where: { tripId: trip.id },
    update: { currentPhase: "voting_open", votingOpenedAt: new Date() },
    create: {
      tripId: trip.id,
      currentPhase: "voting_open",
      suggestionsOpenedAt: new Date(),
      votingOpenedAt: new Date(),
    },
  });

  const mealIdeas: {
    dayName: string;
    mealType: string;
    ideas: { name: string; by: string; tags: string[]; help: string[]; votes: string[] }[];
  }[] = [
    {
      dayName: "Friday",
      mealType: "Dinner",
      ideas: [
        { name: "Chili + cornbread", by: organizer.id, tags: ["vegetarian-option"], help: ["cook"], votes: [alex.id, jordan.id] },
        { name: "Sheet-pan fajitas", by: morgan.id, tags: ["gluten-free"], help: ["prep", "clean"], votes: [morgan.id] },
      ],
    },
    {
      dayName: "Saturday",
      mealType: "Breakfast",
      ideas: [
        { name: "Big pancake situation", by: alex.id, tags: [], help: ["cook", "shop"], votes: [alex.id, morgan.id, organizer.id] },
        { name: "Breakfast burritos", by: jordan.id, tags: ["gluten-free"], help: ["cook"], votes: [jordan.id] },
      ],
    },
    {
      dayName: "Saturday",
      mealType: "Dinner",
      ideas: [
        { name: "Pasta night", by: jordan.id, tags: ["vegetarian-option"], help: ["cook", "clean"], votes: [jordan.id, organizer.id] },
        { name: "Grill whatever's left", by: organizer.id, tags: [], help: ["cook"], votes: [alex.id] },
      ],
    },
  ];

  for (const { dayName, mealType, ideas } of mealIdeas) {
    // The meal pages create slots on first view; seeding them here means the
    // demo is populated before anyone opens the page.
    const slot = await prisma.mealSlot.upsert({
      where: { tripId_dayName_mealType: { tripId: trip.id, dayName, mealType } },
      update: {},
      create: {
        tripId: trip.id,
        dayName,
        mealType,
        orderIndex: mealIdeas.findIndex((m) => m.dayName === dayName && m.mealType === mealType),
      },
    });

    for (const idea of ideas) {
      const suggestion = await prisma.mealSuggestion.create({
        data: {
          mealSlotId: slot.id,
          mealName: idea.name,
          submittedByUserId: idea.by,
          dietaryTags: idea.tags,
          helpOffered: idea.help,
        },
      });
      for (const voter of idea.votes) {
        // One vote per member per slot, so a later idea silently wins a
        // duplicate rather than blowing up the seed.
        await prisma.mealVote.upsert({
          where: { userId_mealSlotId: { userId: voter, mealSlotId: slot.id } },
          update: { suggestionId: suggestion.id, isDontCare: false },
          create: { userId: voter, mealSlotId: slot.id, suggestionId: suggestion.id },
        });
      }
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  console.log("Demo data ready.");
  console.log(`  Organizer login:  demo@thetriphandler.app / ${DEMO_PASSWORD}`);
  console.log(`  Member login:     alex@example.com / ${DEMO_PASSWORD}`);
  console.log(`  Join code:        ${JOIN_CODE}`);
  console.log(`  Invite link:      ${appUrl}/join/${INVITE_TOKEN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
