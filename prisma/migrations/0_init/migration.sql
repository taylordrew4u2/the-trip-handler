-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'APPROVED', 'CONFIRMED_PAID', 'PENDING_PAYMENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateEnum
CREATE TYPE "BedmateRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "role" "Role" NOT NULL DEFAULT 'PARTICIPANT',
    "rejectedTripId" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "sleepTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sleepNote" TEXT,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tripId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled Trip',
    "ownerId" TEXT,
    "inviteToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isApplicationOpen" BOOLEAN NOT NULL DEFAULT true,
    "destination" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "itinerary" TEXT,
    "lodging" TEXT,
    "meals" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" TIMESTAMP(3),
    "finalPrice" DOUBLE PRECISION,
    "housingPrice" DOUBLE PRECISION,
    "housingLocked" BOOLEAN NOT NULL DEFAULT false,
    "transportPrice" DOUBLE PRECISION,
    "transportLocked" BOOLEAN NOT NULL DEFAULT false,
    "mealsPrice" DOUBLE PRECISION,
    "mealsLocked" BOOLEAN NOT NULL DEFAULT false,
    "totalExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealSlot" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayName" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmedSuggestionId" TEXT,
    "adminOverrideNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealSuggestion" (
    "id" TEXT NOT NULL,
    "mealSlotId" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "helpOffered" TEXT[],
    "dietaryTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealSlotId" TEXT NOT NULL,
    "suggestionId" TEXT,
    "isDontCare" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealHelper" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealSlotId" TEXT NOT NULL,
    "helpType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealHelper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryItem" (
    "id" TEXT NOT NULL,
    "mealSlotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" TEXT,
    "bought" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanPhase" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "currentPhase" TEXT NOT NULL DEFAULT 'suggestions_open',
    "suggestionsOpenedAt" TIMESTAMP(3),
    "votingOpenedAt" TIMESTAMP(3),
    "votingClosedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "MealPlanPhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "submittedBy" TEXT,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "stripeSessionId" TEXT,
    "stripePaymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Day" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "title" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryItem" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItineraryComment" (
    "id" TEXT NOT NULL,
    "itineraryItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItineraryComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LodgingPhoto" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LodgingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "room" TEXT,
    "type" "BedType" NOT NULL DEFAULT 'DOUBLE',
    "womenOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BedAssignment" (
    "id" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BedAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BedmateRequest" (
    "id" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "BedmateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BedmateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageNote" (
    "pageKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageNote_pkey" PRIMARY KEY ("pageKey")
);

-- CreateTable
CREATE TABLE "GuestForm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "editRequested" BOOLEAN NOT NULL DEFAULT false,
    "preferencesSubmittedAt" TIMESTAMP(3),
    "fullName" TEXT NOT NULL,
    "stageName" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "pronouns" TEXT,
    "age21Confirmed" BOOLEAN NOT NULL DEFAULT false,
    "emergencyName" TEXT,
    "emergencyPhone" TEXT,
    "substanceFreeAck" BOOLEAN NOT NULL DEFAULT false,
    "comingFrom" TEXT,
    "centralPickup" TEXT,
    "preferredArea" TEXT,
    "preferredAreaOther" TEXT,
    "readyTimeDay1" TEXT,
    "returnByDay3" TEXT,
    "carsick" TEXT,
    "needsFrontSeat" TEXT,
    "luggageSize" TEXT,
    "bulkyItems" TEXT,
    "willingToDrive" TEXT,
    "vanAck" BOOLEAN NOT NULL DEFAULT false,
    "shareRoom" TEXT,
    "shareBed" TEXT,
    "needOwnBed" TEXT,
    "bringingItems" TEXT[],
    "sleepNotes" TEXT,
    "hasAllergies" TEXT,
    "allergiesList" TEXT,
    "allergySeverity" TEXT,
    "dietaryRestrictions" TEXT[],
    "dietaryOther" TEXT,
    "willNotEat" TEXT,
    "likedFoods" TEXT,
    "snackRequests" TEXT,
    "drinkPrefs" TEXT[],
    "drinkOther" TEXT,
    "communalMeals" TEXT,
    "helpCookClean" TEXT,
    "medicalConditions" TEXT,
    "refrigeratedMeds" TEXT,
    "emergencyMedItem" TEXT,
    "mobilityNeeds" TEXT,
    "cannotDo" TEXT,
    "safetyNotes" TEXT,
    "workOnGoals" TEXT[],
    "workOnOther" TEXT,
    "materialAmount" TEXT,
    "comfortPerforming" TEXT,
    "comfortReceivingFb" TEXT,
    "comfortGivingFb" TEXT,
    "feedbackOptOut" TEXT,
    "usefulFeedback" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "otherHandles" TEXT,
    "comfortGroupPhotos" TEXT,
    "comfortGroupVideos" TEXT,
    "comfortTagged" TEXT,
    "comfortPlannedContent" TEXT,
    "contentComfort" TEXT,
    "contentOptOut" TEXT,
    "approveClipsBeforePost" TEXT,
    "contentAcks" TEXT[],
    "jokeProtectionAcks" TEXT[],
    "activitiesInterested" TEXT[],
    "activitiesOtherText" TEXT,
    "activitiesOptOut" TEXT,
    "structurePref" TEXT,
    "maxBudget" TEXT,
    "paymentMethod" TEXT,
    "paymentMethodOther" TEXT,
    "paymentUsername" TEXT,
    "paymentAcks" TEXT[],
    "securityDepositAcks" TEXT[],
    "houseRulesAcks" TEXT[],
    "finalNotes" TEXT,
    "whatWouldMakeFun" TEXT,

    CONSTRAINT "GuestForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_inviteToken_key" ON "Trip"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "MealSlot_tripId_dayName_mealType_key" ON "MealSlot"("tripId", "dayName", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "MealVote_userId_mealSlotId_key" ON "MealVote"("userId", "mealSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanPhase_tripId_key" ON "MealPlanPhase"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "UserContribution_userId_contributionId_key" ON "UserContribution"("userId", "contributionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeSessionId_key" ON "Payment"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Day_tripId_dayNumber_key" ON "Day"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "ItineraryItem_dayId_orderIndex_idx" ON "ItineraryItem"("dayId", "orderIndex");

-- CreateIndex
CREATE INDEX "ItineraryComment_itineraryItemId_createdAt_idx" ON "ItineraryComment"("itineraryItemId", "createdAt");

-- CreateIndex
CREATE INDEX "LodgingPhoto_tripId_position_idx" ON "LodgingPhoto"("tripId", "position");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Reaction_commentId_idx" ON "Reaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_commentId_userId_emoji_key" ON "Reaction"("commentId", "userId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "BedAssignment_userId_key" ON "BedAssignment"("userId");

-- CreateIndex
CREATE INDEX "BedmateRequest_toUserId_status_idx" ON "BedmateRequest"("toUserId", "status");

-- CreateIndex
CREATE INDEX "BedmateRequest_fromUserId_status_idx" ON "BedmateRequest"("fromUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BedmateRequest_bedId_fromUserId_toUserId_key" ON "BedmateRequest"("bedId", "fromUserId", "toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestForm_userId_key" ON "GuestForm"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSlot" ADD CONSTRAINT "MealSlot_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSuggestion" ADD CONSTRAINT "MealSuggestion_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSuggestion" ADD CONSTRAINT "MealSuggestion_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealVote" ADD CONSTRAINT "MealVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealVote" ADD CONSTRAINT "MealVote_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealVote" ADD CONSTRAINT "MealVote_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "MealSuggestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealHelper" ADD CONSTRAINT "MealHelper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealHelper" ADD CONSTRAINT "MealHelper_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryItem" ADD CONSTRAINT "GroceryItem_mealSlotId_fkey" FOREIGN KEY ("mealSlotId") REFERENCES "MealSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanPhase" ADD CONSTRAINT "MealPlanPhase_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContribution" ADD CONSTRAINT "UserContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContribution" ADD CONSTRAINT "UserContribution_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Day" ADD CONSTRAINT "Day_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryItem" ADD CONSTRAINT "ItineraryItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "Day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryComment" ADD CONSTRAINT "ItineraryComment_itineraryItemId_fkey" FOREIGN KEY ("itineraryItemId") REFERENCES "ItineraryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItineraryComment" ADD CONSTRAINT "ItineraryComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LodgingPhoto" ADD CONSTRAINT "LodgingPhoto_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedAssignment" ADD CONSTRAINT "BedAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedmateRequest" ADD CONSTRAINT "BedmateRequest_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedmateRequest" ADD CONSTRAINT "BedmateRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BedmateRequest" ADD CONSTRAINT "BedmateRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestForm" ADD CONSTRAINT "GuestForm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

